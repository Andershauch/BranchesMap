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

Fill in the actual names before pilot release.

| Responsibility | Required named owner | Notes |
|---|---|---|
| System ownership | `TBD` | Overall accountability for V1 operation |
| Product scope approval | `TBD` | Approves V1 scope changes and non-goals |
| Release approval | `TBD` | Approves releases to production |
| Rollback approval | `TBD` | Approves rollback decision when needed |
| Operations monitoring | `TBD` | Owns daily/weekly monitoring cadence |
| Admin access review | `TBD` | Owns admin allowlist review |
| Engineering incident response | `TBD` | Handles technical diagnosis and fixes |
| Support handling | `TBD` | Owns first-line support process |

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

This document is structurally complete, but it is not operationally complete until all `TBD` entries are replaced with named humans.

## Related documents

- `docs/v1-support-playbook.md`
- `docs/v1-monitoring-checklist.md`
- `docs/v1-release-and-rollback-drill.md`
- `docs/v1-go-live-backlog.md`
