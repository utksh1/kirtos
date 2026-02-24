/**
 * WhatsApp Service — Baileys Connection Manager
 * 
 * Manages the WhatsApp Web connection lifecycle:
 *  - QR code auth (printed to terminal on first run)
 *  - Session persistence (auto-reconnect after restart)
 *  - Message sending and reading
 *  - Contact name resolution
 * 
 * Session credentials are stored in agent/.whatsapp-auth/
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const AUTH_DIR = path.join(__dirname, '..', '..', '.whatsapp-auth');

class WhatsAppService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.qrDisplayed = false;
        this.messageStore = [];
        this.contacts = {};      // JID → display name cache
        this.MAX_STORE = 500;
    }

    /** Format a JID into a clean phone number. */
    _formatNumber(jid) {
        if (!jid) return 'Unknown';
        return jid.replace('@s.whatsapp.net', '').replace('@g.us', ' (group)');
    }

    /** Get display name for a JID — prefers saved name, then pushName, then number. */
    _getDisplayName(jid, pushName) {
        if (pushName) {
            this.contacts[jid] = pushName;
            return pushName;
        }
        if (this.contacts[jid]) return this.contacts[jid];
        return this._formatNumber(jid);
    }

    /**
     * Find a contact JID by name (fuzzy, case-insensitive).
     * Searches the contacts cache built from incoming pushNames.
     * @param {string} name - Contact name to search for
     * @returns {{ jid: string, name: string } | null}
     */
    findContactByName(name) {
        if (!name) return null;
        const query = name.toLowerCase().trim();

        // Exact match first
        for (const [jid, contactName] of Object.entries(this.contacts)) {
            if (contactName.toLowerCase() === query) {
                return { jid, name: contactName };
            }
        }

        // Partial / starts-with match
        for (const [jid, contactName] of Object.entries(this.contacts)) {
            if (contactName.toLowerCase().includes(query) ||
                query.includes(contactName.toLowerCase())) {
                return { jid, name: contactName };
            }
        }

        return null;
    }

    /** Detect message content type and return human-readable text + type label. */
    _extractMessageContent(msg) {
        const m = msg.message;
        if (!m) return { text: '[empty]', type: 'empty' };

        if (m.conversation) return { text: m.conversation, type: 'text' };
        if (m.extendedTextMessage?.text) return { text: m.extendedTextMessage.text, type: 'text' };

        if (m.imageMessage) {
            return { text: m.imageMessage.caption || '📷 Image', type: 'image' };
        }
        if (m.videoMessage) {
            return { text: m.videoMessage.caption || '🎬 Video', type: 'video' };
        }
        if (m.audioMessage) {
            const dur = m.audioMessage.seconds ? ` (${m.audioMessage.seconds}s)` : '';
            return { text: m.audioMessage.ptt ? `🎤 Voice note${dur}` : `🎵 Audio${dur}`, type: 'audio' };
        }
        if (m.documentMessage) {
            return { text: `📄 ${m.documentMessage.fileName || 'Document'}`, type: 'document' };
        }
        if (m.stickerMessage) return { text: '🩷 Sticker', type: 'sticker' };
        if (m.contactMessage) return { text: `👤 Contact: ${m.contactMessage.displayName || 'Shared'}`, type: 'contact' };
        if (m.locationMessage) return { text: '📍 Location', type: 'location' };
        if (m.liveLocationMessage) return { text: '📍 Live location', type: 'location' };
        if (m.reactionMessage) return { text: `${m.reactionMessage.text || '👍'} Reaction`, type: 'reaction' };

        const keys = Object.keys(m).filter(k => k !== 'messageContextInfo');
        return { text: `[${keys[0] || 'unknown'}]`, type: 'other' };
    }

    /**
     * Initialize and connect to WhatsApp.
     * First run: QR code printed to terminal. Subsequent: auto-reconnect.
     */
    async connect() {
        if (this.isConnected && this.socket) {
            console.log('[WhatsApp] Already connected.');
            return;
        }

        if (!fs.existsSync(AUTH_DIR)) {
            fs.mkdirSync(AUTH_DIR, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        const noop = () => { };
        const silentLogger = {
            level: 'silent',
            trace: noop, debug: noop, info: noop,
            warn: console.warn, error: console.error, fatal: console.error,
            child: () => silentLogger
        };

        this.socket = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            browser: ['Kirtos', 'macOS', '1.0.0'],
            logger: silentLogger
        });

        // Connection lifecycle
        this.socket.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.qrDisplayed = true;
                console.log('\n[WhatsApp] Scan this QR code with your phone:\n');
                qrcode.generate(qr, { small: true });
                console.log('[WhatsApp] Open WhatsApp > Settings > Linked Devices > Link a Device\n');
            }

            if (connection === 'close') {
                this.isConnected = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log('[WhatsApp] Connection lost. Reconnecting...');
                    setTimeout(() => this.connect(), 3000);
                } else {
                    console.log('[WhatsApp] Logged out. Delete .whatsapp-auth/ and restart to re-authenticate.');
                }
            }

            if (connection === 'open') {
                this.isConnected = true;
                this.qrDisplayed = false;
                console.log('[WhatsApp] ✅ Connected successfully!');
            }
        });

        this.socket.ev.on('creds.update', saveCreds);

        // Cache contact names
        this.socket.ev.on('contacts.update', (contacts) => {
            for (const c of contacts) {
                if (c.id && c.notify) this.contacts[c.id] = c.notify;
            }
        });

        // Listen for incoming messages (real-time)
        this.socket.ev.on('messages.upsert', ({ messages, type }) => {
            for (const msg of messages) {
                if (msg.message) {
                    this._storeMessage(msg);
                }
            }
        });

        // Capture history sync on initial connection (Baileys v6+)
        this.socket.ev.on('messaging-history.set', ({ messages, isLatest }) => {
            console.log(`[WhatsApp] History sync: ${messages.length} messages (latest: ${isLatest})`);
            for (const msg of messages) {
                if (msg.message) {
                    this._storeMessage(msg);
                }
            }
            // Sort by timestamp descending after bulk insert
            this.messageStore.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            if (this.messageStore.length > this.MAX_STORE) {
                this.messageStore.length = this.MAX_STORE;
            }
        });
    }

    /** Store a message into the in-memory buffer. */
    _storeMessage(msg) {
        // Skip duplicate IDs
        if (this.messageStore.some(m => m.id === msg.key.id)) return;

        const { text, type } = this._extractMessageContent(msg);
        const isFromMe = msg.key.fromMe;
        const entry = {
            from: isFromMe ? 'You' : this._getDisplayName(msg.key.remoteJid, msg.pushName),
            number: this._formatNumber(msg.key.remoteJid),
            text,
            type,
            direction: isFromMe ? 'sent' : 'received',
            timestamp: msg.messageTimestamp
                ? new Date((typeof msg.messageTimestamp === 'number' ? msg.messageTimestamp : msg.messageTimestamp.low) * 1000).toISOString()
                : new Date().toISOString(),
            id: msg.key.id
        };
        this.messageStore.unshift(entry);
        if (this.messageStore.length > this.MAX_STORE) {
            this.messageStore.pop();
        }
    }

    /**
     * Send a text message by phone number or contact name.
     * @param {string} numberOrName - Phone number (e.g. "919876543210") or contact name (e.g. "Utkarsh")
     * @param {string} message - Text to send
     */
    async sendMessage(numberOrName, message) {
        if (!this.isConnected || !this.socket) {
            throw new Error('WhatsApp not connected. Run "connect whatsapp" first.');
        }

        let jid;
        let displayName;

        // Check if it looks like a phone number (starts with digits or +)
        const isNumber = /^\+?\d[\d\s-]{6,}$/.test(numberOrName.trim());

        if (isNumber) {
            const clean = numberOrName.replace(/[^0-9]/g, '');
            jid = `${clean}@s.whatsapp.net`;
            displayName = this.contacts[jid] || clean;
        } else {
            // Try to find by name
            const contact = this.findContactByName(numberOrName);
            if (!contact) {
                throw new Error(`Contact "${numberOrName}" not found. I only know contacts who have messaged you recently. Try using their phone number instead.`);
            }
            jid = contact.jid;
            displayName = contact.name;
        }

        await this.socket.sendMessage(jid, { text: message });
        return { to: displayName, number: this._formatNumber(jid), message, sentAt: new Date().toISOString() };
    }

    /**
     * Get recent messages (from the in-memory buffer).
     * @param {string} [fromNumber] - Optional filter by sender name or number
     * @param {number} [limit=10] - Number of messages to return
     */
    getRecentMessages(fromNumber, limit = 50) {
        let messages = this.messageStore;

        if (fromNumber) {
            const clean = fromNumber.replace(/[^0-9]/g, '');
            messages = messages.filter(m =>
                m.number.includes(clean) ||
                m.from.toLowerCase().includes(fromNumber.toLowerCase())
            );
        }

        return messages.slice(0, limit);
    }

    /** Get connection status. */
    getStatus() {
        return {
            connected: this.isConnected,
            messagesBuffered: this.messageStore.length,
            contactsCached: Object.keys(this.contacts).length,
            authExists: fs.existsSync(path.join(AUTH_DIR, 'creds.json'))
        };
    }

    /** Get all known contacts from cache. */
    getContacts() {
        const contacts = [];
        for (const [jid, name] of Object.entries(this.contacts)) {
            // Skip group JIDs and status broadcasts
            if (jid.includes('@g.us') || jid === 'status@broadcast') continue;
            const number = this._formatJid(jid);
            contacts.push({ name, number, jid });
        }
        // Sort alphabetically by name
        contacts.sort((a, b) => a.name.localeCompare(b.name));
        return contacts;
    }

    /** Disconnect from WhatsApp. */
    async disconnect() {
        if (this.socket) {
            this.socket.end();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

module.exports = new WhatsAppService();
