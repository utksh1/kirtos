# docs/08-policy-engine.md

## Purpose

This document defines the **Policy Engine**.

The policy engine is the **authoritative decision-maker** in the system.  
It determines whether an action is allowed, denied, or requires confirmation.

The policy engine:
- Does not execute actions
- Does not use AI
- Does not modify system state
- Does not infer intent

It only **evaluates facts against rules**.

---

## Core Responsibilities

The policy engine is responsible for:

- Validating intent names
- Validating intent parameters
- Validating required permissions
- Classifying risk
- Determining execution profiles
- Enforcing confirmation rules
- Producing a final decision for the executor

No other component may make these decisions.

---

## Inputs to the Policy Engine

The policy engine receives a **validated intent request** in the following shape:

```json
{
  "session_id": "string",
  "intent": "string",
  "params": {},
  "permissions": ["string"],
  "confidence": 0.0
}
This input is considered untrusted until fully evaluated.

Outputs from the Policy Engine
Allowed Decision
{
  "allowed": true,
  "execution_profile": "safe | restricted | dangerous",
  "requires_confirmation": true,
  "runtime": "system | docker | shell | code | fs | network"
}
Denied Decision
{
  "allowed": false,
  "reason": "string"
}
This output is final and must not be overridden downstream.

Decision Flow (Authoritative)
The policy engine processes requests in the following order:

Step 1: Intent Validation
Verify intent exists in docs/06-intents-allowlist.md

Reject unknown or deprecated intents

Failure → DENY

Step 2: Parameter Validation
Validate parameters against intent schema

Reject missing, extra, or invalid parameters

Failure → DENY

Step 3: Permission Validation
For each declared permission:

Verify permission exists in docs/07-permission-model.md

Verify permission matches intent

Verify permission is not hard-denied

Failure → DENY

Step 4: Confidence Threshold Check
Compare confidence score against minimum threshold

Threshold is configurable (default: 0.6)

Failure → DENY or REQUIRE_CONFIRMATION

Low confidence never auto-executes.

Step 5: Risk Classification
Risk is derived only from the intent, not from AI output.

Intent Class	Risk
query.*	Low
system.*	Low
docker.*	Medium
file.read	Medium
file.write	High
browser.*	High
network.*	High
shell.*	Critical
code.*	Critical
Step 6: Execution Profile Mapping
Risk	Execution Profile
Low	safe
Medium	restricted
High	dangerous
Critical	dangerous
Step 7: Confirmation Requirement
Confirmation is required if any of the following apply:

Execution profile is dangerous

Permission requires confirmation

Confidence is below safe threshold

Action modifies system state

If confirmation is required and not granted → DENY

Step 8: Runtime Resolution
Runtime is determined only by intent type.

Intent Prefix	Runtime
system.*	system
docker.*	docker
file.*	fs
browser.*	browser
network.*	code
shell.*	shell
code.*	code
The runtime is immutable once selected.

Pseudo-Code Reference
evaluate(request):
  if not intent_allowed(request.intent):
      deny

  if not params_valid(request.intent, request.params):
      deny

  if not permissions_valid(request.permissions):
      deny

  risk = classify_risk(request.intent)
  profile = map_risk_to_profile(risk)

  confirmation_required = (
      profile == dangerous
      or permission_requires_confirmation(request.permissions)
      or request.confidence < threshold
  )

  if confirmation_required and not confirmed:
      deny

  runtime = resolve_runtime(request.intent)

  allow(profile, runtime, confirmation_required)
Hard Denial Rules
The following are denied unconditionally:

Unknown intent names

Unknown permissions

Requests requiring root privileges

Attempts to bypass confirmation

Attempts to chain multiple intents

Attempts to self-modify policy

These checks cannot be disabled.

Idempotency and Determinism
The policy engine is stateless

Decisions depend only on input

No randomness

No memory across sessions

Same input → same output.

Audit Requirements
Every policy decision must log:

Session ID

Intent name

Permissions evaluated

Risk level

Decision

Confirmation status

Timestamp

Logs must be append-only.

Failure Behavior
If the policy engine fails:

Execution must not proceed

System must default to deny

User must be notified

Failure must never result in execution.

Summary
The policy engine enforces:

Explicit authority

Deterministic control

Clear refusal paths

Centralized trust

It is the single most important safety component in the system.
