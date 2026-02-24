const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class CommunicationExecutor {
    /**
     * Executes communication-related intents.
     * @param {string} intent - The intent name
     * @param {object} params - Parameters for the intent
     * @returns {Promise<object>} - The execution result
     */
    async execute(intent, params) {
        switch (intent) {
            case 'communication.send_message':
                return await this._sendMessage(params.recipient, params.message);
            default:
                throw new Error(`CommunicationExecutor: Unsupported intent "${intent}"`);
        }
    }

    async _sendMessage(recipient, message) {
        try {
            // AppleScript to send an iMessage
            // This is the most reliable way on macOS without third-party APIs
            const script = `
            tell application "Messages"
                set targetService to 1st service whose service type = iMessage
                set targetBuddy to buddy "${recipient}" of targetService
                send "${message}" to targetBuddy
            end tell
            `;

            const escapedScript = script.replace(/"/g, '\\"');
            await execPromise(`osascript -e "${escapedScript}"`);

            return {
                status: 'success',
                message: `Message sent to ${recipient} via iMessage.`,
                recipient: recipient,
                content: message
            };
        } catch (err) {
            // Fallback: If iMessage fails, maybe try to just open the app with the contact
            try {
                await execPromise(`open "imessage://${recipient}"`);
                return {
                    status: 'success',
                    message: `Couldn't send automatically, but I've opened Messages for ${recipient}.`,
                    partial: true
                };
            } catch (fallbackErr) {
                return {
                    status: 'failed',
                    error: `Failed to send message: ${err.message}`
                };
            }
        }
    }
}

module.exports = new CommunicationExecutor();
