const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
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
     * Transcribes an audio buffer using Deepgram.
     * Supports various audio formats and languages.
     */
    async transcribeStream(audioBuffer, options = {}) {
        if (!this.client) return { error: 'STT Service not configured' };

        try {
            const defaultOptions = {
                model: 'nova-2',
                language: 'en-US',
                smart_format: true,
                punctuate: true,
                filler_words: false
            };

            const config = { ...defaultOptions, ...options };

            // Transcribe audio buffer using Deepgram SDK v4 syntax (transcribeFile accepts a buffer)
            const { result, error } = await this.client.listen.prerecorded.transcribeFile(
                audioBuffer,
                {
                    model: config.model,
                    language: config.language,
                    smart_format: config.smart_format,
                    punctuate: config.punctuate,
                    filler_words: config.filler_words
                }
            );

            if (error) {
                throw error;
            }

            if (result.results && result.results.channels && result.results.channels.length > 0) {
                const transcript = result.results.channels[0].alternatives[0];
                return {
                    text: transcript.transcript,
                    confidence: transcript.confidence,
                    words: transcript.words || []
                };
            }

            return { error: 'No transcription available' };
        } catch (error) {
            console.error('Deepgram STT Error:', error);
            return { error: error.message };
        }
    }

    /**
     * Creates a live transcription connection (WebSocket) for real-time audio.
     */
    createLiveConnection(options = {}) {
        if (!this.client) throw new Error('STT Service not configured');

        const defaultOptions = {
            model: 'nova-2',
            language: 'en-US',
            smart_format: true,
            interim_results: true,
            utterance_end_ms: 1000,
            vad_events: true,
        };

        const config = { ...defaultOptions, ...options };
        return this.client.listen.live(config);
    }

    /**
     * Transcribes a local audio file.
     */
    async transcribeFile(filePath, options = {}) {
        const fs = require('fs');
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, async (err, data) => {
                if (err) {
                    reject({ error: err.message });
                } else {
                    const result = await this.transcribeStream(data, options);
                    resolve(result);
                }
            });
        });
    }

    /**
     * Returns supported language options for transcription.
     */
    getSupportedLanguages() {
        return [
            { code: 'en-US', name: 'English (US)' },
            { code: 'en-GB', name: 'English (UK)' },
            { code: 'hi-IN', name: 'Hindi' },
            { code: 'ta-IN', name: 'Tamil' },
            { code: 'te-IN', name: 'Telugu' },
            { code: 'bn-IN', name: 'Bengali' },
            { code: 'mr-IN', name: 'Marathi' },
            { code: 'gu-IN', name: 'Gujarati' },
            { code: 'kn-IN', name: 'Kannada' },
            { code: 'ml-IN', name: 'Malayalam' }
        ];
    }
}

module.exports = new STTService();
