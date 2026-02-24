# docs/11-security-model.md

## Purpose

This document defines the **security model** of the system.

It explains:
- What is trusted and what is not
- What threats are considered
- What threats are explicitly out of scope
- How the system defends itself at each layer

Security is treated as a **first-class design constraint**, not an afterthought.

---

## Security Philosophy

The system follows these core security principles:

1. **Assume input is hostile**
2. **Assume AI output is untrusted**
3. **Minimize blast radius**
4. **Fail closed, not open**
5. **Make security visible to the user**
6. **Prefer refusal over risk**

No single control is relied on alone.

---

## Trust Model

### Trusted Components
- Policy Engine
- Permission Model
- Executor Sandbox

These components:
- Run locally
- Are deterministic
- Do not use AI
- Enforce hard boundaries

---

### Semi-Trusted Components
- macOS App
- Local IPC

These components:
- Are user-facing
- Can fail safely
- Cannot execute actions directly

---

### Untrusted Components
- User input (voice or text)
- Speech-to-text output
- LLM intent output
- External AI services
- Network transport
- TTS output

All untrusted data must be validated before use.

---

## Threat Model

The system explicitly considers the following threat classes.

---

### 1. Malicious or Accidental User Input

Examples:
- Ambiguous commands
- Dangerous phrasing
- Accidental speech input
- Social engineering via voice

Mitigations:
- Confidence thresholds
- Intent allowlist
- Explicit confirmation
- Clear UX warnings

---

### 2. LLM Hallucination or Misinterpretation

Examples:
- Invented intents
- Incorrect parameters
- Overconfident but wrong outputs

Mitigations:
- Strict intent allowlist
- Schema validation
- Confidence gating
- Policy engine rejection
- No direct execution paths

---

### 3. Privilege Escalation

Examples:
- Attempted sudo usage
- Shell escapes
- Subprocess spawning
- Sandbox breakout attempts

Mitigations:
- Non-root execution
- Command allowlists
- Disabled APIs
- Resource limits
- Multiple enforcement layers

---

### 4. Silent or Hidden Execution

Examples:
- Background tasks without UI
- Auto-approved permissions
- Hidden retries

Mitigations:
- Mandatory confirmation UX
- Session-scoped permissions
- Explicit execution states
- Audit logging

---

### 5. Compromised External Services

Examples:
- STT returning malicious text
- LLM producing exploit strings
- TTS injection attempts

Mitigations:
- Treat all external output as untrusted
- No execution based on raw output
- No secrets passed to untrusted services
- Executor isolated from cloud credentials

---

### 6. Denial of Service (Local)

Examples:
- Infinite loops in code execution
- Resource exhaustion
- Hanging shell commands

Mitigations:
- Hard timeouts
- CPU and memory caps
- Output size limits
- Forced termination

---

## Explicitly Out-of-Scope Threats

The system does **not** attempt to defend against:

- A fully compromised operating system
- Kernel-level malware
- Rootkits
- Physical access attacks
- macOS security features being disabled by the user

The system assumes a **reasonably secure host OS**.

---

## Defense-in-Depth Layers

Security is enforced across multiple layers:

1. UX confirmation
2. Intent allowlist
3. Permission model
4. Policy engine logic
5. Executor sandbox
6. OS-level protections
7. Resource limits
8. Audit logging

A failure in one layer must not compromise the system.

---

## Audit and Accountability

Every sensitive operation must be auditable.

Audit logs include:
- Session ID
- Intent
- Permissions
- Risk level
- Confirmation decision
- Execution result
- Timestamp

Logs are:
- Append-only
- Local by default
- Not modifiable by the executor

---

## Secure Defaults

The system defaults to:
- Deny on uncertainty
- Require confirmation on risk
- Disable network access
- Disable persistence
- Disable background execution

Any relaxation must be explicit.

---

## Security vs Convenience Tradeoffs

This system intentionally prioritizes:

- Safety over speed
- Explicitness over automation
- Refusal over guesswork

This may feel restrictive, and that is intentional.

---

## Security Invariants (Non-Negotiable)

The following invariants must always hold:

- LLMs never execute code
- UI never executes actions
- Policy engine is the single authority
- Executor never escalates privileges
- Dangerous actions require confirmation
- Failures never result in execution

If any invariant is broken, the system is considered unsafe.

---

## Summary

This security model ensures that:

- Power is always mediated
- AI is never trusted blindly
- The user remains in control
- Mistakes do not become disasters

The system is designed to **refuse safely rather than act unsafely**.

---

End of document.
