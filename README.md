# Kirtos 🤖

A local-first, voice-driven AI assistant for macOS — think Jarvis for your desktop.

Kirtos listens to your voice, understands intent, and executes actions on your machine — all without sending your data to the cloud (except for LLM calls).

## ✨ Features

- **🎤 Voice Control** — Talk naturally via LiveKit + Deepgram STT
- **🧠 Intent Classification** — Fast regex classifier + LLM fallback (OpenRouter)
- **🔊 Natural TTS** — Premium voice responses via Cartesia
- **💬 WhatsApp Integration** — Send/read messages by contact name via Baileys
- **🌐 Browser Control** — Search, play YouTube, open websites
- **💻 System Control** — Volume, brightness, apps, Do Not Disturb, notifications
- **📱 iMessage** — Send messages to contacts via macOS
- **🎵 Music** — Play local music files
- **📚 Knowledge** — Wikipedia search
- **😄 Fun** — Jokes on demand

## 📁 Project Structure

```
kirtos/
├── agent/          # Node.js backend — intent parsing, executors, services
│   ├── src/
│   │   ├── executor/   # Intent handlers (system, browser, whatsapp, etc.)
│   │   ├── services/   # Core services (STT, TTS, classifier, WhatsApp)
│   │   └── policy/     # Security engine, intent definitions, permissions
│   └── .env.example    # ← Copy to .env and fill in your API keys
├── app/            # React + Vite frontend — voice UI with WebGL orb
├── docs/           # Architecture documentation
├── start.sh        # Start both agent + app
└── .env.template   # Root env template
```

## 🚀 Quick Start

### Prerequisites

- **macOS** (required — uses native AppleScript for system control)
- **Node.js** 18+
- API keys for: [LiveKit](https://livekit.io), [Deepgram](https://deepgram.com), [OpenRouter](https://openrouter.ai), [Cartesia](https://cartesia.ai)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/techieujjwal/community-dashboard.git kirtos
cd kirtos

# 2. Install dependencies
npm run install:all

# 3. Set up environment variables
cp agent/.env.example agent/.env
# Edit agent/.env with your API keys

# 4. Start the app
bash start.sh
```

The agent runs on `http://localhost:3001` and the UI opens at `http://localhost:5173`.

### WhatsApp Setup (Optional)

1. Start the agent
2. Say **"connect whatsapp"**
3. Scan the QR code in the terminal with your phone
4. You can now send/read messages by voice!

## 🗣️ Example Commands

| Command | What it does |
|---|---|
| "What is JavaScript?" | Wikipedia search |
| "Play lofi beats on YouTube" | Opens YouTube with the video |
| "Set brightness to 50%" | Adjusts screen brightness |
| "Send whatsapp to Utkarsh hi" | Sends WhatsApp message |
| "Read my whatsapp messages" | Reads recent messages |
| "Tell me a joke" | Fetches a random joke |
| "Open Terminal" | Launches an app |
| "Play music" | Plays local music |
| "Enable Do Not Disturb" | Toggles Focus mode |

## 🔐 Security

- All API keys are stored in `agent/.env` (never committed)
- WhatsApp session credentials in `.whatsapp-auth/` (gitignored)
- Intent execution uses a policy engine with role-based permissions
- Sensitive actions (WhatsApp send, shell exec) require confirmation

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Voice Transport | LiveKit WebRTC |
| Speech-to-Text | Deepgram |
| Text-to-Speech | Cartesia |
| Intent Parsing | Fast regex + OpenRouter LLM |
| WhatsApp | Baileys (no Docker needed) |
| Frontend | React + Vite + WebGL |
| Backend | Node.js + Fastify + WebSocket |

## 📄 License

ISC
