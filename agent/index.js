const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const WebSocket = require('ws');
const { z } = require('zod');
const crypto = require('crypto');
const config = require('./src/config');

const { PolicyEngine } = require('./src/policy/engine');
const TrustManager = require('./src/policy/trust');
const IntentRegistry = require('./src/policy/registry');
const livekitService = require('./src/services/livekit');
const sttService = require('./src/services/stt');
const ttsService = require('./src/services/tts');
const intelligenceService = require('./src/services/intelligence');
const executor = require('./src/executor');
const memoryService = require('./src/services/memory');
const stateManager = require('./src/services/state');
const Canonicalizer = require('./src/policy/canonicalizer');
const Redactor = require('./src/utils/redactor');

const redactor = new Redactor(config.PRIVACY_MODE);
const auditLogger = require('./src/utils/audit-logger');

class StepCache {
  constructor() {
    this.cache = new Map();
  }

  get(sessionId, fingerprint) {
    if (!this.cache.has(sessionId)) return null;
    return this.cache.get(sessionId)[fingerprint];
  }

  set(sessionId, fingerprint, result) {
    if (!this.cache.has(sessionId)) {
      this.cache.set(sessionId, {});
    }
    this.cache.get(sessionId)[fingerprint] = result;
  }
}

const stepCache = new StepCache();

fastify.get('/', async () => {
  return {
    status: 'ok',
    service: 'Kirtos',
    version: '2.1.0',
    fingerprint: IntentRegistry.getFingerprint(),
    privacy_mode: redactor.mode
  };
});

fastify.register(cors, {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST']
});

let wss;

