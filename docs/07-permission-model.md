# docs/07-permission-model.md

## Purpose

This document defines the **permission model** used by the system.

Permissions determine:
- What actions an intent is allowed to perform
- When user confirmation is required
- How long permissions remain valid
- How risk is controlled independently of AI output

Permissions are **explicit, declarative, and enforced by the policy engine**.

---

## Core Principles

1. Permissions are **capabilities**, not roles
2. Permissions are **never inferred**
3. Permissions are **scoped and temporary**
4. Permissions are **separate from intents**
5. Permissions are **enforced centrally**
6. Absence of permission means **deny**

---

## Permission Naming Convention

<domain>.<capability>


Examples:
- `system.read`
- `docker.control`
- `shell.exec`
- `code.exec`

---

## Permission Categories

system.*
docker.*
file.*
network.*
shell.*
code.*
browser.*


---

## Permission Definitions (Authoritative)

### System Permissions

#### system.read
Allows read-only access to system information.

Used by:
- system.status
- system.uptime
- system.resource_usage
- query.*

Risk Level: Low  
Confirmation Required: No

---

### Docker Permissions

#### docker.read
Allows read-only access to Docker state.

Used by:
- docker.list
- docker.logs

Risk Level: Medium  
Confirmation Required: No

---

#### docker.control
Allows lifecycle control of Docker containers.

Used by:
- docker.start
- docker.stop
- docker.restart

Risk Level: Medium  
Confirmation Required: Yes (once per session)

---

### File System Permissions

#### file.read
Allows reading files from approved directories.

Used by:
- file.read
- file.list

Risk Level: Medium  
Confirmation Required: No

---

#### file.write
Allows writing files to approved directories.

Used by:
- file.write

Risk Level: High  
Confirmation Required: Yes (once per session)

---

### Network Permissions

#### network.read
Allows basic outbound network operations.

Used by:
- network.ping

Risk Level: High  
Confirmation Required: Yes (every time)

---

#### network.scan
Allows active network scanning.

Used by:
- network.scan

Risk Level: High  
Confirmation Required: Yes (every time)

---

### Shell Permissions

#### shell.exec
Allows execution of allowlisted shell commands.

Used by:
- shell.exec

Risk Level: Critical  
Confirmation Required: Yes (every time)

Notes:
- No sudo
- No interactive shells
- No command chaining

---

### Code Execution Permissions

#### code.exec
Allows execution of sandboxed code.

Used by:
- code.run

Risk Level: Critical  
Confirmation Required: Yes (every time)

Notes:
- Execution is sandboxed
- Network disabled by default
- Filesystem access limited

---

### Screen Permissions

#### ui.screen.capture
Allows capturing screenshots of the macOS display.

Used by:
- screen.screenshot

Risk Level: Medium
Confirmation Required: No (Risk Floor is Medium)

Notes:
- Screenshots are saved to a controlled directory (~/Library/Application Support/Kirtos/screenshots/)
- Filenames are sanitized to prevent traversal
- Privacy & Security permissions are enforced by macOS

---

### Browser Permissions

#### browser.read
Allows read-only HTTP GET requests to allowlisted domains with sanitized output.

Used by:
- browser.fetch

Risk Level: High  
Confirmation Required: Yes (every time)

Constraints:
- GET only
- No cookies or auth headers
- Allowlisted domains only
- Response size capped and sanitized

---

## Permission Scope

Permissions are scoped to **sessions**, not users or devices.

Possible scopes:
- `single-action`
- `session`
- `never-persisted`

Default behavior:
- Dangerous permissions are **single-action**
- Medium-risk permissions may be **session-scoped**
- No permission persists across restarts

---

## Confirmation Rules

Confirmation is required when:
- Risk level is High or Critical
- Permission explicitly requires confirmation
- Confidence score is below threshold
- Action modifies system state

Confirmation must:
- Be explicit (Yes / No)
- Be informed (clear description)
- Be logged
- Timeout to deny

Silence always means **deny**.

---

## Permission Evaluation Flow

1. Intent declares required permissions
2. Policy engine validates permissions are known
3. Policy engine checks permission state
4. Confirmation requested if required
5. Permission granted temporarily
6. Executor proceeds or aborts

The executor never evaluates permissions.

---

## Hard-Denied Capabilities

The following capabilities are **never allowed**, regardless of confirmation:

- Root or sudo execution
- Kernel modification
- Firmware flashing
- Disk partitioning
- Raw device access
- Privilege escalation
- Persistent background execution without UI awareness

These are enforced at policy and sandbox levels.

---

## Audit and Logging

Every permission decision must be logged with:
- Session ID
- Intent name
- Permission name
- Decision (allow / deny)
- Confirmation status
- Timestamp

Logs are append-only and never modified.

---

## Versioning

This document defines **Permission Model v1**.

Any change to this file:
- Is security-sensitive
- Requires review
- May require changes to policy logic

---

## Summary

The permission model ensures that:

- Power is explicit
- Risk is visible
- Control remains with the user
- AI cannot escalate privileges
- Unsafe actions are refused by default

Permissions are the **final gate** between intent and execution.

---

End of document.
