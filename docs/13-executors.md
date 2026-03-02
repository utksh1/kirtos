# docs/13-executors.md

## Purpose

This document defines the **Executor Layer specification**.

It clarifies:
- What each executor is responsible for
- How executors are selected
- What inputs and outputs are allowed
- What hard limits apply per executor
- What must be logged for auditability

This document is implementation-facing and complements:
- `docs/08-policy-engine.md`
- `docs/09-executor-sandbox.md`
- `docs/05-service-contracts.md`

---

## Scope

The executor layer is responsible for **performing actions that have already been authorized** by policy.

The executor layer is not responsible for:
- Intent interpretation
- Permission decisions
- Risk decisions
- Confirmation decisions

Any request not explicitly authorized by policy must be rejected.

---

## Core Responsibilities

The executor layer must:
- Accept only policy-authorized execution requests
- Select the correct executor backend
- Re-validate runtime-safe input constraints
- Apply sandbox and resource limits
- Execute exactly one action per request
- Return structured results
- Emit append-only audit records

The executor must never:
- Escalate privileges
- Reinterpret or expand intent scope
- Chain multiple commands/intents
- Persist execution state across requests

---

## Executor Types (Authoritative)

The system defines six executor backends:

- `system_executor`
- `docker_executor`
- `fs_executor`
- `shell_executor`
- `code_executor`
- `browser_executor`

Runtime-to-executor mapping:

| Runtime | Executor |
|---|---|
| `system` | `system_executor` |
| `docker` | `docker_executor` |
| `fs` | `fs_executor` |
| `shell` | `shell_executor` |
| `code` | `code_executor` |
| `browser` | `browser_executor` |
| `screen` | `screen_executor` |

Note:
- `network.*` intents currently resolve to `code` runtime and must run under a locked network-safe profile in `code_executor`.
- `browser.*` intents resolve to `browser` runtime and must run in the read-only browser sandbox.

---

## Execution Contract

## Input (from `core.policy`)

```json
{
  "session_id": "string",
  "intent": "string",
  "params": {},
  "execution_profile": "safe | restricted | dangerous",
  "runtime": "system | docker | fs | shell | code | browser"
}
```

Required rules:
- All fields are mandatory.
- Unknown fields are rejected.
- `runtime` must match policy decision.
- `intent` must be compatible with `runtime`.

## Output (to caller and response layer)

```json
{
  "session_id": "string",
  "intent": "string",
  "status": "success | failure | timeout | denied",
  "result": {},
  "error": null,
  "started_at": "ISO-8601",
  "finished_at": "ISO-8601",
  "duration_ms": 0
}
```

