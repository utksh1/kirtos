const systemExecutor = require('./system');
const dockerExecutor = require('./docker');
const chatExecutor = require('./chat');
const fsExecutor = require('./fs');
const shellExecutor = require('./shell');
const browserExecutor = require('./browser');
const communicationExecutor = require('./communication');
const computerExecutor = require('./computer');
const deviceExecutor = require('./device');
const settingsExecutor = require('./settings');
const codeExecutor = require('./code');
const knowledgeExecutor = require('./knowledge');
const funExecutor = require('./fun');
const mediaExecutor = require('./media');
const whatsappExecutor = require('./whatsapp');
const uiExecutor = require('./ui');
const inputExecutor = require('./input');
const windowExecutor = require('./window');
const screenExecutor = require('./screen');
const financeExecutor = require('./finance');
const healthExecutor = require('./health');
const homeExecutor = require('./home');
const learningExecutor = require('./learning');
const entertainmentExecutor = require('./entertainment');
const travelExecutor = require('./travel');
const wellnessExecutor = require('./wellness');
const shoppingExecutor = require('./shopping');


const guardrails = require('../services/guardrails');
const IntentRegistry = require('../policy/registry');
const Redactor = require('../utils/redactor');
const constraints = require('../policy/constraints');
const ConcurrencyLimiter = require('../utils/concurrency-limiter');
const stats = require('../utils/stats');
const { applyOutputCap } = require('../utils/output-cap');

const redactor = new Redactor();
const limiter = new ConcurrencyLimiter({
    shell: 2,
    code: 2,
    screen: 1,
    window: 1,
    default: 5,
    maxQueueDepth: 15
});

// ─── Reliability Utilities ───────────────────────────────────────────────────

class RetryHandler {
    constructor(maxRetries = 2, baseDelay = 500) {
        this.maxRetries = maxRetries;
        this.baseDelay = baseDelay;
    }

    async run(fn, context = {}) {
        let lastError;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const jitter = Math.random() * 200;
                    const delay = Math.pow(2, attempt) * this.baseDelay + jitter;
                    console.log(`[RetryHandler] Retrying ${context.intent} (attempt ${attempt}/${this.maxRetries}) in ${Math.round(delay)}ms`);
                    await new Promise(r => setTimeout(r, delay));
                }
                return await fn();
            } catch (err) {
                lastError = err;
                // Only retry on timeout or helper-related errors
                const retryableCodes = [ExecErrors.EXEC_TIMEOUT, ExecErrors.HELPER_DOWN, 'WINDOW_HELPER_TIMEOUT', 'INPUT_HELPER_TIMEOUT'];
                if (!retryableCodes.includes(err.code) && !err.message?.includes('timeout')) {
                    throw err;
                }
            }
        }
        throw lastError;
    }
}

class CircuitBreaker {
    constructor(threshold = 5, resetTimeout = 30000) {
        this.threshold = threshold;
        this.resetTimeout = resetTimeout;
        this.failures = 0;
        this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        this.lastFailureTime = null;
    }

    isOpen() {
        if (this.state === 'OPEN' && Date.now() - this.lastFailureTime > this.resetTimeout) {
            this.state = 'HALF_OPEN';
            return false;
        }
        return this.state === 'OPEN';
    }

    recordSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            console.error(`[CircuitBreaker] TRIP! State moved to OPEN after ${this.failures} failures.`);
        }
    }
}

const retryHandlers = {
    screen: new RetryHandler(2, 1000),
    window: new RetryHandler(2, 500),
    input: new RetryHandler(2, 500),
    default: new RetryHandler(1, 200)
};

const circuitBreakers = {
    screen: new CircuitBreaker(5),
    window: new CircuitBreaker(5),
    input: new CircuitBreaker(5)
};

