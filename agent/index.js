const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const WebSocket = require('ws');
const { z } = require('zod');
const crypto = require('crypto');
require('dotenv').config({ override: true });

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

const redactor = new Redactor(process.env.PRIVACY_MODE || 'normal');

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

        // V2 Enhancement: Canonicalization Layer with Forensics
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

          // Evaluate the whole plan (Passes plan context for hash scoping)
          const batchDecision = PolicyEngine.evaluatePlan(plan, data.session_id, data.client_id);

          if (!batchDecision.allowed) {
            const denialMessage = batchDecision.explanation || `Action denied: ${batchDecision.reason}`;
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

          // Flight Recorder: Privacy-Safe + Replayable
          const auditTrace = {
            trace_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
            timestamp: new Date().toISOString(),
            session_id: data.session_id,
            client_id: data.client_id,
            privacy_mode: redactor.mode,
            capability_fingerprint: batchDecision.capability_fingerprint,

            // Replay Inputs
            canonical_input: {
              hash: crypto.createHash('sha256').update(data.text).digest('hex'),
              transformations: transformations,
            },
            resolved_plan: plan.map(s => ({
              intent: s.intent,
              params: redactor.redact(s.intent, s.params)
            })),

            // Replay Logic
            policy_decisions: batchDecision.decisions.map(d => ({
              intent: d.intent,
              allowed: d.allowed,
              risk: d.risk,
              guard_findings: d.guard_findings,
              explanation: d.explanation
            })),

            execution_results: [],
          };

          // Execute plan sequentially
          let finalSummary = result.reasoning;
          let lastResult = null;

          for (const step of plan) {
            const decision = PolicyEngine.evaluate(step, data.session_id, data.client_id, { plan });

            try {
              lastResult = await executor.execute(decision.runtime, step.intent, step.params, { role: 'admin' });

              auditTrace.execution_results.push({
                intent: step.intent,
                status: lastResult.status,
                result_redacted: (lastResult.data || lastResult.result) ? redactor.redact(step.intent, lastResult.data || lastResult.result) : null,
                duration: lastResult.duration,
                capability_fingerprint: decision.capability_fingerprint
              });

              if (lastResult.status === 'success') {
                const stateUpdates = stateManager.mapOutcomeToState(step.intent, step.params, lastResult);
                stateManager.update(data.session_id, stateUpdates);
              }

              if (lastResult.status !== 'success') break;

            } catch (execErr) {
              lastResult = { status: 'failure', error: execErr.message };
              auditTrace.execution_results.push({ intent: step.intent, error: execErr.message });
              break;
            }
          }

          fastify.log.info({ audit_trace: auditTrace }, 'Flight Recorder Entry');

          finalSummary = await intelligenceService.summarizeOutcome(
            data.text, plan[plan.length - 1].intent, lastResult, result.reasoning, plan[plan.length - 1].params
          );

          socket.send(JSON.stringify({
            session_id: data.session_id,
            status: (lastResult && lastResult.status === 'success') ? 'success' : 'failed',
            message: (lastResult && lastResult.error) ? `Chain failed: ${lastResult.error}` : finalSummary,
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
          }
        } else if (data.type === 'intent') {
          const decision = PolicyEngine.evaluate(data, data.session_id, data.client_id);
          if (!decision.allowed) {
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

          const res = await executor.execute(decision.runtime, data.intent, data.params, { role: 'admin' });
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
          if (!batchDecision.allowed) return;

          batchDecision.decisions.forEach(d => {
            if (d.permissions) {
              TrustManager.grant(sessionId, data.client_id, d.permissions, {
                isExplicit: true,
                grantedBy: 'plan_confirm',
                plan: plan
              });
            }
          });

          let results = [];
          for (const step of plan) {
            const decision = PolicyEngine.evaluate(step, sessionId, data.client_id, { plan });
            if (!decision.allowed) break;
            const res = await executor.execute(decision.runtime, step.intent, step.params, { role: 'admin' });
            results.push({ intent: step.intent, result: res });
          }

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
  confirmed: z.boolean().optional(),
});

const NaturalLanguageSchema = z.object({
  type: z.literal('natural-language'),
  session_id: z.string(),
  client_id: z.string().default('default'),
  text: z.string(),
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
  plan: z.array(PlanStepSchema)
});

const InputSchema = z.discriminatedUnion('type', [
  IntentSchema,
  NaturalLanguageSchema,
  ControlSchema,
  PlanExecuteSchema
]);

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
    const { data, error } = await memoryService.supabase
      .from('chat_history')
      .select('session_id, created_at')
      .order('created_at', { ascending: false });
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
    const port = process.env.PORT || 3001;
    await fastify.listen({ port: parseInt(port), host: '127.0.0.1' });
    console.log(`Kirtos agent running on http://127.0.0.1:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
