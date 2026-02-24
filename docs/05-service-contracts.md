# docs/05-service-contracts.md

## Purpose

This document defines the **service-to-service contracts** for the system.

It specifies:
- What services exist
- What APIs they expose
- Message shapes and expectations
- Directional communication rules
- Trust assumptions per service

These contracts are **authoritative**.  
No service may assume behavior not explicitly defined here.

---

## Contract Design Principles

1. All communication is **explicit**
2. JSON is the canonical message format
3. Services do not share databases or state
4. Services do not infer intent or permissions
5. Each service has a single responsibility
6. Failure defaults to deny or no-op

---

## Service List (Authoritative)

| Service Name | Zone | Role |
|-------------|------|------|
| `client.app` | UI | User interaction |
| `transport.livekit` | Transport | Audio streaming |
| `intelligence.stt` | Intelligence | Speech-to-text |
| `intelligence.intent` | Intelligence | Text-to-intent |
| `core.policy` | Control Core | Allow / deny decisions |
| `core.executor` | Control Core | Safe execution |
| `response.tts` | Response | Text-to-speech |

---

## Common Message Envelope

All inter-service messages MUST include this envelope.

```json
{
  "session_id": "string",
  "timestamp": "ISO-8601",
  "source": "string"
}
This ensures traceability and auditability.

Service Contracts
1. client.app → transport.livekit
Purpose
Send and receive audio streams.

Protocol
WebRTC (audio)

No JSON commands

Contract
The UI never sends interpreted text or commands directly

Only raw audio streams and session metadata

2. transport.livekit → intelligence.stt
Purpose
Convert audio stream to text.

Input
{
  "session_id": "string",
  "audio_stream": "binary",
  "language": "en"
}
Output
{
  "session_id": "string",
  "text": "string",
  "final": true,
  "confidence": 0.0
}
Guarantees
No intent inference

No modification of content meaning

3. intelligence.stt → intelligence.intent
Purpose
Convert text into structured intent.

Endpoint
POST /parse-intent
Request
{
  "session_id": "string",
  "text": "string",
  "context": {
    "platform": "macos",
    "input_mode": "voice | text"
  }
}
Response
{
  "intent": "string",
  "params": {},
  "permissions": ["string"],
  "confidence": 0.0
}
Guarantees
JSON-only output

No execution

No validation

4. intelligence.intent → core.policy
Purpose
Request a decision on an intent.

Endpoint
POST /evaluate
Request
{
  "session_id": "string",
  "intent": "string",
  "params": {},
  "permissions": ["string"],
  "confidence": 0.0
}
Response (Allowed)
{
  "allowed": true,
  "execution_profile": "safe | restricted | dangerous",
  "requires_confirmation": true,
  "runtime": "shell | code | docker | fs | system | browser"
}
Response (Denied)
{
  "allowed": false,
  "reason": "string"
}
Guarantees
Deterministic output

No side effects

5. core.policy → client.app (Confirmation)
Purpose
Request user confirmation for risky actions.

Message
{
  "session_id": "string",
  "action": "string",
  "summary": "string",
  "risk_level": "medium | high",
  "permissions": ["string"]
}
UI Contract
Must clearly display risk

Must block execution until response

6. core.policy → core.executor
Purpose
Authorize execution.

Endpoint
POST /execute
Request
{
  "session_id": "string",
  "intent": "string",
  "params": {},
  "execution_profile": "safe | restricted | dangerous",
  "runtime": "string"
}
Guarantee
Executor must not reinterpret intent

Executor must not escalate privileges

7. core.executor → response.tts
Purpose
Generate spoken response.

Endpoint
POST /speak
Request
{
  "session_id": "string",
  "text": "string",
  "voice": "default"
}
Guarantee
Text is spoken verbatim

No interpretation or filtering

8. response.tts → transport.livekit
Purpose
Stream audio back to the user.

Protocol
Audio stream only

No metadata modification

Error Contract (Global)
All services must return errors in this format.

{
  "error": "string",
  "code": "string",
  "recoverable": true
}
Errors must never trigger execution.

Trust Model Summary
Service	Trust Level
client.app	Untrusted
intelligence.*	Untrusted
transport.livekit	Untrusted
response.tts	Untrusted
core.policy	Trusted
core.executor	Trusted
Only trusted services may authorize or execute actions.

Contract Enforcement Rules
Unknown fields are rejected

Missing required fields are rejected

Extra permissions are rejected

Invalid intent names are rejected

Confidence below threshold is rejected

Summary
These service contracts ensure:

Predictable communication

Strong isolation

Clear responsibility boundaries

Auditable behavior

Safe extensibility

All future implementation must conform to these contracts.
