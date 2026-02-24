Purpose of This Document

This document defines explicit non-goals for the project.

Non-goals are not failures or limitations; they are intentional boundaries.
Anything listed here is considered out of scope by design, even if it seems technically possible or tempting to add later.

If a future feature conflicts with this document, the feature is rejected unless this document is deliberately revised.

Core Non-Goals
1. Fully Autonomous AI Agent

The system will not operate autonomously.

No background decision-making

No self-triggered actions

No continuous monitoring with automatic responses

No “agent decides what to do next” behavior

Every meaningful action must be explicitly initiated by the user.

2. Direct LLM-to-System Execution

The system will never allow:

LLMs to execute shell commands directly

LLMs to bypass the policy engine

LLMs to choose execution runtimes

LLMs to grant permissions

AI output is always treated as untrusted input.

3. Implicit or Learned Permissions

The system will not:

Learn permissions from past behavior

Assume consent based on repetition

Auto-upgrade permissions over time

Persist dangerous permissions silently

Permissions are:

Explicit

Scoped

Temporary

Revocable

4. Full OS Replacement or Shell Replacement

This project does not aim to:

Replace Terminal

Replace shell workflows

Replace package managers

Replace system settings tools

It is a control layer, not a full operating environment.

5. Unlimited or Raw Shell Access

The system will not provide:

Interactive shells

Persistent shell sessions

Arbitrary command passthrough

Root or sudo access

Privilege escalation

All shell access is:

Intent-based

Allowlisted

Sandboxed

Time-limited

6. Silent or Hidden Actions

The system will not:

Execute actions without visibility

Hide failures or errors

Perform background tasks without reporting

Make changes without confirmation (when required)

Every action must be:

Observable

Auditable

Reported back to the user

7. Bypassing macOS Security Mechanisms

The project will not attempt to:

Circumvent SIP

Bypass Gatekeeper

Disable code signing

Hook private macOS APIs

Escalate privileges through exploits

The system operates within macOS security constraints, not around them.

8. Always-Listening or Surveillance Mode

The system will not:

Always listen to the microphone by default

Record or store raw audio indefinitely

Transmit audio without user awareness

Act as a surveillance or monitoring tool

Voice input is:

User-initiated

Session-scoped

Transparent

9. General Consumer Assistant Scope (v1)

The initial versions will not focus on:

Casual conversation

Entertainment

Smart-home control

Social interaction

Personality-driven chat

The focus is utility, control, and safety, not companionship.

10. Multi-User or Shared-Machine Support (v1)

The system will not initially support:

Multiple user profiles

Role-based access control

Shared permission models

Multi-tenant usage

v1 assumes:

Single user

Single machine

Trusted local environment

Explicit Out-of-Scope Features (for Phase 1–3)

The following are deliberately postponed, not forgotten:

Plugin marketplace

Third-party skill installation

Remote device fleet management

Mobile companion apps

Cross-OS synchronization

Learning user preferences automatically

These may be revisited only after the core system proves safe and stable.

Why These Non-Goals Matter

These constraints exist to ensure:

Safety over convenience

Predictability over magic

Trust over novelty

Control over autonomy

The system is designed to be powerful but boring in its decision-making.

That is intentional.

Summary

This project is not about building the most capable AI agent possible.

It is about building the most responsible system agent that can:

Understand intent

Enforce boundaries

Act safely

Refuse clearly

Anything that threatens those principles is out of scope.