const executors = {
    system: systemExecutor,
    docker: dockerExecutor,
    chat: chatExecutor,
    fs: fsExecutor,
    shell: shellExecutor,
    browser: browserExecutor,
    communication: communicationExecutor,
    computer: computerExecutor,
    device: deviceExecutor,
    settings: settingsExecutor,
    code: codeExecutor,
    knowledge: knowledgeExecutor,
    fun: funExecutor,
    media: mediaExecutor,
    whatsapp: whatsappExecutor,
    ui: uiExecutor,
    input: inputExecutor,
    window: windowExecutor,
    screen: screenExecutor,
    shopping: shoppingExecutor,
    finance: financeExecutor,
    health: healthExecutor,
    home: homeExecutor,
    learning: learningExecutor,
    entertainment: entertainmentExecutor,
    travel: travelExecutor,
    wellness: wellnessExecutor
};


const runtimeAllowlists = {
    system: new Set(['system.kill_switch', 'system.status', 'system.uptime', 'system.resource_usage', 'query.time', 'query.help', 'query.greet']),
    docker: new Set(['docker.start', 'docker.stop', 'docker.restart', 'docker.list', 'docker.logs']),
    shell: new Set(['shell.exec']),
    fs: new Set(['file.read', 'file.write', 'file.list']),
    chat: new Set(['chat.message']),
    browser: new Set([
        'browser.open',
        'browser.play_youtube',
        'browser.fetch',
        'browser.search',
        'browser.session.start',
        'browser.session.stop',
        'browser.navigate',
        'browser.click',
        'browser.type',
        'browser.wait_for',
        'browser.extract_text',
        'browser.screenshot'
    ]),
    communication: new Set(['communication.send_message']),
    computer: new Set(['computer.type']),
    device: new Set([
        'device.set_alarm',
        'device.restart_stack',
        'device.open_workspace',
        'device.clean_node_modules',
        'device.toggle_focus',
        'device.morning_routine',
        'device.deploy_backend',
        'device.run_tests',
        'device.toggle_hotspot',
        'device.set_brightness',
        'device.mute_notifications',
        'device.open_app'
    ]),
    settings: new Set([
        'system.brightness.set',
        'system.volume.set',
        'system.volume.mute',
        'clock.alarm.set',
        'clock.timer.start',
        'system.app.open',
        'system.focus.set',
        'system.notification.show'
    ]),
    code: new Set(['network.ping', 'network.scan', 'code.run']),
    knowledge: new Set(['knowledge.search', 'knowledge.define', 'knowledge.weather', 'knowledge.currency']),
    fun: new Set(['fun.joke', 'fun.quote', 'fun.fact']),
    media: new Set(['media.play_music', 'media.list_music', 'media.pause', 'media.stop', 'media.resume']),
    whatsapp: new Set(['whatsapp.connect', 'whatsapp.status', 'whatsapp.send', 'whatsapp.read', 'whatsapp.disconnect', 'whatsapp.contacts']),
    ui: new Set(['ui.focus.app', 'ui.keyboard.shortcut', 'ui.type.text', 'ui.key.press']),
    input: new Set(['input.mouse.move', 'input.mouse.click', 'input.mouse.scroll', 'input.mouse.drag']),
    window: new Set(['window.focus.app', 'window.minimize', 'window.maximize', 'window.close', 'window.move', 'window.resize']),
    screen: new Set(['screen.screenshot']),
    shopping: new Set(['shopping.list.add', 'shopping.list.remove', 'shopping.list.view', 'shopping.price.compare', 'shopping.price.alert_set', 'shopping.order.track', 'shopping.coupon.find']),
    finance: new Set(['finance.track_expense', 'finance.set_budget_alert', 'finance.check_balance', 'finance.pay_bill', 'finance.transfer_money', 'finance.report_spending']),
    health: new Set(['health.track_steps', 'health.log_meal', 'health.workout_reminder', 'health.monitor_sleep', 'health.suggest_recipe']),
    home: new Set(['home.control_device', 'home.manage_security', 'home.set_routine', 'home.monitor_energy']),
    learning: new Set(['learning.lesson_start', 'learning.practice_problem', 'learning.set_reminder', 'learning.find_course', 'learning.track_progress']),
    entertainment: new Set(['entertainment.find_content', 'entertainment.recommend', 'entertainment.check_showtimes', 'entertainment.watchlist_add', 'entertainment.find_streaming']),
    travel: new Set(['travel.book', 'travel.flight_status', 'travel.find_local', 'travel.weather', 'travel.organize_itinerary']),
    wellness: new Set(['wellness.meditation_start', 'wellness.stress_relief', 'wellness.breathing_exercise', 'wellness.track_mood'])
};

