# Kirtos: The Local-First System Intelligence
## 🛡️ Project Manifesto & Architecture V2

**Kirtos** is a high-performance, local-first system agent designed for the macOS ecosystem. It bridges the gap between natural language interaction and deterministic OS control, operating under the principle of **"Power with Restraint."**

---

### 1. Vision: The "Jarvis" Reality
Unlike standard chatbots that live in a window, Kirtos lives in your system. It listens to your voice, understands your intent, and interacts with your local environment—Safely.

*   **Identity:** A Professional-grade Local Control Plane.
*   **Philosophy:** **Deterministic Execution > AI Creativity.**
*   **Security Invariant:** AI is an *interpreter* (untrusted), Code is the *gatekeeper* (trusted).

---

### 2. The Core Flywheel (How It Works)

Kirtos operates through a tightly coupled 4-layer stack:

#### 🟢 Layer 1: Perception (LiveKit + Deepgram)
Captures raw audio from the macOS environment and streams it to the agent with sub-50ms latency.

#### 🟡 Layer 2: Intelligence (The Hybrid Classifier)
1.  **Regex Fast-Path:** Instant mapping for commands like "mute".
2.  **LLM Intent-Array:** For complex queries ("Send this to Mom and then open Safari"), the LLM generates a **Structured Plan** (an array of JSON intents).

#### 🔴 Layer 3: The Policy Gatekeeper (PolicyEngine)
Every intent in the plan is matched against a hard-coded **Allowlist**.
*   **Parameter Verification:** Using Zod schemas to ensure phone numbers are numbers and levels are within range.
*   **Risk Escalation:** High-risk actions (Shell, WhatsApp) trigger an mandatory **Human-in-the-Loop** confirmation state.

#### � Layer 4: Execution (Executors)
Safe, atomic actions executed via AppleScript, Node.js, and Sandboxed Shell.

---

### 3. Evolutionary Upgrade: Atomic Multi-Step Execution
We are moving beyond "one command at a time." V2 introduces **Sequential Transactional Intent Queues**.

*   **The Chain:** [Action A] ➡️ [Action B] ➡️ [Action C]
*   **Safety Rule:** If Action A requires confirmation, the entire chain pauses. If Action B fails, Action C is automatically aborted.
*   **State Awareness:** Memory is used to resolve pronouns ("it", "him", "that") across the chain.

---

### 4. Technical DNA (Premium Stack)
| Layer | Tech | Metric |
| :--- | :--- | :--- |
| **I/O Transport** | LiveKit WebRTC | < 50ms Processing |
| **Transcription** | Deepgram Nova-2 | 99% Accuracy |
| **Logic Parser** | OpenRouter (Gemini/LLaMA) | Context Window: 128k |
| **Voice Persona** | Cartesia Sonic | 120ms TTS Latency |
| **Native Bridge** | AppleScript / JXA | Zero-Install macOS Control |
| **Persistence** | Supabase (PostgreSQL) | Cross-Session Continuity |

---

### 5. Implementation Roadmap (Status: Beta)

#### ✅ DONE
*   **Real-time Audio:** Bi-directional voice with VAD (Voice Activity Detection).
*   **System Mastery:** Control over Volume, Brightness, DND, and App Launching.
*   **Messaging:** Fully functional WhatsApp integration (Send/Read/Contacts).
*   **Visual Persona:** WebGL-based Dynamic Orb for status feedback.

#### 🛠️ IN PROGRESS (V2 Hardening)
*   **Plan Segments:** Transitioning NLP to return arrays of intents.
*   **Strict Confirmation:** Moving from "Warning logs" to "UI-Blocking Approval Gates."
*   **Contextual Awareness:** Enhanced memory for resolving cross-command dependencies.

---

## 🔐 The Security Invariants
1.  **No Blind Execution:** No LLM-generated code ever runs without a Policy check.
2.  **Local-First:** All system actions are performed locally; only text/audio is sent for AI processing.
3.  **Explicit Consent:** High-risk intents default to "Deny" without a recorded user confirmation.

---
*Created by Antigravity for the Kirtos Project. 🤖*
