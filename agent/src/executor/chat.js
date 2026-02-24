class ChatExecutor {
    /**
     * Handles conversational responses.
     */
    async execute(intent, params) {
        // Chat executor usually just mirrors or provides a fallback response.
        // The reasoning from IntelligenceService will be shown in the UI.
        return {
            status: 'success',
            // Return null message so intelligenceService uses the reasoning instead
            message: null,
            type: 'chat'
        };
    }
}

module.exports = new ChatExecutor();
