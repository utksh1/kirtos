const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const WebSocket = require('ws');
const { z } = require('zod');
const { PolicyEngine } = require('./src/policy/engine');
const livekitService = require('./src/services/livekit');
const sttService = require('./src/services/stt');
const ttsService = require('./src/services/tts');
const intelligenceService = require('./src/services/intelligence');
const executor = require('./src/executor');
const memoryService = require('./src/services/memory');
require('dotenv').config({ override: true });

fastify.get('/', async () => {
  return { status: 'ok', service: 'Kirtos', version: '1.0.0' };
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
        const rawData = JSON.parse(message.toString());

        const parsingResult = InputSchema.safeParse(rawData);
        if (!parsingResult.success) {
          socket.send(JSON.stringify({
            status: 'error',
            error: `Invalid input format: ${parsingResult.error.message}`
          }));
          return;
        }

        const { data } = parsingResult;
        let intentRequest;

        if (data.type === 'natural-language') {
          fastify.log.info({ text: data.text }, 'Processing natural language');

          const history = memoryService.get(data.session_id);
          const parsed = await intelligenceService.parseIntent(data.text, history);
          fastify.log.info({ source: parsed.source || 'llm', intent: parsed.intent }, 'Intent classification path');

          intentRequest = {
            session_id: data.session_id,
            intent: parsed.intent,
            params: parsed.params,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning
          };

          memoryService.add(data.session_id, { role: 'user', content: data.text });

        } else if (data.type === 'control') {
          if (data.action === 'stop_tts') {
            ttsService.stop();
            return;
          }
        } else {
          intentRequest = data;
        }

        fastify.log.info({ intentRequest }, 'Evaluating intent');

        const decision = PolicyEngine.evaluate(intentRequest);
        fastify.log.info({ decision }, 'Policy decision');

        if (!decision.allowed) {
          const denialMessage = decision.explanation || `Action denied: ${decision.reason}`;
          socket.send(JSON.stringify({
            session_id: intentRequest.session_id,
            status: 'denied',
            error: decision.reason,
            message: denialMessage
          }));

          socket.send(JSON.stringify({ type: 'control', action: 'tts_start' }));
          await ttsService.speak(denialMessage);
          socket.send(JSON.stringify({ type: 'control', action: 'tts_end' }));
          return;
        }

        let executionResult;
        try {
          if (decision.requires_confirmation) {
            fastify.log.warn('Intent requires confirmation — proceeding for demo');
          }

          executionResult = await executor.execute(decision.runtime, intentRequest.intent, intentRequest.params, { role: 'admin' });
          fastify.log.info({ executionResult }, 'Execution finished');
        } catch (execErr) {
          executionResult = { error: execErr.message };
          fastify.log.error(execErr, 'Execution failed');
        }

        const originalText = data.type === 'natural-language' ? data.text : (intentRequest.reasoning || '');
        const successMessage = await intelligenceService.summarizeOutcome(
          originalText,
          intentRequest.intent,
          executionResult,
          intentRequest.reasoning,
          intentRequest.params
        );

        const response = {
          session_id: intentRequest.session_id,
          status: executionResult.error ? 'failed' : 'success',
          intent: intentRequest.intent,
          params: intentRequest.params,
          decision,
          result: executionResult,
          message: executionResult.error ? `Error: ${executionResult.error}` : successMessage,
          reasoning: intentRequest.reasoning,
          timestamp: new Date().toISOString(),
        };

        socket.send(JSON.stringify(response));

        memoryService.add(intentRequest.session_id, {
          role: 'assistant',
          content: executionResult.error ? `Execution failed: ${executionResult.error}` : `Executed ${intentRequest.intent} with success.`
        });

        if (!executionResult.error && decision.runtime !== 'query') {
          socket.send(JSON.stringify({ type: 'control', action: 'tts_start' }));
          await ttsService.speak(successMessage);
          socket.send(JSON.stringify({ type: 'control', action: 'tts_end' }));
        }

      } catch (err) {
        fastify.log.error(err);
        socket.send(JSON.stringify({
          status: 'error',
          error: err.message || 'Internal Server Error',
        }));
      }
    });

    socket.on('close', () => fastify.log.info('Client disconnected'));
    socket.on('error', (err) => console.error('Socket error:', err));
  });
});

const IntentSchema = z.object({
  type: z.literal('intent'),
  session_id: z.string(),
  intent: z.string(),
  params: z.record(z.any()).optional(),
  confidence: z.number().optional(),
});

const NaturalLanguageSchema = z.object({
  type: z.literal('natural-language'),
  session_id: z.string(),
  text: z.string(),
});

const ControlSchema = z.object({
  type: z.literal('control'),
  action: z.string()
});

const InputSchema = z.discriminatedUnion('type', [
  IntentSchema,
  NaturalLanguageSchema,
  ControlSchema
]);

fastify.get('/token', async (request) => {
  const room = request.query.room || 'gg-assistant-room';
  const identity = request.query.identity || `user-${Math.floor(Math.random() * 1000)}`;
  const token = await livekitService.generateToken(room, identity);
  return { token, url: livekitService.url };
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
