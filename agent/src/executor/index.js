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


const guardrails = require('../services/guardrails');
const IntentRegistry = require('../policy/registry');
const Redactor = require('../utils/redactor');
const redactor = new Redactor();

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
    screen: screenExecutor
};


const runtimeAllowlists = {
    system: new Set(['system.kill_switch', 'system.status', 'system.uptime', 'system.resource_usage', 'query.time', 'query.help', 'query.greet']),
    docker: new Set(['docker.start', 'docker.stop', 'docker.restart', 'docker.list', 'docker.logs']),
    shell: new Set(['shell.exec']),
    fs: new Set(['file.read', 'file.write', 'file.list']),
    chat: new Set(['chat.message']),
    browser: new Set(['browser.open', 'browser.play_youtube', 'browser.fetch']),
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
    screen: new Set(['screen.screenshot'])
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
    screen: { timeout: 30000 }
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
        'screen.screenshot'
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
    'screen.screenshot'
]);

function withTimeout(promise, ms) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Execution timeout')), ms);
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
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, 'denied', null, 'Execution is globally disabled.', started_at);
            }

            // 2. Validate Runtime and Intent
            const allowedIntents = runtimeAllowlists[runtime];
            if (!allowedIntents || !allowedIntents.has(intent)) {
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, 'denied', null, `Intent not allowed for runtime: ${runtime}`, started_at);
            }

            // 3. Permission Check
            const roleSet = rolePermissions[role];
            if (!roleSet || (!roleSet.has('*') && !roleSet.has(intent))) {
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, 'denied', null, `Permission denied for role: ${role}`, started_at);
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
                    return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, 'denied', null, 'Action is on cooldown.', started_at);
                }
            }

            const executor = executors[runtime];
            if (!executor || typeof executor.execute !== 'function') {
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, 'denied', null, `Unsupported runtime: ${runtime}`, started_at);
            }

            // 5. Apply Sandbox and Resource Limits (Timeout handled here)
            const limits = RUNTIME_LIMITS[runtime] || { timeout: 30000 };
            const timeout = context.timeout || limits.timeout;

            // Log Audit (Start)
            this._logAudit({
                trace_id,
                session_id,
                client_id,
                intent,
                runtime,
                execution_profile: context.execution_profile || 'safe',
                capability_fingerprint,
                limits,
                event: 'start',
                ts: started_at
            });

            // 6. Execute with Timeout
            let result = await withTimeout(
                executor.execute(intent, params),
                timeout
            );

            // 7. Handle sub-executor errors if they returned { error: ... }
            if (result && result.error) {
                return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, 'failure', null, result.error, started_at);
            }

            // 8. Apply Output Cap if required
            if (limits.output_cap || limits.size_cap) {
                result = this._applyOutputCap(result);
            }

            return this._formatResponse(session_id, trace_id, client_id, capability_fingerprint, intent, 'success', result, null, started_at);

        } catch (err) {
            const status = err.message === 'Execution timeout' ? 'timeout' : 'failure';
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
            status,
            result: result || {},
            error: error ? { message: error, code: status.toUpperCase() } : null,
            started_at,
            finished_at,
            duration_ms
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

    _applyOutputCap(result) {
        if (!result) return result;
        const MAX_SIZE = 10_000; // 10KB cap

        const cap = (val) => {
            if (typeof val === 'string' && val.length > MAX_SIZE) {
                return val.substring(0, MAX_SIZE) + '... [TRUNCATED]';
            }
            return val;
        };

        if (result.stdout) result.stdout = cap(result.stdout);
        if (result.stderr) result.stderr = cap(result.stderr);
        if (result.content) result.content = cap(result.content);
        if (result.logs) result.logs = cap(result.logs);

        return result;
    }
}

module.exports = new Executor();

