# docs/06-intents-allowlist.md

## Purpose

This document defines the **authoritative allowlist of intents** that the system supports.

An **intent** represents a single, well-defined capability the system can perform.
All intents are explicitly enumerated, versioned by design, and mapped to permissions.

If an intent is not listed here:
- It must be rejected by the policy engine
- It must not be executed by the executor
- It must not be invented by any AI model

---

## Intent Design Principles

1. Intents are **explicit and narrow**
2. One intent = one responsibility
3. No “generic” or catch-all intents
4. Parameters are strictly defined
5. Each intent maps to a fixed permission set
6. Risk level is pre-classified

---

## Intent Naming Convention

<domain>.<action>


Examples:
- `system.status`
- `docker.restart`
- `shell.exec`

---

## Intent Categories

system.*
query.*
docker.*
file.*
network.*
shell.*
code.*


---

## System Intents (Read-Only)

### system.status
Retrieve basic system status.

**Params**
```json
{}
Permissions

["system.read"]
Risk Level
Low

system.uptime
Retrieve system uptime.

Params

{}
Permissions

["system.read"]
Risk Level
Low

system.resource_usage
Retrieve CPU and memory usage.

Params

{}
Permissions

["system.read"]
Risk Level
Low

Query Intents (Safe, Informational)
query.time
Return the current system time.

Params

{}
Permissions

["system.read"]
Risk Level
Low

query.help
Return a list of supported intents.

Params

{}
Permissions

["system.read"]
Risk Level
Low

Browser Intents (Read-Only, Allowlisted Domains)
browser.fetch
Fetch and return sanitized page content from an allowlisted domain (GET only).

Params

{
  "url": "string"
}
Permissions

["browser.read"]
Risk Level
High

Docker Intents
docker.list
List Docker containers.

Params

{}
Permissions

["docker.read"]
Risk Level
Medium

docker.start
Start a Docker container.

Params

{
  "container": "string"
}
Permissions

["docker.control"]
Risk Level
Medium

docker.stop
Stop a Docker container.

Params

{
  "container": "string"
}
Permissions

["docker.control"]
Risk Level
Medium

docker.restart
Restart a Docker container.

Params

{
  "container": "string"
}
Permissions

["docker.control"]
Risk Level
Medium

docker.logs
Retrieve logs for a Docker container.

Params

{
  "container": "string",
  "lines": "number"
}
Permissions

["docker.read"]
Risk Level
Medium

File System Intents
file.read
Read a file from an allowed path.

Params

{
  "path": "string"
}
Permissions

["file.read"]
Risk Level
Medium

file.write
Write content to a file in an allowed directory.

Params

{
  "path": "string",
  "content": "string"
}
Permissions

["file.write"]
Risk Level
High

file.list
List files in an allowed directory.

Params

{
  "path": "string"
}
Permissions

["file.read"]
Risk Level
Medium

Screen Intents
### screen.screenshot
Capture a screenshot of the current macOS display.

**Params**

```json
{
  "mode": "full | window | interactive",
  "format": "png | jpg",
  "include_cursor": "boolean",
  "copy_to_clipboard": "boolean",
  "filename_hint": "string (max 40)"
}
```
**Permissions**

["ui.screen.capture"]

**Risk Level**

Medium

Network Intents
network.ping
Ping a network target.

Params

{
  "target": "string"
}
Permissions

["network.read"]
Risk Level
High

network.scan
Scan a network target (limited scope).

Params

{
  "target": "string"
}
Permissions

["network.scan"]
Risk Level
High

Shell Intents (Highly Restricted)
shell.exec
Execute a single allowlisted shell command.

Params

{
  "command": "string",
  "args": ["string"]
}
Permissions

["shell.exec"]
Risk Level
Critical

Notes

No pipes

No redirects

No subshells

No sudo

No interactive sessions

Code Execution Intents
code.run
Execute a short-lived script in a sandbox.

Params

{
  "language": "python | node | bash",
  "code": "string"
}
Permissions

["code.exec"]
Risk Level
Critical

Disallowed Intent Classes (Explicit)
The following intent classes are explicitly forbidden:

system.modify.*

system.config.*

user.manage.*

kernel.*

hardware.*

device.*

process.kill.*

shell.interactive

code.persist.*

Any attempt to introduce these must be rejected.

Intent Validation Rules
The policy engine must enforce:

Intent name exists in this document

Parameters exactly match schema

No extra or missing parameters

Permissions match intent definition

Confidence meets minimum threshold

Risk level is respected

Versioning
This document represents Intent Allowlist v1.

Any change to this file:

Is a breaking change

Must be reviewed deliberately

Must update dependent documents

Summary
This allowlist defines the maximum power of the system.

Everything else — AI, UI, execution — operates within these limits.

If an action is not here, the system must refuse it.
