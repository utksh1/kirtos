const { z } = require('zod');

/**
 * StateManager Definition:
 * - last_contact: Phone, name or ID
 * - last_app: App name (e.g., 'Safari', 'WhatsApp')
 * - last_file: Local or cloud path
 * - last_url: URL or search query
 * - active_entities: Stack of recently mentioned objects/names
 */
const StateContextSchema = z.object({
    last_contact: z.string().nullable().default(null),
    last_app: z.string().nullable().default(null),
    last_file: z.string().nullable().default(null),
    last_url: z.string().nullable().default(null),
    active_entities: z.array(z.string()).max(5).default([]),
    metadata: z.record(z.any()).default({})
});

/**
 * StateManager: Tracks deterministic session context.
 * V2 Enhancements: 
 * - Schema-validated state (Zod).
 * - Outcome-gated (updates only applied on SUCCESS).
 * - Purely for convenience, NEVER for authority.
 */
class StateManager {
    constructor() {
        this.sessions = new Map(); // sessionId -> { contextObj }
    }

    /**
     * Get the current context for a session.
     */
    get(sessionId) {
        if (!this.sessions.has(sessionId)) {
            const initialContext = StateContextSchema.parse({});
            this.sessions.set(sessionId, initialContext);
        }
        return this.sessions.get(sessionId);
    }

    /**
     * Update specific fields in the session context based on execution results.
     * This is only called for SUCCESSFUL operations.
     */
    update(sessionId, updates) {
        const currentContext = this.get(sessionId);
        const newContextCandidate = { ...currentContext };

        if (updates.contact) newContextCandidate.last_contact = updates.contact;
        if (updates.app) newContextCandidate.last_app = updates.app;
        if (updates.file) newContextCandidate.last_file = updates.file;
        if (updates.url) newContextCandidate.last_url = updates.url;

        // Recently mentioned entities stack
        if (updates.entities && Array.isArray(updates.entities)) {
            newContextCandidate.active_entities = [...updates.entities, ...currentContext.active_entities].slice(0, 5);
        }

        // Validate the new state before committing it
        try {
            const validatedContext = StateContextSchema.parse(newContextCandidate);
            this.sessions.set(sessionId, validatedContext);
            console.log(`[State] Updated state for session ${sessionId}`);
        } catch (err) {
            console.error(`[State] ERROR: Rejected invalid state update for session ${sessionId}:`, err.message);
        }
    }

    /**
     * Helper to map an intent outcome to state updates.
     */
    mapOutcomeToState(intent, params, result = {}) {
        const updates = {};
        if (!intent) return updates;

        if (intent.startsWith('whatsapp.')) {
            updates.contact = params.number || params.name;
            updates.app = 'WhatsApp';
        }

        if (intent === 'system.app.open') {
            updates.app = params.app;
        }

        if (intent.startsWith('browser.')) {
            updates.url = params.url || params.query;
            updates.app = 'Safari';
        }

        if (intent.startsWith('file.')) {
            updates.file = params.path;
        }

        return updates;
    }

    clear(sessionId) {
        this.sessions.delete(sessionId);
    }
}

module.exports = new StateManager();
