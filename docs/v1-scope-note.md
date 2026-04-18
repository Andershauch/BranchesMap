# JOBVEJ V1 Scope Note

Date: 2026-04-18

## Purpose

This note freezes the intended V1 scope for JOBVEJ as a controlled reception pilot.

V1 is not a broad public-sector platform release. It is a limited citizen-facing pilot with kiosk usage, QR handoff to mobile, and a small number of account users.

## Target operating model

V1 is intended to run as:

- one or more reception touch screens
- a public browse flow without login
- a QR handoff from kiosk to mobile
- optional account creation for municipality follow functionality

Expected scale:

- up to 20 users per day
- about 10 percent create a user account

## In-scope V1 user journeys

The following journeys are explicitly in scope:

1. citizen opens the kiosk route and explores the map anonymously
2. citizen opens a municipality and reads the public content
3. citizen scans the QR code and continues on mobile
4. citizen installs the PWA on mobile if desired
5. citizen registers an account
6. citizen logs in
7. citizen follows a municipality
8. citizen later sees follow-update state in the product

## In-scope V1 data

The following data is explicitly in scope:

- email
- optional display name
- locale preference
- follows
- saved searches
- audit/security events

## In-scope V1 operating surfaces

The following operating surfaces are part of V1:

- Vercel-hosted production deployment
- Postgres-backed persistence
- GitHub Actions daily import workflow
- admin tools for operational review and translation work
- support handling for deletion, kiosk issues, and login issues

## Explicit non-goals for V1

The following are intentionally outside V1 scope unless they become release blockers:

- MFA for citizens
- advanced analytics stack
- large-scale public traffic engineering
- enterprise municipal governance package
- automated privacy/compliance platform
- self-service account deletion UI
- complex personalization beyond the current follow model

## V1 success criteria

V1 should be considered successful if:

- the kiosk route is understandable without staff guidance
- QR handoff works reliably
- the mobile route behaves independently from kiosk mode
- account login and follow flows are usable
- operations can monitor, support, release, and rollback the system without improvisation

## V1 release boundary

New features should not be added to V1 from this point unless they are needed to:

- fix a security issue
- fix a release-blocking usability issue
- fix a release-blocking operational issue

## Related documents

- `docs/v1-go-live-plan.md`
- `docs/v1-go-live-backlog.md`
- `docs/v1-reception-deployment-note.md`
