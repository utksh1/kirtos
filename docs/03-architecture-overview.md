# docs/03-architecture-overview.md

## Purpose

This document provides a **high-level architectural overview** of the system.

It explains:
- The major components
- Their responsibilities
- How data flows through the system
- Where trust boundaries exist

This is a **conceptual architecture**, not an implementation guide.

---

## High-Level System Overview

The system is composed of two primary layers:

1. **Desktop Application (UI Layer)**
2. **Local Agent (Control Layer)**

These layers communicate through a well-defined interface and are intentionally decoupled.

┌────────────────────┐
│ macOS App (UI) │
│ Voice + Chat UI │
└─────────┬──────────┘
│
▼
┌────────────────────┐
│ Local AI Agent │
│ Policy + Executor │
└─────────┬──────────┘
│
▼
┌────────────────────┐
│ System / Docker │
│ OS Resources │
└────────────────────┘


---

## Component Breakdown

### 1. Desktop Application (UI Layer)

**Responsibilities**
- Capture user input (voice and text)
- Display responses, confirmations, and logs
- Present permission and confirmation dialogs
- Handle push-to-talk and session control
- Never execute system actions

**Key Characteristics**
- No direct system access
- No shell or code execution
- No policy decisions
- Acts purely as an interface

The UI layer is considered **untrusted** with respect to execution authority.

---

### 2. Local Agent (Control Layer)

The local agent is the **core of the system**.

It runs as a background service on macOS and is responsible for all decision-making and execution.

---

#### 2.1 Intelligence Subsystem

**Responsibilities**
- Convert speech to text (STT)
- Convert text to structured intent
- Perform no validation or execution

**External Dependencies**
- Deepgram (STT)
- GPT-4.1-nano (intent parsing)

**Key Rule**
AI output is treated as **untrusted input**.

---

#### 2.2 Policy Engine

**Responsibilities**
- Validate intents against an allowlist
- Validate parameters against schemas
- Evaluate required permissions
- Determine risk level
- Decide allow / deny / confirm

**Key Properties**
- Deterministic
- Rule-based
- No AI
- Same input always yields same decision

This component defines the **trust boundary** of the system.

---

#### 2.3 Executor

**Responsibilities**
- Execute approved actions only
- Enforce sandboxing
- Enforce time, memory, and scope limits
- Capture execution results

**Execution Types**
- Shell execution (restricted)
- Code execution (sandboxed)
- Docker control
- File operations
- System queries

The executor never bypasses policy decisions.

---

#### 2.4 Response Subsystem

**Responsibilities**
- Convert text responses into speech
- Stream audio back to the UI
- Never interpret or modify meaning

**External Dependency**
- Cartesia (TTS)

---

## Data Flow (End-to-End)

The system follows a strict, linear flow:

User
→ UI (voice/text)
→ STT
→ Intent Parser (LLM)
→ Policy Engine
→ Confirmation (if required)
→ Executor
→ Response (text + voice)
→ UI


There are **no side channels** and **no reverse execution paths**.

---

## Trust Boundaries

### Trusted Components
- Policy Engine
- Executor

### Semi-Trusted Components
- Desktop App
- Local IPC

### Untrusted Components
- LLM output
- Speech recognition output
- User input

All untrusted data must pass through validation before action.

---

## Failure Isolation

Each component is designed to fail independently:

- STT failure → system falls back to text
- LLM failure → system reports inability to parse intent
- Executor failure → error is reported, no retries without confirmation
- UI failure → agent continues running

No failure should result in unintended execution.

---

## Scalability Considerations

Although the initial system targets:
- Single user
- Single machine
- Local execution

The architecture supports future expansion:
- Remote dashboards
- Multiple agents
- Plugin-based skills
- Alternative AI providers

These are not enabled by default.

---

## Summary

This architecture prioritizes:

- Clear separation of responsibilities
- Explicit trust boundaries
- Deterministic decision-making
- Safe execution over convenience

The system is intentionally designed to be **boring in execution and strict in control**, while remaining flexible in interaction.

---

End of document.