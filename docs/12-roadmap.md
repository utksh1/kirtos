# docs/12-roadmap.md

## Purpose

This document defines the **official project roadmap**.

It outlines:
- Build phases
- Goals per phase
- Milestones and exit criteria
- What is explicitly *not* done in each phase

This roadmap is designed to:
- Reduce risk
- Prevent premature complexity
- Enable incremental progress
- Keep safety guarantees intact

---

## Roadmap Philosophy

1. Design before code
2. Safety before features
3. Determinism before intelligence
4. Local control before automation
5. One phase must be stable before the next begins

Each phase produces a **working, testable system**.

---

## Phase 0 — Architecture & Design (COMPLETED)

### Goal
Define the system completely before implementation.

### Deliverables
- Vision and non-goals
- Architecture and infra layout
- Service contracts
- Intent allowlist
- Permission model
- Policy engine rules
- Executor sandbox rules
- macOS app UX
- Security model
- Build roadmap

### Exit Criteria
- All Phase 0 documents written
- All design decisions explicit
- No open architectural questions

---

## Phase 1 — Project Skeleton & Infrastructure

### Goal
Create a runnable system skeleton with no real execution.

### Scope
- Repository structure
- Antigravity configuration
- Native agent service stub
- macOS app shell
- IPC wiring between app and agent
- Dry-run executor only

### Explicit Non-Goals
- No AI integration
- No real command execution
- No voice input
- No network calls

### Exit Criteria
- App launches
- Agent starts
- Commands flow end-to-end in dry-run mode
- No crashes under normal usage

---

## Phase 2 — Policy Engine Implementation

### Goal
Make the system capable of **deciding**, but not acting.

### Scope
- Implement intent validation
- Implement permission checks
- Implement risk classification
- Implement confirmation flow
- Enforce deny-by-default behavior

### Explicit Non-Goals
- No shell execution
- No code execution
- No Docker control
- No voice input

### Exit Criteria
- Valid intents allowed
- Invalid intents rejected
- Confirmation enforced correctly
- Decisions are deterministic

---

## Phase 3 — Voice I/O Integration (Safe Mode)

### Goal
Enable full speech-to-speech interaction **without execution**.

### Scope
- LiveKit integration
- Deepgram STT
- Cartesia TTS
- Voice UX in macOS app
- Audio streaming pipeline

### Explicit Non-Goals
- No real system changes
- No command execution
- No background listening

### Exit Criteria
- Voice commands understood
- Spoken responses returned
- System remains read-only

---

## Phase 4 — Intent Parsing with LLM

### Goal
Allow natural language understanding.

### Scope
- GPT-4.1-nano integration
- Strict JSON parsing
- Confidence thresholding
- Retry and fallback logic

### Explicit Non-Goals
- No execution authority for LLM
- No policy logic in AI
- No auto-approval

### Exit Criteria
- Natural language reliably maps to intents
- Invalid or ambiguous commands rejected safely

---

## Phase 5 — Controlled Execution Enablement

### Goal
Enable **real system actions**, safely.

### Scope
- Enable Docker executor
- Enable shell executor 
- Enable code sandbox
- Enforce all confirmations
- Full audit logging

### Explicit Non-Goals
- No sudo
- No persistent background jobs
- No auto-approvals
- No plugin system

### Exit Criteria
- Approved actions execute correctly
- Disallowed actions are refused
- No sandbox escapes
- Logs are complete and accurate

---

## Phase 6 — UX Refinement & Stability

### Goal
Make the system usable and reliable.

### Scope
- Menu bar integration
- Push-to-talk improvements
- Error clarity
- Session history
- Log viewer
- Crash recovery

### Explicit Non-Goals
- No new execution capabilities
- No autonomy features

### Exit Criteria
- Smooth user experience
- Predictable behavior
- No accidental executions

---

## Phase 7 — Hardening & Extension (Optional)

### Goal
Prepare for long-term use and extension.

### Scope
- Performance optimization
- Optional plugin architecture
- Alternative AI providers
- Optional remote dashboard
- Advanced audit tooling

### Explicit Non-Goals
- No weakening of security invariants
- No autonomous behavior

### Exit Criteria
- System remains safe under load
- Extensions do not bypass policy
- All invariants still hold

---

## Long-Term Considerations

Future exploration may include:
- Multi-device coordination
- Advanced developer tooling
- Controlled automation scripts
- Research-oriented agent behavior

These are **intentionally deferred**.

---

## Final Notes

This roadmap exists to ensure that:

- The system is built intentionally
- Power is earned gradually
- Safety is never retrofitted
- Design decisions remain visible

If a future feature conflicts with this roadmap, the roadmap must be consciously revised.

---

## Phase 0 Completion Statement

With this document, **Phase 0 is complete**.

The project is now ready to move from **design to implementation**.

---

End of document.
