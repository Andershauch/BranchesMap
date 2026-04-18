# JOBVEJ V1 Ownership Map

Date: 2026-04-18

## Purpose

This document defines the ownership model required before V1 pilot go-live.

It exists because V1 should not rely on implicit ownership for release, support, admin access, or operations.

## Required roles

The following roles must be assigned to named humans before go-live:

1. system owner
2. product owner
3. operations owner
4. admin owner
5. engineering owner
6. support owner

## Ownership matrix

| Responsibility | Required named owner | Notes |
|---|---|---|
| System ownership | `Anders Djurhuus - Næstved Kommune` | Overall accountability for V1 operation |
| Product scope approval | `Anders Djurhuus - Næstved Kommune` | Approves V1 scope changes and non-goals |
| Release approval | `Anders Djurhuus - Næstved Kommune` | Approves releases to production |
| Rollback approval | `Anders Djurhuus - Næstved Kommune` | Approves rollback decision when needed |
| Operations monitoring | `Anders Djurhuus - Næstved Kommune` | Owns daily/weekly monitoring cadence |
| Admin access review | `Anders Djurhuus - Næstved Kommune` | Owns admin allowlist review |
| Engineering incident response | `Anders Djurhuus - Næstved Kommune` | Handles technical diagnosis and fixes |
| Support handling | `Anders Djurhuus - Næstved Kommune` | Owns first-line support process |

## Minimum role expectations

### System owner

Responsible for:

- overall service accountability
- final operational readiness decision
- resolving ownership ambiguity when incidents cross teams

### Product owner

Responsible for:

- freezing V1 scope
- deciding whether a requested change is in scope or out of scope

### Operations owner

Responsible for:

- daily monitoring review
- import review
- release checklist coordination
- soft-launch watch process

### Admin owner

Responsible for:

- reviewing `ADMIN_USER_EMAILS`
- admin access governance
- admin-side operational follow-up

### Engineering owner

Responsible for:

- technical incident response
- release fixes
- rollback execution support
- deployed security verification

### Support owner

Responsible for:

- user-facing support triage
- deletion-request coordination
- kiosk/support issue logging

## Approval model

The following decisions must not be left implicit:

- who can approve production release
- who can approve rollback
- who can approve admin-account changes
- who can approve user deletion for normal users
- who can approve user deletion for admin users

## Current status

This document is operationally complete for V1 pilot use.

Current V1 decision:

- the named operational owner across system, release, rollback, monitoring, admin review, engineering response, and support handling is `Anders Djurhuus - Næstved Kommune`

This is acceptable for V1, but it also means operational concentration risk exists because many responsibilities sit with one named person.

## Related documents

- `docs/v1-support-playbook.md`
- `docs/v1-monitoring-checklist.md`
- `docs/v1-release-and-rollback-drill.md`
- `docs/v1-go-live-backlog.md`
