const whatsapp = require('../services/whatsapp');

class WhatsAppExecutor {
    async execute(intent, params) {
        switch (intent) {
            case 'whatsapp.connect':
                return await this._connect();
            case 'whatsapp.status':
                return this._status();
            case 'whatsapp.send':
                return await this._send(params.number, params.message);
            case 'whatsapp.read':
                return this._read(params.number, params.limit);
            case 'whatsapp.disconnect':
                return await this._disconnect();
            default:
                throw new Error(`WhatsAppExecutor: Unsupported intent "${intent}"`);
        }
    }

    async _connect() {
        try {
            await whatsapp.connect();
            const status = whatsapp.getStatus();

            if (status.connected) {
                return {
                    status: 'success',
                    message: 'WhatsApp is connected and ready!',
                    details: status
                };
            }

            return {
                status: 'success',
                message: 'WhatsApp is connecting... Check the terminal for the QR code to scan.',
                details: status
            };
        } catch (err) {
            return {
                status: 'failed',
                error: `Failed to connect: ${err.message}`
            };
        }
    }

    _status() {
        const status = whatsapp.getStatus();
        return {
            status: 'success',
            connected: status.connected,
            messagesBuffered: status.messagesBuffered,
            authenticated: status.authExists,
            message: status.connected
                ? 'WhatsApp is connected and running.'
                : status.authExists
                    ? 'WhatsApp is not connected but has saved credentials. Say "connect whatsapp" to reconnect.'
                    : 'WhatsApp is not set up. Say "connect whatsapp" to start and scan the QR code.'
        };
    }

    async _send(number, message) {
        const recipient = number || '';
        if (!recipient) return { error: 'No recipient provided. Say a contact name or phone number (e.g., 919876543210).' };
        if (!message) return { error: 'No message provided.' };

        try {
            const result = await whatsapp.sendMessage(recipient, message);
            return {
                status: 'success',
                message: `Message sent to ${result.to}`,
                details: result
            };
        } catch (err) {
            return {
                status: 'failed',
                error: err.message,
                hint: err.message.includes('not connected')
                    ? 'Say "connect whatsapp" first.'
                    : err.message.includes('not found')
                        ? 'That contact hasn\'t messaged you recently. Try using their phone number with country code (e.g., 919876543210).'
                        : 'Make sure the phone number includes the country code (e.g., 919876543210).'
            };
        }
    }

    _read(number, limit = 10) {
        const messages = whatsapp.getRecentMessages(number, limit);

        if (messages.length === 0) {
            return {
                status: 'success',
                message: number
                    ? `No recent messages from ${number}.`
                    : 'No recent messages received yet.',
                messages: []
            };
        }

        // Build a human-readable summary for TTS
        const summary = messages.slice(0, 5).map((m, i) =>
            `${i + 1}. ${m.from}: ${m.text}`
        ).join('\n');

        return {
            status: 'success',
            count: messages.length,
            summary: `You have ${messages.length} recent message${messages.length > 1 ? 's' : ''}:\n${summary}`,
            messages: messages.map(m => ({
                from: m.from,
                number: m.number,
                text: m.text,
                type: m.type,
                time: m.timestamp
            }))
        };
    }

    async _disconnect() {
        await whatsapp.disconnect();
        return {
            status: 'success',
            message: 'WhatsApp disconnected.'
        };
    }
}

module.exports = new WhatsAppExecutor();
