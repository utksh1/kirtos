# Kirtos Security Invariants

This document defines the formal security invariants of the Kirtos Agent. These invariants are enforceable via boot-time checks, unit tests, and the Policy Engine.

## Core Invariants

### I1: No Executor Runs Without a PolicyEngine `ALLOW` Decision
The Executor MUST receive a decision object from the `PolicyEngine`. If the decision is `allowed: false`, or if no decision is provided, the Executor MUST terminate the request with a `SecurityException`.
*   **Enforcement**: `executor.js` core loop.

### I2: Canonicalization Runs Before All Logic Layers
User input (JSON from WebSocket) MUST be passed through `Canonicalizer.canonicalize()` before it reaches the `FastClassifier`, `ContentGuard`, or the `IntelligenceService` (LLM). This prevents bypasses using invisible characters, homoglyphs, or non-normalized Unicode.
*   **Enforcement**: `agent/index.js` message handler.

### I3: Memory and State are Untrusted Inputs
Conversation history (Memory) and session state (StateManager) are treated as untrusted context. They are used for intent resolution but MUST NOT be used to bypass permission checks or content guardrails.
*   **Enforcement**: `PolicyEngine.evaluate` ignores state for risk calculation.

### I4: `STRICT_REFUSE` Cannot Be Overridden by Trust Tokens
If `ContentGuard` detects a hazard with a reason code listed in `STRICT_REFUSE_CODES` (e.g., `XSS_PROTOCOL`), the `PolicyEngine` MUST deny the request immediately, even if a valid trust token or explicit user confirmation exists for that session.
*   **Enforcement**: `PolicyEngine.evaluate` checks for strict refusal before trust validation.

### I5: CRITICAL Permissions Require Explicit Approval
Any permission with a `CRITICAL` risk level (e.g., `system.admin`, `shell.exec`) MUST NOT be granted via automatic trust heuristics. Only explicit UI confirmation (`isExplicit: true`) can generate a trust token for these permissions.
*   **Enforcement**: `TrustManager.grant` escalation check.

### I6: Plan-Approval Trust is Scoped via `plan_hash`
Trust tokens granted for a "Plan approval" (batch execution) MUST be scoped to the SHA-256 hash of that specific plan. If the plan is modified (e.g., a parameter changed) prior to execution, the trust token is invalidated for that request.
*   **Enforcement**: `TrustManager.isTrusted` with `planHash` verification.

### I7: State Updates are Applied Only on Success
The `StateManager` MUST NOT commit state updates for an operation that failed or was denied. Updates are valid only if the Executor returns `status: success`.
*   **Enforcement**: `agent/index.js` outcome-gated update loop.

### I8: Every Audit Trace Logs `capability_fingerprint`
Every generated `auditTrace` (Flight Recorder entry) MUST include the current `capability_fingerprint` of the `IntentRegistry`. This ensures that any audit log can be resolved to the exact security configuration active at the time of the event.
*   **Enforcement**: `agent/index.js` audit trace generation.

### I9: Screen Capture MUST be Path-Isolated and Sanitized
The `ScreenExecutor` MUST only write files to the pre-defined `SCREENSHOT_DIR`. Any `filename_hint` provided by the model MUST be stripped of path separators and normalized to alphanumeric characters, hyphens, and underscores to prevent path traversal or filesystem clutter.
*   **Enforcement**: `agent/src/executor/screen.js` validation loop.

## Enforcing Invariants in CI
- **Unit Tests**: `test/invariants/*.js` must pass 100%.
- **Boot Checks**: `IntentRegistry` verifies domain contracts (risk floors/ceilings) on startup.
- **Fuzzing**: `test/fuzz` property-based tests verify that `I2` and `I4` hold under mutation.