fastify.ready(() => {
  wss = new WebSocket.Server({ server: fastify.server, path: '/ws' });

  wss.on('connection', (socket, req) => {
    console.log(`Client connected from ${req.socket.remoteAddress}`);

    socket.on('message', async (message) => {
      try {
        let rawData = JSON.parse(message.toString());


        const { data: canonicalData, transformations } = Canonicalizer.canonicalizeWithTrace(rawData);
        const parsingResult = InputSchema.safeParse(canonicalData);

        if (!parsingResult.success) {
          socket.send(JSON.stringify({ status: 'error', error: `Invalid input format: ${parsingResult.error.message}` }));
          return;
        }

        const { data } = parsingResult;

        if (data.type === 'natural-language') {
          fastify.log.info({ text: data.text, transformations }, 'Processing natural language');


          const history = memoryService.get(data.session_id);
          const currentState = stateManager.get(data.session_id);
          const result = await intelligenceService.parseIntent(data.text, history, currentState);
          const plan = result.plan;

          await memoryService.add(data.session_id, { role: 'user', content: data.text });


          const batchDecision = PolicyEngine.evaluatePlan(plan, data.session_id, data.client_id);


          const auditTrace = {
            trace_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            timestamp: new Date().toISOString(),
            session_id: data.session_id,
            client_id: data.client_id,
            privacy_mode: redactor.mode,
            capability_fingerprint: batchDecision.capability_fingerprint,
            type: 'natural-language',

            input: {
              hash: crypto.createHash('sha256').update(data.text).digest('hex'),
              transformations: transformations
            },
            resolved_plan: plan.map((s) => ({
              intent: s.intent,
              params: redactor.redact(s.intent, s.params)
            })),

            policy_decisions: batchDecision.decisions.map((d) => ({
              intent: d.intent,
              allowed: d.allowed,
              risk: d.risk,
              guard_findings: d.guard_findings,
              explanation: d.explanation
            })),

            execution_results: []
          };

          const decisionLog = `[Decision] Intent: ${batchDecision.decisions.map((d) => d.intent).join(', ')} | Source: ${result.source} | Reasoning: "${result.reasoning}"`;
          console.log(decisionLog);

          if (!batchDecision.allowed) {
            const denialMessage = batchDecision.explanation || `Action denied: ${batchDecision.reason}`;
            auditTrace.denied = true;
            auditTrace.reason = batchDecision.reason;
            auditLogger.log(auditTrace);

            socket.send(JSON.stringify({
              session_id: data.session_id,
              status: 'denied',
              error: batchDecision.reason,
              message: denialMessage,
              capability_fingerprint: batchDecision.capability_fingerprint
            }));
            await ttsService.speak(denialMessage);
            return;
          }

          if (batchDecision.requires_confirmation) {
            socket.send(JSON.stringify({
              session_id: data.session_id,
              status: 'confirmation_required',
              message: result.reasoning || "I need your approval to proceed with this plan.",
              plan: batchDecision.decisions,
              capability_fingerprint: batchDecision.capability_fingerprint,
              original_text: data.text
            }));
            await ttsService.speak(result.reasoning);
            return;
          }


          let finalSummary = result.reasoning;
          let lastResult = null;

          for (const stepDecision of batchDecision.decisions) {

            const fingerprint = crypto.createHash('sha256').
            update(JSON.stringify({ intent: stepDecision.intent, params: stepDecision.params })).
            digest('hex');

            const cachedResult = stepCache.get(data.session_id, fingerprint);
            if (cachedResult && cachedResult.status === 'success') {
              fastify.log.info({ intent: stepDecision.intent, fingerprint }, 'Idempotent step skipped (cache hit)');
              lastResult = cachedResult;
              auditTrace.execution_results.push({
                intent: stepDecision.intent,
                status: 'skipped_cache',
                duration: 0
              });
              continue;
            }


            const decision = PolicyEngine.evaluate(stepDecision, data.session_id, data.client_id, { plan });
            if (!decision.allowed) {
              auditTrace.execution_results.push({ intent: stepDecision.intent, status: 'denied', reason: 'Mid-plan policy change' });
              break;
            }

            try {

              lastResult = await executor.execute(decision.runtime, stepDecision.intent, decision.params, {
                role: 'admin',
                session_id: data.session_id,
                client_id: data.client_id,
                trace_id: auditTrace.trace_id
              });


              if (lastResult.status === 'success') {
                stepCache.set(data.session_id, fingerprint, lastResult);
              }

              auditTrace.execution_results.push({
                intent: stepDecision.intent,
                status: lastResult.status,
                result_redacted: lastResult.data || lastResult.result ? redactor.redact(stepDecision.intent, lastResult.data || lastResult.result) : null,
                duration: lastResult.duration,
                capability_fingerprint: decision.capability_fingerprint
              });

              if (lastResult.status === 'success') {
                const stateUpdates = stateManager.mapOutcomeToState(stepDecision.intent, decision.params, lastResult);
                stateManager.update(data.session_id, stateUpdates);
              }

              if (lastResult.status !== 'success') break;

            } catch (execErr) {
              lastResult = { status: 'failure', error: execErr.message };
              auditTrace.execution_results.push({ intent: stepDecision.intent, error: execErr.message });
              break;
            }
          }

          fastify.log.info({ audit_trace: auditTrace }, 'Flight Recorder Entry');
          auditLogger.log(auditTrace);

          finalSummary = await intelligenceService.summarizeOutcome(
            data.text, plan[plan.length - 1].intent, lastResult, result.reasoning, plan[plan.length - 1].params
          );

          socket.send(JSON.stringify({
            session_id: data.session_id,
            status: lastResult && lastResult.status === 'success' ? 'success' : 'failed',
            message: lastResult && lastResult.error ? `Chain failed: ${typeof lastResult.error === 'object' ? lastResult.error.message || lastResult.error.code || JSON.stringify(lastResult.error) : lastResult.error}` : finalSummary,
            capability_fingerprint: batchDecision.capability_fingerprint,
            timestamp: new Date().toISOString()
          }));

          await memoryService.add(data.session_id, { role: 'assistant', content: finalSummary });
          if (!lastResult.error) await ttsService.speak(finalSummary);
          return;

        } else if (data.type === 'control') {
          if (data.action === 'stop' || data.action === 'stop_tts') {
            ttsService.stop();
            if (data.session_id) {
              TrustManager.revokeClient(data.session_id, data.client_id);
            }
            return;
          } else if (data.action === 'ping') {
            socket.send(JSON.stringify({ type: 'control', action: 'pong', timestamp: new Date().toISOString() }));
            return;
          } else if (data.action === 'sync') {
            fastify.log.info({ session_id: data.session_id, client_id: data.client_id }, 'Session sync acknowledged');
            socket.send(JSON.stringify({ type: 'control', action: 'sync_ack', session_id: data.session_id }));
            return;
          }
        } else if (data.type === 'intent') {
          const decision = PolicyEngine.evaluate(data, data.session_id, data.client_id);

          const auditTrace = {
            trace_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            timestamp: new Date().toISOString(),
            session_id: data.session_id,
            client_id: data.client_id,
            privacy_mode: redactor.mode,
            capability_fingerprint: decision.capability_fingerprint,
            type: 'intent',
            intent: data.intent,
            params_redacted: redactor.redact(data.intent, data.params),
            allowed: decision.allowed,
            risk: decision.risk,
            execution_results: []
          };

          if (!decision.allowed) {
            auditTrace.denied = true;
            auditTrace.reason = decision.reason;
            auditLogger.log(auditTrace);

            socket.send(JSON.stringify({
              status: 'denied',
              reason: decision.reason,
              capability_fingerprint: decision.capability_fingerprint
            }));
            return;
          }
          if (decision.requires_confirmation && !data.confirmed) {
            socket.send(JSON.stringify({
              session_id: data.session_id,
              status: 'confirmation_required',
              intent: data.intent,
              explanation: decision.explanation,
              capability_fingerprint: decision.capability_fingerprint
            }));
            return;
          }

          if (data.confirmed && decision.permissions && data.session_id) {
            TrustManager.grant(data.session_id, data.client_id, decision.permissions, {
              isExplicit: true,
              grantedBy: 'intent_confirm',
              grantedFromIntent: data.intent
            });
          }


          const fingerprint = crypto.createHash('sha256').
          update(JSON.stringify({ intent: data.intent, params: data.params })).
          digest('hex');

          const cachedResult = stepCache.get(data.session_id, fingerprint);
          if (cachedResult && cachedResult.status === 'success') {
            fastify.log.info({ intent: data.intent, fingerprint }, 'Idempotent intent skipped (cache hit)');
            auditTrace.execution_results.push({ intent: data.intent, status: 'skipped_cache', duration: 0 });
            socket.send(JSON.stringify({
              session_id: data.session_id,
              status: 'success',
              result: cachedResult,
              capability_fingerprint: decision.capability_fingerprint,
              cached: true
            }));
            return;
          }

          const res = await executor.execute(decision.runtime, data.intent, data.params, {
            role: 'admin',
            session_id: data.session_id,
            client_id: data.client_id
          });


          if (res.status === 'success') {
            stepCache.set(data.session_id, fingerprint, res);
          }

          auditTrace.execution_results.push({
            intent: data.intent,
            status: res.status,
            result_redacted: res.data || res.result ? redactor.redact(data.intent, res.data || res.result) : null,
            duration: res.duration
          });

          auditLogger.log(auditTrace);

          socket.send(JSON.stringify({
            session_id: data.session_id,
            status: 'success',
            result: res,
            capability_fingerprint: decision.capability_fingerprint
          }));
          return;

        } else if (data.type === 'plan-execute') {
          const plan = data.plan;
          const sessionId = data.session_id;

          const batchDecision = PolicyEngine.evaluatePlan(plan, sessionId, data.client_id);

          const auditTrace = {
            trace_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            client_id: data.client_id,
            privacy_mode: redactor.mode,
            capability_fingerprint: batchDecision.capability_fingerprint,
            type: 'plan-execute',
            resolved_plan: plan.map((s) => ({
              intent: s.intent,
              params: redactor.redact(s.intent, s.params)
            })),
            execution_results: []
          };

          if (!batchDecision.allowed) {
            auditTrace.denied = true;
            auditTrace.reason = batchDecision.reason;
            auditLogger.log(auditTrace);

            socket.send(JSON.stringify({
              session_id: sessionId,
              status: 'denied',
              reason: batchDecision.reason,
              explanation: batchDecision.explanation,
              capability_fingerprint: batchDecision.capability_fingerprint
            }));
            return;
          }

          if (batchDecision.requires_confirmation && !data.confirmed) {
            socket.send(JSON.stringify({
              session_id: sessionId,
              status: 'confirmation_required',
              message: "I need your approval to proceed with this plan.",
              plan: batchDecision.decisions,
              capability_fingerprint: batchDecision.capability_fingerprint
            }));
            return;
          }

          if (data.confirmed) {
            batchDecision.decisions.forEach((d) => {
              if (d.permissions) {
                TrustManager.grant(sessionId, data.client_id, d.permissions, {
                  isExplicit: true,
                  grantedBy: 'plan_confirm',
                  plan: plan
                });
              }
            });
          }

          let results = [];
          for (const stepDecision of batchDecision.decisions) {
            const decision = PolicyEngine.evaluate(stepDecision, sessionId, data.client_id, { plan });
            if (!decision.allowed) break;


            const fingerprint = crypto.createHash('sha256').
            update(JSON.stringify({ intent: stepDecision.intent, params: stepDecision.params })).
            digest('hex');

            const cachedResult = stepCache.get(sessionId, fingerprint);
            if (cachedResult && cachedResult.status === 'success') {
              results.push({ intent: stepDecision.intent, result: cachedResult, cached: true });
              auditTrace.execution_results.push({ intent: stepDecision.intent, status: 'skipped_cache', duration: 0 });
              continue;
            }


            const res = await executor.execute(decision.runtime, stepDecision.intent, decision.params, {
              role: 'admin',
              session_id: sessionId,
              client_id: data.client_id
            });

            if (res.status === 'success') {
              stepCache.set(sessionId, fingerprint, res);
            }

            auditTrace.execution_results.push({
              intent: stepDecision.intent,
              status: res.status,
              result_redacted: res.data || res.result ? redactor.redact(stepDecision.intent, res.data || res.result) : null,
              duration: res.duration
            });

            results.push({ intent: stepDecision.intent, result: res });
          }

          auditLogger.log(auditTrace);

          socket.send(JSON.stringify({
            session_id: sessionId,
            status: 'success',
            results,
            capability_fingerprint: batchDecision.capability_fingerprint
          }));
          return;
        }

      } catch (err) {
        fastify.log.error(err);
        socket.send(JSON.stringify({ status: 'error', error: err.message }));
      }
    });

    socket.on('close', () => fastify.log.info('Client disconnected'));
    socket.on('error', (err) => console.error('Socket error:', err));
  });
});

