# docs/10-app-ux-macos.md

## Purpose

This document defines the **macOS desktop application UX and behavior**.

The macOS app is the **primary human interface** to the system.
It is responsible for interaction, visibility, and confirmation — **not execution**.

This document focuses on:
- User interaction flows
- App behavior and states
- macOS-specific considerations
- Safety-oriented UX decisions

---

## Role of the macOS App

The macOS app is a **control interface**, not an agent.

It:
- Collects user input (voice and text)
- Displays system responses
- Requests confirmations
- Shows execution status and logs
- Manages sessions

It does **not**:
- Execute commands
- Enforce policy
- Interpret intent
- Bypass confirmations

All authority remains with the local agent.

---

## App Modes

The app operates in the following modes:

### 1. Idle Mode
- App is running in background
- No microphone active
- No session active
- Menu bar icon visible

Default state after launch.

---

### 2. Listening Mode
- Microphone active
- Push-to-talk or explicit start
- Visual indication of listening
- Audio streamed to transport layer

Listening must always be **user-initiated**.

---

### 3. Processing Mode
- Audio or text has been submitted
- STT and intent parsing in progress
- UI shows “processing” state
- No new input accepted

---

### 4. Confirmation Mode
- A risky action requires approval
- Clear description shown
- User must explicitly approve or deny
- Voice + UI confirmation supported

---

### 5. Execution Feedback Mode
- Action outcome displayed
- Text and voice response provided
- Logs or summaries visible

---

## Input Methods

### Voice Input
- Push-to-talk (keyboard shortcut or button)
- Explicit start/stop
- Visual mic indicator
- Never always-on by default

### Text Input
- Chat-style text box
- Used as fallback or preference
- Treated identically to voice commands

---

## Confirmation UX (Critical)

For actions requiring confirmation, the app must:

- Clearly state the action
- Clearly state the risk level
- Show required permissions
- Block execution until decision

### Example Confirmation Message

Action: Execute shell command
Command: ls -la
Risk: High
Permission: shell.exec


Buttons:
- Approve
- Deny

Voice confirmation is optional but must be explicit.

---

## Voice Feedback Rules

The app must:
- Speak only summaries
- Avoid raw logs or code
- Avoid secrets or file contents
- Use calm, neutral tone

Examples:
- “The container was restarted successfully.”
- “That action was denied.”

---

## Error Presentation

Errors must be:
- Human-readable
- Honest
- Non-alarming
- Actionable if possible

Examples:
- “I couldn’t understand that command.”
- “That action is not allowed.”
- “Permission was not granted.”

Errors must never expose internal stack traces.

---

## Session Management

A session represents a single interaction flow.

Session properties:
- One active session at a time
- Session-scoped permissions
- Session timeout on inactivity
- Explicit session end

The UI must clearly indicate when a session starts and ends.

---

## macOS-Specific Behaviors

### Permissions
- Microphone permission requested explicitly
- No hidden permission requests
- App explains why permission is needed

### Menu Bar Integration
- App lives in menu bar by default
- Quick access to:
  - Start listening
  - Stop listening
  - Open main window
  - Quit agent

### Startup Behavior
- App may offer “start on login”
- Disabled by default
- Clearly explained to user

---

## Safety UX Rules (Non-Negotiable)

The app must never:
- Execute actions without visible confirmation (when required)
- Hide risky behavior
- Mask denials as failures
- Auto-approve permissions
- Persist dangerous permissions silently

User awareness is mandatory.

---

## Accessibility Considerations

- Keyboard-only operation supported
- Clear focus states
- Readable confirmation dialogs
- Voice feedback optional but accessible

---

## UX Failure Handling

If the app crashes:
- The agent must continue safely
- No execution may continue without UI confirmation
- On restart, session state is reset

If the agent crashes:
- App must disable interactions
- Inform user immediately

---

## Summary

The macOS app is designed to:

- Make system control understandable
- Make risk visible
- Make decisions explicit
- Make refusals clear
- Never surprise the user

The app is the **human conscience** of the system.

---

End of document.