# docs/09-executor-sandbox.md

## Purpose

This document defines the **Executor Sandbox Model**.

The sandbox is responsible for enforcing **hard technical limits** on execution.
Even if the policy engine allows an action, the sandbox ensures that execution:

- Cannot escape defined boundaries
- Cannot escalate privileges
- Cannot persist beyond its scope
- Cannot exceed resource limits

The sandbox is the **last line of defense**.

---

## Sandbox Design Principles

1. Execution is isolated by default
2. Least privilege at all times
3. No persistence unless explicitly allowed
4. Resource usage is strictly capped
5. Failure defaults to termination
6. Sandbox rules cannot be overridden by AI or UI

---

## Executor Types

The executor supports multiple **execution backends**, selected by the policy engine:

system_executor
docker_executor
shell_executor
code_executor
fs_executor
browser_executor


Each executor has its own sandbox rules.

---

## Execution Lifecycle (Common)

All executors follow this lifecycle:

1. Receive execution request
2. Validate runtime type
3. Prepare sandbox environment
4. Apply resource limits
5. Execute action
6. Capture output
7. Destroy sandbox
8. Return result

No executor reuses state between runs.

---

## System Executor (Read-Only)

### Purpose
Execute read-only system queries.

### Capabilities
- Read system information
- No modification allowed

### Restrictions
- No write access
- No subprocess spawning
- No network access

### Examples
- system.status
- system.uptime

---

## Docker Executor

### Purpose
Control Docker containers safely.

### Execution Method
- Wrapper around allowlisted Docker CLI commands

### Allowed Commands
docker ps
docker start <container>
docker stop <container>
docker restart <container>
docker logs <container>


### Restrictions
- No docker exec
- No docker run
- No volume mounts
- No privileged containers
- No network modification

### Limits
- Timeout: 5 seconds
- Output capped
- Non-root execution

---

## Shell Executor

### Purpose
Execute single allowlisted shell commands.

### Environment
- User: non-root (agent user)
- Working directory: fixed sandbox path
- Clean environment variables

### Allowlist (Example)
ls
cat
df
du
ps
top
git
docker


### Explicitly Blocked
- sudo
- pipes (|)
- redirects (>, >>)
- subshells ($(), backticks)
- background execution (&)
- interactive flags

### Limits
- CPU: 1 core
- Memory: 128 MB
- Timeout: 5 seconds
- Output size limit enforced

---

## Code Executor

### Purpose
Execute short-lived code snippets safely.

### Supported Languages
- Python
- Node.js
- Bash (restricted)

### Isolation
- Ephemeral working directory
- Read-only base filesystem
- Writable temp workspace only
- Separate process namespace

### Disabled APIs
- Python: os.system, subprocess
- Node: child_process
- Bash: interactive shells

### Resource Limits
- CPU: 1 core
- Memory: 512 MB
- Disk: 50 MB
- Timeout: 10 seconds

### Network
- Disabled by default
- Enabled only when explicitly permitted
- Rate limited

---

## File System Executor

### Purpose
Perform controlled file operations.

### Allowed Operations
- Read
- Write
- List

### Restrictions
- Only whitelisted directories
- No absolute paths outside sandbox
- No symlinks
- No recursive deletes

### Persistence
- Writes only allowed in approved paths
- Temporary files cleaned automatically

---

## Browser Executor (Read-Only)

### Purpose
Fetch and sanitize web content from allowlisted domains only.

### Execution Method
- HTTP GET via headless client with JS disabled
- Fetched HTML is sanitized and truncated before returning

### Allowed Operations
- Single GET request per execution
- Only to preconfigured allowlisted domains
- No cookies, auth headers, or local storage

### Restrictions
- No POST/PUT/DELETE/PATCH
- No form submission
- No script execution
- No downloads or file writes
- No navigation beyond the single URL

### Limits
- Timeout: 5 seconds
- Response size cap: enforced and sanitized
- CPU: 1 core
- Memory: 256 MB
- Network egress restricted to allowlist

### Examples
- browser.fetch (GET https://allowed.example.com/page)

---

## Network Constraints

Unless explicitly enabled:
- No outbound connections
- No raw sockets
- No packet crafting
- No port binding

Network-enabled sandboxes must:
- Use isolated namespaces
- Enforce strict rate limits
- Log all network activity

---

## Resource Enforcement

All executors must enforce:

| Resource | Limit |
|-------|------|
| CPU | Hard capped |
| Memory | Hard capped |
| Disk | Hard capped |
| Time | Hard timeout |
| Output | Size limited |

Exceeding any limit results in immediate termination.

---

## Failure Handling

On sandbox failure:
- Execution is terminated
- Partial output may be discarded
- Error is reported to policy layer
- No retries without new approval

Failure never escalates privileges.

---

## Audit and Logging

Every execution must log:
- Session ID
- Intent name
- Executor type
- Runtime limits applied
- Execution duration
- Exit status

Logs are append-only.

---

## Non-Bypassable Rules

The following rules cannot be bypassed under any circumstances:

- No root execution
- No persistent background processes
- No privilege escalation
- No sandbox reuse
- No self-modifying code

These are enforced at multiple layers.

---

## Summary

The executor sandbox ensures that:

- Approved actions are still constrained
- Mistakes cannot become disasters
- AI output cannot escape boundaries
- Execution is predictable and auditable

Even trusted intents are treated with caution.

---

End of document.
