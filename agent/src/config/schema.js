const { z } = require('zod');

/**
 * Strict Configuration Schema
 */
const ConfigSchema = z.object({
    // Privacy
    PRIVACY_MODE: z.enum(['strict', 'normal', 'debug']).default('normal'),

    // DigitalOcean Intelligence Agent (Optional but pair-required)
    DO_AGENT_URL: z.string().url("DO_AGENT_URL must be a valid URL (e.g., https://your-agent.ondigitalocean.app)").optional(),
    DO_AGENT_KEY: z.string().min(1, "DO_AGENT_KEY cannot be empty").optional(),

    // LLM Fallback (OpenRouter/OpenAI)
    OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY cannot be empty").optional(),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY cannot be empty").optional(),
    OPENAI_BASE_URL: z.string().url("OPENAI_BASE_URL must be a valid URL").optional(),

    // Model
    INTENT_MODEL: z.string().min(1, "INTENT_MODEL must be specified").default('google/gemini-2.0-flash-lite-preview-02-05:free'),

    // Server
    PORT: z.string().default('3001').transform(v => parseInt(v)),
}).refine(data => {
    // If DO_AGENT_URL is provided, DO_AGENT_KEY must be provided
    if (data.DO_AGENT_URL && !data.DO_AGENT_KEY) return false;
    return true;
}, {
    message: "DO_AGENT_KEY is required when DO_AGENT_URL is set",
    path: ["DO_AGENT_KEY"]
}).refine(data => {
    // Must have at least one fallback or the DO Agent
    const hasDoAgent = !!(data.DO_AGENT_URL && data.DO_AGENT_KEY);
    const hasFallback = !!(data.OPENROUTER_API_KEY || data.OPENAI_API_KEY);
    return hasDoAgent || hasFallback;
}, {
    message: "Connection failed: No intelligence provider configured. Set DO_AGENT_KEY or OPENROUTER_API_KEY in .env",
    path: ["OPENAI_API_KEY"]
});

module.exports = { ConfigSchema };
