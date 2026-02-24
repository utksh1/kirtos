# docs/04-infra-layout.md

## Purpose

This document defines the **infrastructure layout** of the system.

It describes:
- What services exist
- Where they run (native vs container)
- How they are isolated
- How they communicate
- Where trust boundaries are enforced

This document is infrastructure-focused and intentionally avoids application logic details.

---

## Infrastructure Philosophy

The infrastructure follows these principles:

1. **Local-first execution**
2. **Zero-trust service communication**
3. **Explicit boundaries between components**
4. **Minimal privilege for every service**
5. **Replaceable external dependencies**

No service implicitly trusts another.

---

## High-Level Infrastructure Zones

The system is divided into **five infrastructure zones**:

┌─────────────────────────────┐
│ UI Zone │
│ macOS Desktop Application │
└──────────────┬──────────────┘
│
┌──────────────▼──────────────┐
│ Transport Zone │
│ LiveKit │
└──────────────┬──────────────┘
│
┌──────────────▼──────────────┐
│ Intelligence Zone │
│ STT + Intent Parsing │
└──────────────┬──────────────┘
│
┌──────────────▼──────────────┐
│ Control Core Zone │
│ Policy + Executor │
└──────────────┬──────────────┘
│
┌──────────────▼──────────────┐
│ Response Zone │
│ Text-to-Speech │
└─────────────────────────────┘


Each zone has a single responsibility.

---

## Zone 1: UI Zone

### Components
- macOS Desktop App

### Runtime
- Native macOS application

### Responsibilities
- Capture voice and text input
- Display responses and logs
- Display confirmation dialogs
- Control sessions (push-to-talk, start/stop)

### Restrictions
- No direct system access
- No execution capability
- No policy authority

The UI zone is considered **untrusted** for execution.

---

## Zone 2: Transport Zone

### Components
- LiveKit server

### Runtime
- Containerized
- Managed via Antigravity

### Responsibilities
- Real-time audio transport
- Session management
- Audio streaming (input/output)

### Restrictions
- No AI logic
- No execution authority
- No access to policy or executor

Failure in this zone must not cause unintended actions.

---

## Zone 3: Intelligence Zone

### Components
- Speech-to-Text gateway (Deepgram)
- Intent parsing service (GPT-4.1-nano via OpenRouter)

### Runtime
- Containerized
- Managed via Antigravity

### Responsibilities
- Convert audio to text
- Convert text to structured intent (JSON)
- Attach confidence scores

### Restrictions
- No validation authority
- No execution access
- No persistent state

All outputs from this zone are treated as **untrusted input**.

---

## Zone 4: Control Core Zone

### Components
- Policy Engine
- Permission Manager
- Executor
- Sandbox Manager
- Audit Logger

### Runtime
- Native (host-level)
- Minimal dependencies
- No cloud API keys

### Responsibilities
- Enforce intent allowlist
- Enforce permission model
- Require confirmations
- Execute approved actions
- Enforce sandbox constraints
- Log all actions

This is the **most trusted zone** in the system.

---

## Zone 5: Response Zone

### Components
- Text-to-Speech service (Cartesia)

### Runtime
- Containerized
- Managed via Antigravity

### Responsibilities
- Convert text responses into speech
- Stream audio back to LiveKit

### Restrictions
- No interpretation
- No execution authority
- No system access

---

## Native vs Containerized Components

### Native (Host-Level)
- Policy Engine
- Executor
- Sandbox Manager
- Local state

### Containerized
- LiveKit
- STT gateway
- Intent parsing service
- TTS service
- Optional diagnostics

Native components are kept minimal and highly controlled.

---

## Inter-Zone Communication Rules

Allowed communication paths only:

UI → Transport
Transport → Intelligence
Intelligence → Control Core
Control Core → Response
Response → Transport


All other communication paths are **explicitly denied**.

---

## Network Isolation

- Each container runs in its own network namespace
- Services cannot discover each other dynamically
- All connections are explicitly declared
- No wildcard network permissions

---

## Secrets and Credentials

Secrets are scoped per zone:

| Zone | Secrets |
|----|--------|
| Intelligence | STT + LLM API keys |
| Response | TTS API key |
| Control Core | None |
| UI | None |

The executor never has access to cloud credentials.

---

## Startup Order

The system must start in the following order:

1. Control Core (policy + executor)
2. Intelligence services
3. Response services
4. Transport (LiveKit)
5. UI application

This ensures the system never accepts input before it can safely evaluate it.

---

## Failure Handling Strategy

- Intelligence failure → user informed, no execution
- Transport failure → session stops safely
- Response failure → fallback to text-only
- Executor failure → action aborted, logged

Failure always defaults to **deny**, never execute.

---

## Summary

This infrastructure layout ensures:

- Clear trust boundaries
- Minimal attack surface
- Deterministic execution paths
- Replaceable services
- Safe failure modes

The system is designed so that **infrastructure enforces safety**, not application logic.

---

End of document.