Error shape:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "recoverable": true
  }
}
```

---

## Common Execution Flow

All backends must follow this sequence:

1. Validate request envelope and required fields
2. Verify runtime-to-intent compatibility
3. Create isolated sandbox context
4. Apply CPU, memory, disk, time, and output limits
5. Execute action with non-root identity
6. Capture stdout/stderr/status safely
7. Destroy sandbox context
8. Emit audit record
9. Return structured response

On any failure, execution stops and returns failure without retry.

---

## Global Non-Bypassable Controls

These controls apply to every executor:

- Non-root only
- No sudo
- No privilege escalation
- No interactive sessions
- No background persistence
- No secret injection from cloud credentials
- No sandbox reuse between requests
- Hard timeout termination

If a control cannot be enforced, execution must be denied.

---

## Executor Profiles

## 1) `system_executor`

Purpose:
- Read-only system queries

Allowed intents:
- `system.status`
- `system.uptime`
- `system.resource_usage`
- `query.time`
- `query.help`

Restrictions:
- Read-only operations only
- No subprocess spawning
- No filesystem writes
- No network operations

---

## 2) `docker_executor`

Purpose:
- Controlled Docker inspection and lifecycle actions

Allowed intents:
- `docker.list`
- `docker.logs`
- `docker.start`
- `docker.stop`
- `docker.restart`

Allowed command surface:
- `docker ps`
- `docker logs <container>`
- `docker start <container>`
- `docker stop <container>`
- `docker restart <container>`

Restrictions:
- No `docker exec`
- No `docker run`
- No image build/pull/push
- No network or volume reconfiguration
- Container name must match allowlisted pattern

---

## 3) `fs_executor`

Purpose:
- Controlled read/list/write in approved directories

Allowed intents:
- `file.read`
- `file.list`
- `file.write`

Restrictions:
- Path must resolve inside allowed directories
- No symlink traversal
- No recursive destructive operations
- No chmod/chown operations

---

## 4) `shell_executor`

Purpose:
- Execute one allowlisted command with arguments

Allowed intents:
- `shell.exec`

Command policy:
- Command must be on shell allowlist
- Arguments must pass token-level validation
- One command per request

Blocked syntax:
- Pipes (`|`)
- Redirects (`>`, `>>`, `<`)
- Subshells (`$()`, backticks)
- Background operators (`&`)
- Command chaining (`;`, `&&`, `||`)

---

## 5) `browser_executor` (Read-Only)

Purpose:
- Fetch and sanitize web content from allowlisted domains via GET only

Allowed intents:
- `browser.fetch`

Request policy:
- Single GET per execution
- URL must match allowlisted domains
- No cookies, auth headers, or custom headers
- JS disabled; HTML sanitized and truncated

Restrictions:
- No POST/PUT/PATCH/DELETE
- No form submission or clicks
- No navigation beyond requested URL
- No downloads or file writes

---

## 6) `code_executor`

Purpose:
- Run short-lived code in a hardened sandbox

Allowed intents:
- `code.run`
- `network.ping` (as constrained template execution)
- `network.scan` (as constrained template execution)

Supported languages:
- `python`
- `node`
- `bash` (restricted mode)

Restrictions:
- Ephemeral workspace only
- Read-only base filesystem
- Limited writable temp dir
- Block dangerous process-spawn APIs
- Network disabled by default

Network-safe profile requirements:
- Network enabled only for approved network intents
- Strict target validation
- Rate-limited requests
- Full network activity logging

---

## 7) `screen_executor`

Purpose:
- Secure capture of macOS display (screenshots)

Allowed intents:
- `screen.screenshot`

Allowed command surface:
- `/usr/sbin/screencapture`

Restrictions:
- **Output Isolation**: Screenshots MUST be saved to `~/Library/Application Support/Kirtos/screenshots/`.
- **Filename Sanitization**: Optional `filename_hint` must be sanitized to alphanumeric, underscores, and hyphens. Max length is 40 characters.
- **Path Traversal**: No path separators or relative paths allowed in filenames.
- **Security Check**: Process is killed on timeout (10s default).
- **Format Control**: Only `png` and `jpg` formats allowed.
- **Privacy Enforcement**: Relies on macOS TCC (Transparency, Consent, and Control) for "Screen Recording" permission.

---

## Result Handling Rules

Executor results must be:
- Deterministic in shape
- Bounded in size
- Free of internal stack traces for user-facing channels
- Sanitized before TTS/UI summary

Sensitive data must never be spoken back by default.

---

## Audit Requirements

Each execution must log:
- `session_id`
- `intent`
- `runtime`
- `executor_type`
- `execution_profile`
- Applied limits
- Start/end timestamps
- Duration
- Exit status
- Error code (if any)

Audit logs are append-only and local by default.

---

## Failure Behavior

Failure modes include:
- Invalid request
- Sandbox initialization failure
- Validation failure
- Timeout
- Resource limit breach
- Runtime error

Failure response rules:
- Terminate execution immediately
- Return structured error
- Never auto-retry
- Never fall back to a less restricted executor

---

## Implementation Notes

- Executor code should be split by backend with a shared contract module.
- Validation logic should be centralized and reused.
- Every backend should have dedicated tests for deny paths.
- Unknown runtimes or intents must fail closed.

---

## Suggested Future Executors (Proposed, Not Implemented)

These are not active and require new intents, permissions, and policy rules before implementation.

- `db_executor`: Read-only SQL against explicitly allowlisted local dev databases; no writes; parameterized queries only; connection strings stored outside executor.
- `workflow_executor`: Runs predefined, signed local workflows composed of existing intents; no ad-hoc shell; no dynamic step injection; inherits strict per-step permissions.
- `ml_executor`: Runs local ML inferences with bundled models only; no network; bounded GPU/CPU; no dynamic model downloads.

Each proposed executor must:
- Add intents to `docs/06-intents-allowlist.md` and map to new permissions in `docs/07-permission-model.md`.
- Define sandbox rules comparable to existing executors.
- Ship with deny-path tests before enablement.

---

## Versioning

This document defines **Executor Specification v1**.

Any modification to:
- executor types
- runtime mapping
- hard limits
- non-bypassable controls

is security-sensitive and requires explicit review.

---

## Summary

The executor layer is the controlled action boundary between policy decisions and real system effects.

It must remain:
- minimal,
- deterministic,
- sandboxed,
- auditable,
- and impossible to escalate through.

If a request cannot be executed safely, it must be refused.

---

End of document.
