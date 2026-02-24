class MemoryService {
    constructor() {
        // Map of session_id -> Array of history items
        this.sessions = new Map();
        this.MAX_HISTORY = 10; // Keep last 10 turns
    }

    /**
     * Adds an item to the session history.
     * @param {string} sessionId 
     * @param {object} item - { role: 'user'|'assistant', content: string|object }
     */
    add(sessionId, item) {
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, []);
        }

        const history = this.sessions.get(sessionId);
        history.push({
            ...item,
            timestamp: new Date().toISOString()
        });

        // Trim history if it exceeds max
        if (history.length > this.MAX_HISTORY * 2) {
            this.sessions.set(sessionId, history.slice(-this.MAX_HISTORY * 2));
        }
    }

    /**
     * Gets the history for a session.
     * @param {string} sessionId 
     * @returns {Array}
     */
    get(sessionId) {
        return this.sessions.get(sessionId) || [];
    }

    /**
     * Clears history for a session.
     * @param {string} sessionId 
     */
    clear(sessionId) {
        this.sessions.delete(sessionId);
    }
}

module.exports = new MemoryService();
