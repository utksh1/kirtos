const { AccessToken } = require('livekit-server-sdk');
require('dotenv').config();

class LiveKitService {
    constructor() {
        this.apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
        this.apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
        this.url = process.env.LIVEKIT_URL || 'ws://localhost:7880';
    }

    /**
     * Generates a token for a client to join a room.
     */
    async generateToken(roomName, participantName) {
        const at = new AccessToken(this.apiKey, this.apiSecret, {
            identity: participantName,
        });
        at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
        return await at.toJwt();
    }

    // Future phase: Add background worker logic here to listen to the room
}

module.exports = new LiveKitService();
