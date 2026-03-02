const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: true });

class MemoryService {
    constructor() {
        // Map of session_id -> Array of history items
        this.sessions = new Map();
        this.MAX_HISTORY = 15; // Keep more turns now that we have persistent storage

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_ANON_KEY;

        this.supabase = null;
        if (url && key) {
            this.supabase = createClient(url, key);
            console.log('MemoryService: Supabase persistence enabled.');
        } else {
            console.warn('MemoryService: Supabase credentials missing. Persistence disabled.');
        }
    }

    /**
     * Adds an item to the session history and persists to Supabase.
     */
    async add(sessionId, item) {
        if (!this.sessions.has(sessionId)) {
            // Try to load existing history from DB first if it's a new session
            await this.loadFromDb(sessionId);
        }

        const history = this.sessions.get(sessionId) || [];
        const entry = {
            ...item,
            timestamp: new Date().toISOString()
        };

        history.push(entry);
        this.sessions.set(sessionId, history);

        // Trim in-memory cache
        if (history.length > this.MAX_HISTORY * 2) {
            this.sessions.set(sessionId, history.slice(-this.MAX_HISTORY * 2));
        }

        // Persist to Supabase
        if (this.supabase) {
            try {
                const { error } = await this.supabase
                    .from('chat_history')
                    .insert([{
                        session_id: sessionId,
                        role: item.role,
                        content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
                    }]);

                if (error) console.error('[Memory] DB Save Error:', error.message);
            } catch (err) {
                console.error('[Memory] DB Save Exception:', err.message);
            }
        }
    }

    /**
     * Loads history from Supabase into memory.
     */
    async loadFromDb(sessionId) {
        if (!this.supabase) return [];

        try {
            const { data, error } = await this.supabase
                .from('chat_history')
                .select('role, content, created_at')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true })
                .limit(this.MAX_HISTORY * 2);

            if (error) {
                console.error('[Memory] DB Load Error:', error.message);
                return [];
            }

            if (data && data.length > 0) {
                const history = data.map(row => ({
                    role: row.role,
                    content: row.content,
                    timestamp: row.created_at
                }));
                this.sessions.set(sessionId, history);
                console.log(`[Memory] Loaded ${history.length} messages for session ${sessionId}`);
                return history;
            }
        } catch (err) {
            console.error('[Memory] DB Load Exception:', err.message);
        }

        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, []);
        }
        return [];
    }

    /**
     * Gets the history for a session.
     */
    get(sessionId) {
        return this.sessions.get(sessionId) || [];
    }

    /**
     * Clears history for a session (local only for now, can be extended to DB).
     */
    clear(sessionId) {
        this.sessions.delete(sessionId);
    }
}

module.exports = new MemoryService();