const RUNTIME_LIMITS = {
    system: { cpu: '1 core', memory: '128 MB', timeout: 3000 },
    docker: { cpu: '1 core', memory: '256 MB', timeout: 5000, output_cap: true },
    fs: { cpu: '1 core', memory: '128 MB', timeout: 5000, max_write: 'implementation-defined' },
    shell: { cpu: '1 core', memory: '128 MB', timeout: 5000, output_cap: true },
    browser: { cpu: '1 core', memory: '256 MB', timeout: 5000, size_cap: true },
    code: { cpu: '1 core', memory: '512 MB', disk: '50 MB', timeout: 10000 },
    chat: { timeout: 30000 },
    communication: { timeout: 5000 },
    computer: { timeout: 5000 },
    device: { timeout: 10000 },
    settings: { timeout: 5000 },
    knowledge: { cpu: '1 core', memory: '128 MB', timeout: 10000 },
    fun: { timeout: 5000 },
    media: { timeout: 5000 },
    whatsapp: { timeout: 15000 },
    ui: { timeout: 5000 },
    input: { timeout: 5000 },
    window: { timeout: 5000 },
    screen: { timeout: 30000 },
    shopping: { timeout: 30000 },
    finance: { timeout: 10000 },
    health: { timeout: 10000 },
    home: { timeout: 10000 },
    learning: { timeout: 10000 },
    entertainment: { timeout: 10000 },
    travel: { timeout: 15000 },
    wellness: { timeout: 10000 }
};

const rolePermissions = {
    admin: new Set(['*']),
    operator: new Set([
        'docker.start',
        'docker.stop',
        'docker.restart',
        'shell.exec',
        'file.read',
        'computer.type',
        'device.restart_stack',
        'device.open_workspace',
        'device.run_tests',
        'device.morning_routine',
        'device.open_app',
        'system.brightness.set',
        'system.volume.set',
        'system.volume.mute',
        'clock.alarm.set',
        'clock.timer.start',
        'system.app.open',
        'system.focus.set',
        'system.notification.show',
        'query.greet',
        'knowledge.search',
        'knowledge.define',
        'knowledge.weather',
        'knowledge.currency',
        'fun.joke',
        'fun.quote',
        'fun.fact',
        'media.play_music',
        'media.list_music',
        'media.pause',
        'media.stop',
        'media.resume',
        'whatsapp.connect',
        'whatsapp.status',
        'whatsapp.send',
        'whatsapp.read',
        'whatsapp.disconnect',
        'whatsapp.contacts',
        'ui.focus.app',
        'ui.keyboard.shortcut',
        'ui.type.text',
        'ui.key.press',
        'input.mouse.move',
        'input.mouse.click',
        'input.mouse.scroll',
        'input.mouse.drag',
        'window.focus.app',
        'window.minimize',
        'window.maximize',
        'window.close',
        'window.move',
        'window.resize',
        'screen.screenshot',
        'shopping.list.add',
        'shopping.list.remove',
        'shopping.list.view',
        'shopping.price.compare',
        'shopping.price.alert_set',
        'shopping.order.track',
        'shopping.coupon.find'
    ]),

    user: new Set([
        'chat.message',
        'browser.open',
        'query.greet',
        'knowledge.search',
        'knowledge.define',
        'knowledge.weather',
        'knowledge.currency',
        'fun.joke',
        'fun.quote',
        'fun.fact',
        'media.play_music',
        'media.list_music',
        'media.pause',
        'media.stop',
        'media.resume',
        'whatsapp.status',
        'whatsapp.read',
        'whatsapp.contacts'
    ])
};

const sensitiveActions = new Set([
    'docker.restart',
    'docker.stop',
    'shell.exec',
    'file.write',
    'code.run',
    'communication.send_message',
    'whatsapp.send',
    'ui.keyboard.shortcut',
    'ui.type.text',
    'ui.key.press',
    'input.mouse.click',
    'input.mouse.drag',
    'window.close',
    'window.move',
    'window.resize',
    'screen.screenshot',
    'shopping.list.add',
    'shopping.list.remove',
    'shopping.price.alert_set'
]);

