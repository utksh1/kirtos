const CHAT_PATTERNS = [
    {
        patterns: [/^(hi|hello|hey|howdy|yo|sup|hola|hii+)\b/i],
        response: 'Hey there! How can I help you?'
    },
    {
        patterns: [/^(good\s*(morning|afternoon|evening|night))/i],
        response: 'Good to see you! What can I do for you?'
    },
    {
        patterns: [/^(thanks|thank\s*you|thx|cheers|appreciate\s*it)/i],
        response: "You're welcome!"
    },
    {
        patterns: [/^(bye|goodbye|see\s*you|later|cya|peace\s*out)/i],
        response: 'See you later!'
    },
    {
        patterns: [/^(how\s*are\s*you|what'?s\s*up|wassup)/i],
        response: "I'm running smoothly. What can I help you with?"
    },
    {
        patterns: [/^(nice|cool|great|awesome|perfect|ok|okay|got\s*it|understood)/i],
        response: 'Got it! Let me know if you need anything else.'
    },
    {
        patterns: [/^(who\s*are\s*you|what\s*are\s*you|what'?s\s*your\s*name)/i],
        response: "I'm Kirtos, your local macOS AI agent."
    },
];


const COMMAND_RULES = [

    // Volume
    {
        priority: 10,
        category: 'volume',
        confidence: 0.95,
        patterns: [
            /^(?:set\s+)?volume\s+(?:to\s+)?(\d{1,3})/i,
            /^volume\s+(\d{1,3})/i,
        ],
        intent: 'system.volume.set',
        extract: (m) => ({ level: Math.min(parseInt(m[1]), 100) }),
        reasoning: (m) => `Setting volume to ${Math.min(parseInt(m[1]), 100)}.`
    },
    {
        priority: 10,
        category: 'volume',
        confidence: 0.90,
        patterns: [
            /^(turn\s+(?:the\s+)?volume\s+(?:up|higher|louder))/i,
            /^(increase\s+(?:the\s+)?volume)/i,
            /^(volume\s+up)/i,
        ],
        intent: 'system.volume.set',
        extract: () => ({ level: 70 }),
        reasoning: () => 'Turning the volume up.'
    },
    {
        priority: 10,
        category: 'volume',
        confidence: 0.90,
        patterns: [
            /^(turn\s+(?:the\s+)?volume\s+(?:down|lower|softer))/i,
            /^(decrease\s+(?:the\s+)?volume)/i,
            /^(volume\s+down)/i,
        ],
        intent: 'system.volume.set',
        extract: () => ({ level: 30 }),
        reasoning: () => 'Turning the volume down.'
    },
    {
        priority: 10,
        category: 'volume',
        confidence: 0.95,
        patterns: [/^(mute|mute\s+(?:the\s+)?(?:sound|volume|audio))$/i],
        intent: 'system.volume.mute',
        extract: () => ({ enabled: true }),
        reasoning: () => 'Muting the sound.'
    },
    {
        priority: 10,
        category: 'volume',
        confidence: 0.95,
        patterns: [/^(unmute|unmute\s+(?:the\s+)?(?:sound|volume|audio))$/i],
        intent: 'system.volume.mute',
        extract: () => ({ enabled: false }),
        reasoning: () => 'Unmuting the sound.'
    },

    // Brightness
    {
        priority: 10,
        category: 'brightness',
        confidence: 0.95,
        patterns: [
            /^(?:set\s+)?brightness\s+(?:to\s+)?(\d{1,3})/i,
            /^brightness\s+(\d{1,3})/i,
        ],
        intent: 'system.brightness.set',
        extract: (m) => ({ level: Math.min(parseInt(m[1]), 100) / 100 }),
        reasoning: (m) => `Setting brightness to ${m[1]}%.`
    },
    {
        priority: 9,
        category: 'brightness',
        confidence: 0.85,
        patterns: [
            /^(make\s+(?:the\s+)?screen\s+(?:brighter|more\s+bright))/i,
            /^(increase\s+(?:the\s+)?brightness)/i,
            /^(brighter)/i,
        ],
        intent: 'system.brightness.set',
        extract: () => ({ level: 0.8 }),
        reasoning: () => 'Making the screen brighter.'
    },
    {
        priority: 9,
        category: 'brightness',
        confidence: 0.85,
        patterns: [
            /^(make\s+(?:the\s+)?screen\s+(?:darker|dimmer|less\s+bright))/i,
            /^(decrease\s+(?:the\s+)?brightness)/i,
            /^(dimmer)/i,
        ],
        intent: 'system.brightness.set',
        extract: () => ({ level: 0.3 }),
        reasoning: () => 'Dimming the screen.'
    },

    // Timer
    {
        priority: 10,
        category: 'timer',
        confidence: 0.95,
        patterns: [
            /^(?:set\s+(?:a\s+)?)?timer\s+(?:for\s+)?(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i,
        ],
        intent: 'clock.timer.start',
        extract: (m) => {
            const val = parseInt(m[1]);
            const unit = m[2].toLowerCase();
            let seconds = val;
            if (unit.startsWith('min')) seconds = val * 60;
            else if (unit.startsWith('hour') || unit.startsWith('hr')) seconds = val * 3600;
            return { duration_seconds: seconds, label: 'Timer' };
        },
        reasoning: (m) => `Setting a timer for ${m[1]} ${m[2]}.`
    },

    // Alarm
    {
        priority: 10,
        category: 'alarm',
        confidence: 0.90,
        patterns: [
            /^(?:set\s+(?:an?\s+)?)?alarm\s+(?:for\s+|at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
        ],
        intent: 'clock.alarm.set',
        extract: (m) => ({ time: m[1].trim(), label: 'Kirtos Alarm' }),
        reasoning: (m) => `Setting an alarm for ${m[1].trim()}.`
    },

    // YouTube (higher priority than generic "play" to catch "play X on youtube" first)
    {
        priority: 8,
        category: 'youtube',
        confidence: 0.95,
        patterns: [/^play\s+(.+?)\s+(?:on\s+)?youtube$/i],
        intent: 'browser.play_youtube',
        extract: (m) => ({ query: m[1].trim() }),
        reasoning: (m) => `Playing "${m[1].trim()}" on YouTube.`
    },
    {
        priority: 7,
        category: 'youtube',
        confidence: 0.85,
        patterns: [/^play\s+(.+)/i],
        intent: 'browser.play_youtube',
        extract: (m) => ({ query: m[1].trim() }),
        reasoning: (m) => `Playing "${m[1].trim()}" on YouTube.`,
        guard: (m) => {
            const query = m[1].trim().toLowerCase();
            // Skip bare "music", "song", "songs", "tunes", "tracks" — those go to local media
            if (/^(music|a?\s*song|songs|tunes|tracks|some\s+(music|songs|tunes|tracks))$/i.test(query)) return false;
            if (/^local\s+/i.test(query)) return false;
            if (/music|song|beat|lofi|jazz|chill|mix|playlist|video|trailer/i.test(query)) return true;
            return query.split(/\s+/).length <= 5;
        }
    },

    // App launching (lower priority so youtube rules win on "play X")
    {
        priority: 6,
        category: 'app',
        confidence: 0.90,
        patterns: [/^(?:open|launch|start)\s+(.+)/i],
        intent: 'system.app.open',
        extract: (m) => ({ app: m[1].trim() }),
        reasoning: (m) => `Opening ${m[1].trim()}.`,
        guard: (m) => {
            const target = m[1].trim().toLowerCase();
            if (target.includes('http') || target.includes('www.') || target.includes('.com')) return false;
            if (target.split(/\s+/).length > 3) return false;
            if (/youtube|and\s+/i.test(target)) return false;
            return true;
        }
    },

    // System queries
    {
        priority: 10,
        category: 'system',
        confidence: 0.95,
        patterns: [
            /^(?:what(?:'s|\s+is)\s+the\s+)?(?:current\s+)?time/i,
            /^what\s+time\s+is\s+it/i,
        ],
        intent: 'query.time',
        extract: () => ({}),
        reasoning: () => 'Checking the time.'
    },
    {
        priority: 10,
        category: 'system',
        confidence: 0.95,
        patterns: [
            /^(?:system\s+)?status$/i,
            /^(?:what(?:'s|\s+is)\s+the\s+)?system\s+status/i,
        ],
        intent: 'system.status',
        extract: () => ({}),
        reasoning: () => 'Checking system status.'
    },
    {
        priority: 10,
        category: 'system',
        confidence: 0.95,
        patterns: [/^(?:what(?:'s|\s+is)\s+the\s+)?(?:system\s+)?uptime/i],
        intent: 'system.uptime',
        extract: () => ({}),
        reasoning: () => 'Checking system uptime.'
    },

    // Focus / DND
    {
        priority: 10,
        category: 'focus',
        confidence: 0.95,
        patterns: [/^(?:enable|turn\s+on)\s+(?:do\s+not\s+disturb|dnd|focus(?:\s+mode)?)/i],
        intent: 'system.focus.set',
        extract: () => ({ mode: 'Do Not Disturb', enabled: true }),
        reasoning: () => 'Enabling Do Not Disturb.'
    },
    {
        priority: 10,
        category: 'focus',
        confidence: 0.95,
        patterns: [/^(?:disable|turn\s+off)\s+(?:do\s+not\s+disturb|dnd|focus(?:\s+mode)?)/i],
        intent: 'system.focus.set',
        extract: () => ({ mode: 'Do Not Disturb', enabled: false }),
        reasoning: () => 'Disabling Do Not Disturb.'
    },

    // Screen capture
    {
        priority: 10,
        category: 'screen',
        confidence: 0.95,
        patterns: [
            /^(?:what(?:'s|\s+is)\s+on\s+(?:my\s+)?screen)/i,
            /^take\s+(?:a\s+)?screenshot/i,
            /^capture\s+(?:my\s+)?screen/i,
        ],
        intent: 'screen.capture',
        extract: () => ({}),
        reasoning: () => 'Capturing the screen.'
    },

    // Typing
    {
        priority: 9,
        category: 'typing',
        confidence: 0.95,
        patterns: [/^type\s+(.+)/i],
        intent: 'computer.type',
        extract: (m) => ({ text: m[1].trim() }),
        reasoning: (m) => `Typing "${m[1].trim()}".`
    },

    // Notifications
    {
        priority: 8,
        category: 'notification',
        confidence: 0.90,
        patterns: [/^(?:show\s+(?:a\s+)?notification|notify(?:\s+me)?)\s*[:\-]?\s*(.+)/i],
        intent: 'system.notification.show',
        extract: (m) => ({ title: 'Kirtos', message: m[1].trim() }),
        reasoning: (m) => `Showing notification: "${m[1].trim()}".`
    },

    // Docker
    {
        priority: 9,
        category: 'docker',
        confidence: 0.95,
        patterns: [
            /^(?:list|show)\s+(?:all\s+)?(?:docker\s+)?containers$/i,
            /^docker\s+(?:container\s+)?list$/i,
        ],
        intent: 'docker.list',
        extract: () => ({}),
        reasoning: () => 'Listing Docker containers.'
    },

    // Knowledge / Wikipedia
    {
        priority: 8,
        category: 'knowledge',
        confidence: 0.95,
        patterns: [
            /^(?:search|look\s*up|find)\s+(?:on\s+)?wikipedia\s+(?:for\s+)?(.+)/i,
            /^wikipedia\s+(.+)/i,
            /^(?:who|what)\s+(?:is|are|was|were)\s+(.+)/i,
        ],
        intent: 'knowledge.search',
        extract: (m) => ({ query: m[1].trim().replace(/[?.]$/, '') }),
        reasoning: (m) => `Searching Wikipedia for "${m[1].trim()}".`,
        guard: (m) => {
            const q = m[1].trim().toLowerCase();
            // Don't capture "what is the time" or system queries
            if (/\b(time|date|status|uptime|your\s+name)\b/.test(q)) return false;
            return q.split(/\s+/).length <= 8;
        }
    },
    {
        priority: 7,
        category: 'knowledge',
        confidence: 0.85,
        patterns: [
            /^tell\s+me\s+about\s+(.+)/i,
            /^(?:define|explain)\s+(.+)/i,
        ],
        intent: 'knowledge.search',
        extract: (m) => ({ query: m[1].trim().replace(/[?.]$/, '') }),
        reasoning: (m) => `Looking up "${m[1].trim()}" on Wikipedia.`,
        guard: (m) => m[1].trim().split(/\s+/).length <= 6
    },

    // Jokes
    {
        priority: 9,
        category: 'fun',
        confidence: 0.95,
        patterns: [
            /^tell\s+me\s+a\s+joke/i,
            /^(?:say\s+)?(?:a\s+)?joke(?:\s+please)?/i,
            /^make\s+me\s+laugh/i,
            /^(?:got\s+)?(?:any\s+)?jokes/i,
        ],
        intent: 'fun.joke',
        extract: () => ({ category: 'Programming' }),
        reasoning: () => 'Here comes a joke!'
    },

    // Greeting
    {
        priority: 8,
        category: 'greeting',
        confidence: 0.90,
        patterns: [
            /^greet\s*(?:me)?$/i,
            /^(?:say\s+)?(?:good\s*)?(?:morning|afternoon|evening|night)$/i,
        ],
        intent: 'query.greet',
        extract: () => ({}),
        reasoning: () => 'Greeting you!'
    },

    // Local Music (higher priority than generic YouTube "play" catch-all)
    {
        priority: 9,
        category: 'media',
        confidence: 0.90,
        patterns: [
            /^play\s+(?:local\s+)?music(?:\s+(.+))?$/i,
            /^play\s+(?:a\s+)?song(?:\s+(.+))?$/i,
            /^play\s+(?:some\s+)?(?:local\s+)?(?:songs|tracks|tunes)$/i,
        ],
        intent: 'media.play_music',
        extract: (m) => ({ query: m[1] ? m[1].trim() : '' }),
        reasoning: (m) => m[1] ? `Playing "${m[1].trim()}" from local music.` : 'Playing a random song from your Music folder.',
    },

    // WhatsApp
    {
        priority: 10,
        category: 'whatsapp',
        confidence: 0.95,
        patterns: [
            /^connect\s+(?:to\s+)?whatsapp/i,
            /^(?:start|setup|set\s*up)\s+whatsapp/i,
            /^whatsapp\s+connect/i,
        ],
        intent: 'whatsapp.connect',
        extract: () => ({}),
        reasoning: () => 'Connecting to WhatsApp...'
    },
    {
        priority: 10,
        category: 'whatsapp',
        confidence: 0.95,
        patterns: [
            /^(?:send|write)\s+(?:a\s+)?(?:whatsapp|wa)\s+(?:message\s+)?(?:to\s+)?(\+?\d[\d\s-]{7,})\s*[:\-]?\s*(.+)/i,
            /^(?:whatsapp|wa)\s+(\+?\d[\d\s-]{7,})\s*[:\-]?\s*(.+)/i,
            /^(?:message|text|msg)\s+(\+?\d[\d\s-]{7,})\s+(?:on\s+)?(?:whatsapp|wa)\s*[:\-]?\s*(.+)/i,
        ],
        intent: 'whatsapp.send',
        extract: (m) => ({
            number: m[1].replace(/[\s-]/g, ''),
            message: m[2].trim()
        }),
        reasoning: (m) => `Sending WhatsApp message to ${m[1].trim()}.`
    },
    {
        priority: 9,
        category: 'whatsapp',
        confidence: 0.90,
        patterns: [
            /^(?:send|write)\s+(?:a\s+)?(?:m[ae]ss?age?|msg)\s+(?:to\s+)?(\w[\w\s]*?)\s+(?:on\s+)?(?:whatsapp|wa)\s+(?:that\s+|saying\s+)?(.+)/i,
            /^(?:send|write)\s+(?:a\s+)?(?:whatsapp|wa)\s+(?:m[ae]ss?age?|msg)\s+(?:to\s+)?(\w[\w\s]*?)\s+(?:that\s+|saying\s+)?(.+)/i,
            /^(?:send|write)\s+(?:a\s+)?(?:to\s+)?(\w[\w\s]*?)\s+(?:on\s+)?(?:whatsapp|wa)\s+(?:that\s+|saying\s+)?(.+)/i,
            /^(?:whatsapp|wa)\s+(\w[\w\s]*?)\s+(?:that\s+|saying\s+)?(.+)/i,
        ],
        intent: 'whatsapp.send',
        extract: (m) => ({
            number: m[1].trim(),
            message: m[2].trim()
        }),
        reasoning: (m) => `Sending WhatsApp message to ${m[1].trim()}.`,
        guard: (m) => {
            const name = m[1].trim().toLowerCase();
            // Avoid matching keywords that are other intents
            if (/^(status|me?ssa?ge?|connect|disconnect)$/i.test(name)) return false;
            return m[2].trim().length > 0;
        }
    },
    {
        priority: 9,
        category: 'whatsapp',
        confidence: 0.90,
        patterns: [
            /^(?:read|check|show|get)\s+(?:my\s+)?(?:recent\s+|latest\s+|last\s+|unread\s+)?(?:whatsapp|wa)\s+(?:messages?|chats?)/i,
            /^(?:whatsapp|wa)\s+(?:messages?|inbox)/i,
            /^(?:any\s+)?(?:new\s+|recent\s+)?(?:whatsapp|wa)\s+(?:messages?)/i,
        ],
        intent: 'whatsapp.read',
        extract: () => ({ limit: 10 }),
        reasoning: () => 'Reading recent WhatsApp messages.'
    },
    {
        priority: 8,
        category: 'whatsapp',
        confidence: 0.90,
        patterns: [
            /^(?:whatsapp|wa)\s+status/i,
            /^is\s+whatsapp\s+(?:connected|running|on)/i,
        ],
        intent: 'whatsapp.status',
        extract: () => ({}),
        reasoning: () => 'Checking WhatsApp connection status.'
    },
    {
        priority: 8,
        category: 'whatsapp',
        confidence: 0.95,
        patterns: [
            /^disconnect\s+(?:from\s+)?whatsapp/i,
            /^(?:stop|close)\s+whatsapp/i,
        ],
        intent: 'whatsapp.disconnect',
        extract: () => ({}),
        reasoning: () => 'Disconnecting from WhatsApp.'
    },

    // Help
    {
        priority: 5,
        category: 'help',
        confidence: 0.90,
        patterns: [/^(?:help|what\s+can\s+you\s+do|commands|capabilities)/i],
        intent: 'query.help',
        extract: () => ({}),
        reasoning: () => "Here's what I can help you with."
    },
];

// Sort by priority so higher-priority rules are checked first
COMMAND_RULES.sort((a, b) => b.priority - a.priority);


function fastClassify(text) {
    if (!text || typeof text !== 'string') return null;

    const trimmed = text.trim();
    if (!trimmed) return null;

    // Check chat patterns first
    for (const chatRule of CHAT_PATTERNS) {
        for (const pattern of chatRule.patterns) {
            if (pattern.test(trimmed)) {
                return {
                    intent: 'chat.message',
                    action: 'chat.message',
                    params: { text: trimmed },
                    category: 'chat',
                    confidence: 0.95,
                    reasoning: chatRule.response,
                    source: 'fast'
                };
            }
        }
    }

    // Strip conversational prefixes so "can you read whatsapp messages"
    // becomes "read whatsapp messages" for pattern matching
    const stripped = trimmed
        .replace(/^(?:can\s+you|could\s+you|would\s+you|will\s+you|please)\s+/i, '')
        .replace(/\s*(?:please|for\s+me)\s*[?.]?\s*$/i, '')
        // Normalize common WhatsApp misspellings
        .replace(/\bwh?ats?a?pp?\b/gi, 'whatsapp')
        .trim();

    // Try matching with both original and stripped versions
    const candidates = [trimmed];
    if (stripped !== trimmed) candidates.push(stripped);

    // Check command rules (highest priority first)
    for (const rule of COMMAND_RULES) {
        for (const candidate of candidates) {
            for (const pattern of rule.patterns) {
                const match = candidate.match(pattern);
                if (match) {
                    if (rule.guard && !rule.guard(match)) continue;

                    return {
                        intent: rule.intent,
                        action: rule.intent,
                        params: rule.extract(match),
                        category: rule.category,
                        confidence: rule.confidence,
                        reasoning: rule.reasoning(match),
                        source: 'fast'
                    };
                }
            }
        }
    }

    return null;
}

module.exports = { fastClassify };