const IntentSchema = z.object({
  type: z.literal('intent'),
  session_id: z.string(),
  client_id: z.string().default('default'),
  intent: z.string(),
  params: z.record(z.any()).optional(),
  confidence: z.number().optional(),
  confirmed: z.boolean().optional()
});

const NaturalLanguageSchema = z.object({
  type: z.literal('natural-language'),
  session_id: z.string(),
  client_id: z.string().default('default'),
  text: z.string()
});

const ControlSchema = z.object({
  type: z.literal('control'),
  session_id: z.string().optional(),
  client_id: z.string().default('default'),
  action: z.string()
});

const PlanStepSchema = z.object({
  intent: z.string(),
  params: z.record(z.any()).optional()
});

const PlanExecuteSchema = z.object({
  type: z.literal('plan-execute'),
  session_id: z.string(),
  client_id: z.string().default('default'),
  plan: z.array(PlanStepSchema),
  confirmed: z.boolean().optional()
});

const InputSchema = z.discriminatedUnion('type', [
IntentSchema,
NaturalLanguageSchema,
ControlSchema,
PlanExecuteSchema]
);

fastify.get('/health/executors', async () => {
  return await executor.getHealth();
});

fastify.get('/token', async (request) => {
  const room = request.query.room || 'gg-assistant-room';
  const identity = request.query.identity || `user-${Math.floor(Math.random() * 1000)}`;
  const token = await livekitService.generateToken(room, identity);
  return { token, url: livekitService.url };
});

fastify.get('/history/:sessionId', async (request) => {
  const { sessionId } = request.params;
  const history = await memoryService.loadFromDb(sessionId);
  return { status: 'success', history };
});

fastify.get('/sessions', async () => {
  if (!memoryService.supabase) return { status: 'error', message: 'DB not connected' };
  try {
    const { data, error } = await memoryService.supabase.
    from('chat_history').
    select('session_id, created_at').
    order('created_at', { ascending: false });
    if (error) throw error;
    const uniqueSessions = [];
    const seen = new Set();
    for (const row of data) {
      if (!seen.has(row.session_id)) {
        seen.add(row.session_id);
        uniqueSessions.push({ id: row.session_id, lastActivity: row.created_at });
      }
    }
    return { status: 'success', sessions: uniqueSessions.slice(0, 10) };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
});

const start = async () => {
  try {
    const port = config.PORT;
    await fastify.listen({ port, host: '127.0.0.1' });
    console.log(`Kirtos agent running on http://127.0.0.1:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();