// Concurrency caps per runtime (queued with backpressure)
const runtimeConcurrencyLimits = {
    shell: 2,
    code: 2,
    screen: 1,
    window: 1,
    browser: 3,
    default: 5
};

const ExecErrors = {
    EXEC_TIMEOUT: 'EXEC_TIMEOUT',
    HELPER_DOWN: 'HELPER_DOWN',
    PRECONDITION_FAIL: 'PRECONDITION_FAIL',
    RESOURCE_CAP: 'RESOURCE_CAP',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    UNSUPPORTED_INTENT: 'UNSUPPORTED_INTENT',
    UNSUPPORTED_RUNTIME: 'UNSUPPORTED_RUNTIME',
    GLOBAL_DISABLED: 'GLOBAL_DISABLED',
    COOLDOWN: 'COOLDOWN',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    PARTIAL_SUCCESS: 'PARTIAL_SUCCESS'
};

function withTimeout(promise, ms) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const err = new Error('Execution timeout');
            err.code = ExecErrors.EXEC_TIMEOUT;
            reject(err);
        }, ms);
    });

    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        timeoutPromise
    ]);
}

class Executor {
    async execute(runtime, intent, params = {}, context = {}) {
        const started_at = new Date().toISOString();
        const startTime = Date.now();
        const role = context.role || 'user';
        const session_id = context.session_id || 'untracked';
        const trace_id = context.trace_id || 'untracked';
        const client_id = context.client_id || 'untracked';
        const capability_fingerprint = IntentRegistry.getFingerprint ? IntentRegistry.getFingerprint() : 'untracked';

        try {
            // 1. Kill Switch Check
            if (!guardrails.getExecutionStatus() && runtime !== 'chat' && intent !== 'system.kill_switch') {
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, ExecErrors.GLOBAL_DISABLED, null, 'Execution is globally disabled.', started_at);
            }

            // 2. Validate Runtime and Intent
            const allowedIntents = runtimeAllowlists[runtime];
            if (!allowedIntents || !allowedIntents.has(intent)) {
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, ExecErrors.UNSUPPORTED_INTENT, null, `Intent not allowed for runtime: ${runtime}`, started_at);
            }

