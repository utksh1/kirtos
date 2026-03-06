const CHAT_PATTERNS = [
{
  patterns: [/^(hi+|hello+|hey+|howdy|yo+|sup+|hola|wassup|whats?up|kirtos|namaste|pranam|hii+)\b(?:\s+there)?\s*[?.]*$/i],
  response: 'Hey there! How can I help you?'
},
{
  patterns: [/^(wtf+|wow|lol+|omg|lmao|weird|amazing|cool|nice)\b\s*[!.]*$/i],
  response: 'Haha, yeah! Need anything else?'
},
{
  patterns: [/^(?:play\s+it|playit)\b\s*[!.]*$/i],
  response: 'Sure! Playing it now.'
},
{
  patterns: [/^(good\s*morning|good\s*afternoon|good\s*evening|good\s*night)\b\s*[?.]*$/i],
  response: 'Good to see you! What can I do for you?'
},
{
  patterns: [/^(thanks|thank\s*you|thx|cheers|appreciate\s*its?)\b\s*[?.]*$/i],
  response: "You're welcome!"
},
{
  patterns: [/^(bye|goodbye|see\s*you|later|cya|peace\s*out)\b\s*[?.]*$/i],
  response: 'See you later!'
},
{
  patterns: [/^(how\s*are\s*you(?:\s+doing|\s+today|\s+going)?|what'?s\s*up|wassup)\b\s*[?.]*$/i],
  response: "I'm running smoothly. What can I help you with?"
},
{
  patterns: [/^j(?:ai|ay)\s*(?:shri|shree|sri)\s*ram/i, /^jai\s*(?:mata\s*di|ho)/i, /^har\s*har\s*mahadev/i, /^radhe\s*radhe/i, /^ram\s*ram/i, /^namaste/i, /^pranam/i],
  response: '🙏 Jai Shree Ram! How can I help you today?'
},
{
  patterns: [/^(nice|cool|great|awesome|perfect|ok|okay|got\s*it|understood)/i],
  response: 'Got it! Let me know if you need anything else.'
},
{
  patterns: [/^(who\s*are\s*you|what\s*are\s*you|what'?s\s*your\s*name)/i],
  response: "I'm Kirtos, your local macOS AI agent."
}];



const COMMAND_RULES = [


{
  priority: 10,
  category: 'volume',
  confidence: 0.95,
  patterns: [
  /^(?:set\s+)?volume\s+(?:to\s+)?(\d{1,3})/i,
  /^volume\s+(\d{1,3})/i],

  intent: 'system.volume.set',
  extract: (m) => ({ level: Math.min(parseInt(m[1]), 100) }),
  reasoning: (m) => `Setting volume to ${Math.min(parseInt(m[1]), 100)}.`
},
{
  priority: 10,
  category: 'volume',
  confidence: 0.90,
  patterns: [
  /^(?:turn\s+(?:the\s+)?(?:volume|sound)\s+(?:up|higher|louder))/i,
  /^(?:turn\s+(?:up|higher|louder)\s+(?:the\s+)?(?:volume|sound))/i,
  /^(?:increase\s+(?:the\s+)?(?:volume|sound))/i,
  /^(?:volume|sound)\s+up/i,
  /^(?:make\s+(?:it|the\s+sound|the\s+volume)\s+louder)/i,
  /^(?:turn\s+(?:it|the\s+sound|the\s+volume)\s+up)/i],

  intent: 'system.volume.set',
  extract: () => ({ level: 70 }),
  reasoning: () => 'Turning the volume up.'
},
{
  priority: 10,
  category: 'volume',
  confidence: 0.90,
  patterns: [
  /^(?:turn\s+(?:the\s+)?(?:volume|sound)\s+(?:down|lower|softer))/i,
  /^(?:turn\s+(?:down|lower|softer)\s+(?:the\s+)?(?:volume|sound))/i,
  /^(?:decrease\s+(?:the\s+)?(?:volume|sound))/i,
  /^(?:volume|sound)\s+down/i,
  /^(?:make\s+(?:it|the\s+sound|the\s+volume)\s+softer)/i,
  /^(?:turn\s+(?:it|the\s+sound|the\s+volume)\s+down)/i],

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


{
  priority: 10,
  category: 'brightness',
  confidence: 0.95,
  patterns: [
  /^(?:set\s+)?brightness\s+(?:to\s+)?(\d{1,3})/i,
  /^brightness\s+(\d{1,3})/i],

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
  /^(brighter)/i],

  intent: 'system.brightness.set',
  extract: () => ({ level: 0.8 }),
  reasoning: () => 'Making the screen brighter.'
},
{
  priority: 9,
  category: 'brightness',
  confidence: 0.85,
  patterns: [
  /^(?:make\s+(?:the\s+)?screen\s+(?:darker|dimmer|less\s+bright))/i,
  /^(?:decrease\s+(?:the\s+)?brightness)/i,
  /^(?:dim|dimmer)(?:\s+the)?(?:\s+screen)?/i],

  intent: 'system.brightness.set',
  extract: () => ({ level: 0.3 }),
  reasoning: () => 'Dimming the screen.'
},


{
  priority: 10,
  category: 'timer',
  confidence: 0.95,
  patterns: [
  /^(?:set\s+(?:a\s+)?)?timer\s+(?:for\s+)?(\d+)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)/i],

  intent: 'clock.timer.start',
  extract: (m) => {
    const val = parseInt(m[1]);
    const unit = m[2].toLowerCase();
    let seconds = val;
    if (unit.startsWith('min')) seconds = val * 60;else
    if (unit.startsWith('hour') || unit.startsWith('hr')) seconds = val * 3600;
    return { duration_seconds: seconds, label: 'Timer' };
  },
  reasoning: (m) => `Setting a timer for ${m[1]} ${m[2]}.`
},


{
  priority: 10,
  category: 'alarm',
  confidence: 0.90,
  patterns: [
  /^(?:set\s+(?:an?\s+)?)?alarm\s+(?:for\s+|at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i],

  intent: 'clock.alarm.set',
  extract: (m) => ({ time: m[1].trim(), label: 'Kirtos Alarm' }),
  reasoning: (m) => `Setting an alarm for ${m[1].trim()}.`
},


{
  priority: 12,
  category: 'youtube',
  confidence: 0.95,
  patterns: [/^play\s+(.+?)\s+(?:on\s+)?youtube$/i],
  intent: 'browser.play_youtube',
  extract: (m) => ({ query: m[1].trim() }),
  reasoning: (m) => `Playing "${m[1].trim()}" on YouTube.`
},
{
  priority: 11,
  category: 'youtube',
  confidence: 0.85,
  patterns: [/^play\s+(.+)/i],
  intent: 'browser.play_youtube',
  extract: (m) => ({ query: m[1].trim() }),
  reasoning: (m) => `Playing "${m[1].trim()}" on YouTube.`,
  guard: (m) => {
    const query = m[1].trim().toLowerCase();

    if (/^(music|a?\s*song|songs|tunes|tracks|some\s+(music|songs|tunes|tracks))$/i.test(query)) return false;
    if (/^local\s+/i.test(query)) return false;
    if (/music|song|beat|lofi|jazz|chill|mix|playlist|video|trailer/i.test(query)) return true;
    return query.split(/\s+/).length <= 5;
  }
},


{
  priority: 6,
  category: 'app',
  confidence: 0.90,
  patterns: [/^(?:open|launch|start)\s+(.+)/i],
  intent: 'device.open_app',
  extract: (m) => ({ name: m[1].trim() }),
  reasoning: (m) => `Opening ${m[1].trim()}.`,
  guard: (m) => {
    const target = m[1].trim().toLowerCase();

    if (target.includes('.com') || target.includes('http')) return false;
    if (target.split(/\s+/).length > 3) return false;
    if (/youtube|and\s+/i.test(target)) return false;
    return true;
  }
},

{
  priority: 7,
  category: 'browser',
  confidence: 0.90,
  patterns: [
  /^(?:search\s+for\s+|search\s+|look\s+up\s+)(.+?)\s+(?:on|in|using)\s+(google|amazon|flipkart|youtube|github|wikipedia)/i,
  /^(?:search\s+for\s+|search\s+|look\s+up\s+)(.+)/i],

  intent: 'browser.search',
  extract: (m) => ({
    query: m[1].trim(),
    engine: m[2] ? m[2].toLowerCase() : 'google'
  }),
  reasoning: (m) => `Searching for "${m[1].trim()}" on ${m[2] || 'Google'}.`
},

{
  priority: 6.5,
  category: 'browser',
  confidence: 0.90,
  patterns: [
  /^(?:open|go\s+to|visit|browse\s+to)\s+(https?:\/\/\S+|www\.\S+|localhost:\d+|\S+\.(?:com|org|net|io|in|me|gov|edu|app|sh|dev)\S*)/i,
  /^(?:open|go\s+to|visit|browse\s+to)\s+(\S+\.(?:com|org|net|io|in|me|app|sh|dev))\b/i],

  intent: 'browser.open',
  extract: (m) => ({ url: m[1].startsWith('http') ? m[1] : `https://${m[1]}` }),
  reasoning: (m) => `Opening ${m[1]} in your browser.`
},


{
  priority: 11,
  category: 'media',
  confidence: 0.98,
  patterns: [
  /^(?:stop|kill|end|pause|hold|quit|close)(?:\s+(?:the|this|that))?\s+(?:music|song|video|playback|audio|it|that|youtube|spotify|browser|app|media|content)(?:\s+(?:in|on|at|from)\s+(?:youtube|spotify|browser|safari|chrome))?/i,
  /^stop\s+that(?:\s+now)?$/i,
  /^pause$/i,
  /^stop$/i],

  intent: 'media.stop',
  extract: () => ({}),
  reasoning: () => 'Stopping media playback.'
},
{
  priority: 10,
  category: 'media',
  confidence: 0.95,
  patterns: [
  /^(?:resume|continue|unpause)(?:\s+(?:the|this|that))?\s+(?:music|song|video|playback|audio|it|that|youtube|spotify|content|media)(?:\s+(?:in|on|at|from)\s+(?:youtube|spotify|browser|safari|chrome))?/i,
  /^(?:play|start)\s+(?:again|back)$/i,
  /^resume$/i],

  intent: 'media.resume',
  extract: () => ({}),
  reasoning: () => 'Resuming media playback.'
},
{
  priority: 8,
  category: 'media',
  confidence: 0.90,
  patterns: [
  /^(?:what|which)\s+(?:song|music|track)\s+is\s+playing/i,
  /^what's\s+playing/i],

  intent: 'media.list_music',
  extract: () => ({}),
  reasoning: () => 'Checking current music.'
},


{
  priority: 10,
  category: 'system',
  confidence: 0.95,
  patterns: [
  /^(?:what(?:'s|\s+is)\s+the\s+)?(?:current\s+)?time/i,
  /^what\s+time\s+is\s+it/i,
  /^(?:get|show|check)\s+(?:the\s+)?(?:clock|time)/i,
  /^(?:the\s+)?time\s*[?.]*$/i],

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
  /^(?:what(?:'s|\s+is)\s+the\s+)?system\s+status/i],

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


{
  priority: 10,
  category: 'screen',
  confidence: 0.95,
  patterns: [
  /^(?:what(?:'s|\s+is)\s+on\s+(?:my\s+)?screen)/i,
  /^take\s+(?:a\s+)?screenshot/i,
  /^capture\s+(?:my\s+)?screen/i],

  intent: 'screen.capture',
  extract: () => ({}),
  reasoning: () => 'Capturing the screen.'
},


{
  priority: 10,
  category: 'system',
  confidence: 0.99,
  patterns: [
  /^(?:who\s+are\s+you|what\s+is\s+your\s+name|your\s+name)(?:\s+please)?\??$/i,
  /^who\s+is\s+this\??$/i],

  intent: 'chat.message',
  extract: () => ({ text: 'I am Kirtos, your AI agent.' }),
  reasoning: () => 'Identifying myself.'
},



{
  priority: 9,
  category: 'typing',
  confidence: 0.95,
  patterns: [/^type\s+(.+)/i],
  intent: 'computer.type',
  extract: (m) => ({ text: m[1].trim() }),
  reasoning: (m) => `Typing "${m[1].trim()}".`
},


{
  priority: 8,
  category: 'notification',
  confidence: 0.90,
  patterns: [/^(?:show\s+(?:a\s+)?notification|notify(?:\s+me)?)\s*[:\-]?\s*(.+)/i],
  intent: 'system.notification.show',
  extract: (m) => ({ title: 'Kirtos', message: m[1].trim() }),
  reasoning: (m) => `Showing notification: "${m[1].trim()}".`
},


{
  priority: 9,
  category: 'docker',
  confidence: 0.95,
  patterns: [
  /^(?:list|show)\s+(?:all\s+)?(?:docker\s+)?containers$/i,
  /^docker\s+(?:container\s+)?list$/i],

  intent: 'docker.list',
  extract: () => ({}),
  reasoning: () => 'Listing Docker containers.'
},


{
  priority: 8,
  category: 'knowledge',
  confidence: 0.95,
  patterns: [
  /^(?:search|look\s*up|find)\s+(?:on\s+)?wikipedia\s+(?:for\s+)?(.+)/i,
  /^wikipedia\s+(.+)/i,
  /^(?:who|what)\s+(?:is|are|was|were)\s+(.+)/i],

  intent: 'knowledge.search',
  extract: (m) => ({ query: m[1].trim().replace(/[?.]$/, '') }),
  reasoning: (m) => `Searching Wikipedia for "${m[1].trim()}".`,
  guard: (m) => {
    const q = m[1].trim().toLowerCase();

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
  /^(?:define|explain)\s+(.+)/i],

  intent: 'knowledge.search',
  extract: (m) => ({ query: m[1].trim().replace(/[?.]$/, '') }),
  reasoning: (m) => `Looking up "${m[1].trim()}" on Wikipedia.`,
  guard: (m) => m[1].trim().split(/\s+/).length <= 6
},


{
  priority: 9,
  category: 'fun',
  confidence: 0.95,
  patterns: [
  /^tell\s+me\s+a\s+joke/i,
  /^(?:say\s+)?(?:a\s+)?joke(?:\s+please)?/i,
  /^make\s+me\s+laugh/i,
  /^(?:got\s+)?(?:any\s+)?jokes/i],

  intent: 'fun.joke',
  extract: () => ({ category: 'Programming' }),
  reasoning: () => 'Here comes a joke!'
},


{
  priority: 9,
  category: 'fun',
  confidence: 0.95,
  patterns: [
  /^(?:give\s+me\s+)?(?:a\s+)?(?:random\s+)?quote/i,
  /^(?:inspire|motivate)\s+me/i,
  /^(?:say\s+)?(?:something\s+)?(?:inspirational|motivational)/i],

  intent: 'fun.quote',
  extract: () => ({}),
  reasoning: () => 'Here\'s a quote for you!'
},


{
  priority: 9,
  category: 'fun',
  confidence: 0.95,
  patterns: [
  /^(?:tell\s+me\s+)?(?:a\s+)?(?:random\s+|fun\s+|interesting\s+)?fact/i,
  /^(?:random|fun|interesting)\s+fact/i,
  /^did\s+you\s+know/i],

  intent: 'fun.fact',
  extract: () => ({}),
  reasoning: () => 'Here\'s a fun fact!'
},


{
  priority: 9,
  category: 'weather',
  confidence: 0.95,
  patterns: [
  /^(?:what(?:'s|\s+is)\s+the\s+)?weather\s+(?:in\s+|for\s+|at\s+)?(.+)/i,
  /^(?:how(?:'s|\s+is)\s+the\s+)?weather\s+(?:in\s+|at\s+)?(.+)/i,
  /^(?:what(?:'s|\s+is)\s+the\s+)?temperature\s+(?:in\s+|at\s+)?(.+)/i,
  /^(?:how\s+(?:hot|cold)\s+is\s+it\s+in\s+)(.+)/i,
  /^(?:is\s+it\s+raining\s+in\s+)(.+)/i],

  intent: 'knowledge.weather',
  extract: (m) => ({ city: m[1].trim().replace(/[?.]$/, '') }),
  reasoning: (m) => `Checking weather for ${m[1].trim()}.`
},
{
  priority: 8,
  category: 'weather',
  confidence: 0.85,
  patterns: [
  /^(?:what(?:'s|\s+is)\s+the\s+)?weather$/i,
  /^(?:how(?:'s|\s+is)\s+the\s+)?weather$/i],

  intent: 'knowledge.weather',
  extract: () => ({ city: 'Delhi' }),
  reasoning: () => 'Checking weather for Delhi.'
},


{
  priority: 10,
  category: 'dictionary',
  confidence: 0.95,
  patterns: [
  /^define\s+(.+)/i,
  /^(?:what\s+does\s+)(.+?)(?:\s+mean)\??$/i,
  /^(?:what\s+is\s+the\s+)?meaning\s+of\s+(.+)/i,
  /^(?:what\s+is\s+the\s+)?definition\s+of\s+(.+)/i,
  /^(?:tell\s+me\s+about|explain|describe|lookup)\s+(.+)/i],


  intent: 'knowledge.define',
  extract: (m) => ({ word: (m[2] || m[1]).trim().replace(/[?.]$/, '') }),
  reasoning: (m) => `Looking up the definition of "${(m[2] || m[1]).trim()}".`,
  guard: (m) => (m[2] || m[1]).trim().split(/\s+/).length <= 4
},


{
  priority: 9,
  category: 'currency',
  confidence: 0.95,
  patterns: [
  /^convert\s+(\d+(?:\.\d+)?)\s+([a-z]{3})\s+(?:to|in(?:to)?)\s+([a-z]{3})/i,
  /^(\d+(?:\.\d+)?)\s+([a-z]{3})\s+(?:to|in)\s+([a-z]{3})/i],

  intent: 'knowledge.currency',
  extract: (m) => ({ amount: parseFloat(m[1]), from: m[2].toUpperCase(), to: m[3].toUpperCase() }),
  reasoning: (m) => `Converting ${m[1]} ${m[2].toUpperCase()} to ${m[3].toUpperCase()}.`
},
{
  priority: 8,
  category: 'currency',
  confidence: 0.90,
  patterns: [
  /^(\d+(?:\.\d+)?)\s+(?:dollars?|usd)\s+(?:to|in)\s+(?:rupees?|inr)/i,
  /^(\d+(?:\.\d+)?)\s+(?:rupees?|inr)\s+(?:to|in)\s+(?:dollars?|usd)/i],

  intent: 'knowledge.currency',
  extract: (m) => {
    const amt = parseFloat(m[1]);
    const text = m[0].toLowerCase();
    if (/dollars?|usd/.test(text.split(/to|in/)[0])) return { amount: amt, from: 'USD', to: 'INR' };
    return { amount: amt, from: 'INR', to: 'USD' };
  },
  reasoning: (m) => `Converting ${m[1]} currency.`
},


{
  priority: 8,
  category: 'greeting',
  confidence: 0.90,
  patterns: [
  /^greet\s*(?:me)?$/i],

  intent: 'query.greet',
  extract: () => ({}),
  reasoning: () => 'Greeting you!'
},


{
  priority: 9,
  category: 'media',
  confidence: 0.90,
  patterns: [
  /^play\s+(?:local\s+)?music(?:\s+(.+))?$/i,
  /^play\s+(?:a\s+)?song(?:\s+(.+))?$/i,
  /^play\s+(?:some\s+)?(?:local\s+)?(?:songs|tracks|tunes)$/i],

  intent: 'media.play_music',
  extract: (m) => ({ query: m[1] ? m[1].trim() : '' }),
  reasoning: (m) => m[1] ? `Playing "${m[1].trim()}" from local music.` : 'Playing a random song from your Music folder.'
},


{
  priority: 10,
  category: 'whatsapp',
  confidence: 0.95,
  patterns: [
  /^connect\s+(?:to\s+)?whatsapp/i,
  /^(?:start|setup|set\s*up)\s+whatsapp/i,
  /^whatsapp\s+connect/i],

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
  /^(?:message|text|msg)\s+(\+?\d[\d\s-]{7,})\s+(?:on\s+)?(?:whatsapp|wa)\s*[:\-]?\s*(.+)/i],

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
  /^(?:send|write)\s+(?:a\s+)?(?:whatsapp|wa)\s+(?:to\s+)?(\w[\w\s]*?)\s+(.+)/i,
  /^(?:whatsapp|wa|message|msg)\s+(?:to\s+)?(\w[\w\s]*?)\s+(?:that\s+|saying\s+)?(.+)/i],


  intent: 'whatsapp.send',
  extract: (m) => ({
    number: m[1].trim(),
    message: m[2].trim()
  }),
  reasoning: (m) => `Sending WhatsApp message to ${m[1].trim()}.`,
  guard: (m) => {
    const name = m[1].trim().toLowerCase();

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
  /^(?:any\s+)?(?:new\s+|recent\s+)?(?:whatsapp|wa)\s+(?:messages?)/i],

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
  /^is\s+whatsapp\s+(?:connected|running|on)/i],

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
  /^(?:stop|close)\s+whatsapp/i],

  intent: 'whatsapp.disconnect',
  extract: () => ({}),
  reasoning: () => 'Disconnecting from WhatsApp.'
},
{
  priority: 9,
  category: 'whatsapp',
  confidence: 0.90,
  patterns: [
  /^(?:list|show|get|read)\s+(?:all\s+)?(?:the\s+)?(?:my\s+)?(?:whatsapp|wa)\s+contacts?/i,
  /^(?:list|show|get|read)\s+(?:all\s+)?(?:the\s+)?(?:my\s+)?contacts?\s+(?:from|of|on|in)\s+(?:whatsapp|wa)/i],

  intent: 'whatsapp.contacts',
  extract: () => ({}),
  reasoning: () => 'Listing your WhatsApp contacts.'
},


{
  priority: 5,
  category: 'help',
  confidence: 0.90,
  patterns: [/^(?:help|what\s+can\s+you\s+do|commands|capabilities)/i],
  intent: 'query.help',
  extract: () => ({}),
  reasoning: () => "Here's what I can help you with."
},


{
  priority: 9,
  category: 'knowledge',
  confidence: 0.95,
  patterns: [
  /^(?:calculate|solve|what\s+is|how\s+much\s+is)\s+([\d\s\+\-\*\/\(\)\^\.x]+)(?:\s+=\s*)?$/i,
  /^([\d\s\+\-\*\/\(\)\^\.x]+)\s+=\s*$/i],

  intent: 'knowledge.math',
  extract: (m) => ({ expression: m[1].trim() }),
  reasoning: (m) => `Calculating ${m[1].trim()}.`
},


{
  priority: 10,
  category: 'system',
  confidence: 0.95,
  patterns: [
  /^(?:what\s+is\s+the\s+)?battery\s+(?:level|status|percentage)/i,
  /^check\s+battery/i,
  /^how\s+much\s+battery(?:\s+is\s+left)?/i],

  intent: 'system.battery',
  extract: () => ({}),
  reasoning: () => 'Checking battery status.'
},


{
  priority: 10,
  category: 'system',
  confidence: 0.95,
  patterns: [
  /^(?:what\s+is\s+the\s+)?time$/i,
  /^current\s+time$/i,
  /^time\s+now$/i],

  intent: 'query.time',
  extract: () => ({}),
  reasoning: () => 'Checking the time.'
}];



COMMAND_RULES.sort((a, b) => b.priority - a.priority);


function fastClassify(text) {
  if (!text || typeof text !== 'string') return null;

  const textLower = text.toLowerCase();
  const trimmed = textLower.trim();
  if (!trimmed) return null;


  const PREFIXES = /^(?:hey|hi|yo|hello|kirtos|agent|kirtos\s+agent|can\s+you|could\s+you|would\s+you|will\s+you|please|quickly|just|i\s+want\s+to|i\s+need\s+to|somebody|someone)\s+/i;
  const SUFFIXES = /\s*(?:please|for\s+me|asap|at\s+once|immediately|right\s+now|quickly|thanks|if\s+you\s+can|right\s+away|now)\s*[?.]*$/i;

  let stripped = trimmed;
  let lastStripped;
  do {
    lastStripped = stripped;
    stripped = stripped.replace(PREFIXES, '').replace(SUFFIXES, '').trim();
  } while (stripped !== lastStripped && stripped.length > 0);


  stripped = stripped.replace(/\bwh?ats?a?pp?\b/gi, 'whatsapp');



  const candidates = [trimmed];
  if (stripped && stripped !== trimmed) candidates.push(stripped);


  for (const rule of COMMAND_RULES) {
    for (const candidate of candidates) {
      for (const pattern of rule.patterns) {
        const match = candidate.match(pattern);
        if (match) {
          if (rule.guard && !rule.guard(match)) continue;

          console.log(`[FastClassifier] Rule matched: ${rule.intent} (${rule.category}) | Reasoning: "${rule.reasoning(match)}"`);
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


  for (const chatRule of CHAT_PATTERNS) {
    for (const pattern of chatRule.patterns) {
      if (pattern.test(trimmed)) {
        console.log(`[FastClassifier] Chat matched: "${trimmed}" -> "${chatRule.response}"`);
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

  return null;
}

module.exports = { fastClassify };