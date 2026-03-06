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
      case 'whatsapp.contacts':
        return this._listContacts();
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
      message: status.connected ?
      'WhatsApp is connected and running.' :
      status.authExists ?
      'WhatsApp is not connected but has saved credentials. Say "connect whatsapp" to reconnect.' :
      'WhatsApp is not set up. Say "connect whatsapp" to start and scan the QR code.'
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
        hint: err.message.includes('not connected') ?
        'Say "connect whatsapp" first.' :
        err.message.includes('not found') ?
        'That contact hasn\'t messaged you recently. Try using their phone number with country code (e.g., 919876543210).' :
        'Make sure the phone number includes the country code (e.g., 919876543210).'
      };
    }
  }

  _read(number, limit = 50) {
    const messages = whatsapp.getRecentMessages(number, limit);

    if (messages.length === 0) {
      return {
        status: 'success',
        message: number ?
        `No recent messages from ${number}.` :
        'No recent messages received yet.',
        messages: []
      };
    }



    const byContact = new Map();
    for (const m of messages) {
      if (!byContact.has(m.from)) {
        byContact.set(m.from, m.text);
      }
    }

    const contactList = [...byContact.entries()].map(([name, lastMsg], i) =>
    `${i + 1}. ${name}: ${lastMsg}`
    ).join('\n');

    return {
      status: 'success',
      count: messages.length,
      uniqueContacts: byContact.size,
      summary: `You have ${messages.length} recent messages from ${byContact.size} contacts:\n${contactList}`,
      messages: messages.map((m) => ({
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

  _listContacts() {
    const contacts = whatsapp.getContacts();

    if (contacts.length === 0) {
      return {
        status: 'success',
        message: 'No contacts found yet. Contacts are learned from incoming messages — try reading your messages first.',
        contacts: []
      };
    }

    const contactList = contacts.map((c, i) =>
    `${i + 1}. ${c.name} (${c.number})`
    ).join('\n');

    return {
      status: 'success',
      count: contacts.length,
      summary: `You have ${contacts.length} WhatsApp contacts:\n${contactList}`,
      contacts
    };
  }
}

module.exports = new WhatsAppExecutor();