            // 3. Permission Check
            const roleSet = rolePermissions[role];
            if (!roleSet || (!roleSet.has('*') && !roleSet.has(intent))) {
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, ExecErrors.PERMISSION_DENIED, null, `Permission denied for role: ${role}`, started_at);
            }

            // 4. Rate Limiting / Cooldown
            if (sensitiveActions.has(intent)) {
                const key =
                    params.container ||
                    params.path ||
                    params.command ||
                    params.recipient ||
                    'global';

                const cooldownKey = `${intent}:${key}`;

                if (!guardrails.canExecute(cooldownKey)) {
                    return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, ExecErrors.COOLDOWN, null, 'Action is on cooldown.', started_at);
                }
            }

            const executor = executors[runtime];
            if (!executor || typeof executor.execute !== 'function') {
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, ExecErrors.UNSUPPORTED_RUNTIME, null, `Unsupported runtime: ${runtime}`, started_at);
            }

            // 5. Apply Sandbox and Resource Limits (Timeout handled here)
            const limits = RUNTIME_LIMITS[runtime] || { timeout: 30000 };

            // Adaptive Timeout: use historical p95 if available
            const baseTimeout = context.timeout || limits.timeout;
            const timeout = stats.getRecommendedTimeout(intent, baseTimeout);

            // Log Audit (Start)
            this._logAudit({
                trace_id,
                session_id,
                client_id,
                intent,
                runtime,
                execution_profile: context.execution_profile || 'safe',
                capability_fingerprint,
                limits: { ...limits, timeout, actual_timeout: timeout },
                event: 'start',
                ts: started_at
            });

            // 6. Pre-Execution Constraints Verification
            const intentDef = IntentRegistry.get(intent);
            if (intentDef && intentDef.preConditions) {
                const preCheck = await constraints.validate(intentDef.preConditions);
                if (!preCheck.satisfied) {
                    return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, ExecErrors.PRECONDITION_FAIL, null, `Pre-condition failure: ${preCheck.failures.join(', ')}`, started_at);
                }
            }

            // 7. Execute with Retry, Circuit Breaker, and Limiter
            const cb = circuitBreakers[runtime];
            if (cb && cb.isOpen()) {
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, ExecErrors.HELPER_DOWN, null, `Circuit breaker is OPEN for runtime: ${runtime}`, started_at);
            }

            const retryHandler = retryHandlers[runtime] || retryHandlers.default;

            const result = await retryHandler.run(async () => {
                return await limiter.run(runtime, async () => {
                    try {
                        const executionResult = await withTimeout(
                            executor.execute(intent, params),
                            timeout
                        );

                        // If success, reset circuit breaker
                        if (cb) cb.recordSuccess();

                        // Record latency for adaptive tuning
                        const duration = Date.now() - startTime;
                        stats.record(intent, duration);

                        return executionResult;
                    } catch (err) {
                        // Record failure for circuit breaker
                        if (cb) cb.recordFailure();
                        throw err;
                    }
                });
            }, { intent });

            // 8. Post-Execution Verification (Closed-Loop)
            if (intentDef && intentDef.postConditions) {
                const postCheck = await constraints.validate(intentDef.postConditions);
                if (!postCheck.satisfied) {
                    console.error(`[Executor] Post-condition failure for ${intent}: ${postCheck.failures.join(', ')}`);
                    return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, ExecErrors.PARTIAL_SUCCESS, result, `Post-verification failure: ${postCheck.failures.join(', ')}`, started_at);
                }
            }

            // 7. Handle sub-executor errors if they returned { error: ... }
            if (result && result.error) {
                // If it's a known error from the helper, we should ideally mapping it.
                // For now, we use a generic failure or helper down if it looks like one.
                const code = result.code || ExecErrors.INTERNAL_ERROR;
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, code, null, result.error, started_at);
            }

            // 8. Apply Output Cap if required
            if (limits.output_cap || limits.size_cap) {
                result = applyOutputCap(result, 12_000);
            }

            return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, 'success', result, null, started_at);

        } catch (err) {
            const status = err.code || ExecErrors.INTERNAL_ERROR;
            return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, status, null, err.message, started_at);
        }
    }

    _formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, status, result, error, started_at) {
        const finished_at = new Date().toISOString();
        const duration_ms = Date.now() - new Date(started_at).getTime();

        const response = {
            trace_id,
            session_id,
            client_id,
            capability_fingerprint,
            intent,
            status: status === 'success' || status === 'partial_success' ? status : 'failure',
            result: result || {},
            error: status !== 'success' && status !== 'partial_success' ? {
                message: error,
                code: status,
                timestamp: finished_at
            } : (status === 'partial_success' ? { message: error, code: status } : null),
            meta: {
                started_at,
                finished_at,
                duration_ms,
                verifications: status === 'partial_success' ? 'failed' : (status === 'success' ? 'passed' : 'skipped')
            }
        };

        // Redact results for safety before logging
        const loggableResponse = { ...response };
        if (loggableResponse.result) {
            loggableResponse.result = redactor.redactResult ? redactor.redactResult(intent, loggableResponse.result) : loggableResponse.result;
        }

        // Final audit log for termination
        this._logAudit({
            ...loggableResponse,
            event: 'terminate'
        });

        return response;
    }

    _logAudit(record) {
        // In a real system this would go to a secure append-only log file or service
        console.log(JSON.stringify(record));
    }

    async getHealth() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            executors: {}
        };

        const nativeRuntimes = ['screen', 'window', 'input'];
        for (const runtime of nativeRuntimes) {
            const exec = executors[runtime];
            if (exec && typeof exec.healthCheck === 'function') {
                const check = await exec.healthCheck();
                const cb = circuitBreakers[runtime];

                health.executors[runtime] = {
                    ...check,
                    circuit_breaker: cb ? {
                        state: cb.state,
                        failures: cb.failures
                    } : null
                };

                if (check.status === 'unhealthy' || (cb && cb.state === 'OPEN')) {
                    health.status = 'degraded';
                }
            }
        }

        return health;
    }
}

module.exports = new Executor();
