const { createClient } = require('@deepgram/sdk');
require('dotenv').config();

class STTService {
    constructor() {
        const apiKey = process.env.DEEPGRAM_API_KEY;
        if (!apiKey) {
            console.error('DEEPGRAM_API_KEY not found in environment');
            this.client = null;
        } else {
            this.client = createClient(apiKey);
        }
    }

    /**
     * Transcribes an audio stream.
     * This is a stub for real-time transcription.
     */
    async transcribeStream(audioBuffer) {
        if (!this.client) return { error: 'STT Service not configured' };

        // Placeholder for Deepgram transcription logic
        // In Phase 3, we will use the live listen feature
        return { text: '[STT stub result]', confidence: 0.9 };
    }
}

module.exports = new STTService();
