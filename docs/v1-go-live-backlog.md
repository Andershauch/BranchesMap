# JOBVEJ V1 Go-Live Backlog

Date: 2026-04-18

Related:

- `docs/v1-go-live-plan.md`

## How to use this backlog

This backlog translates the go-live plan into concrete execution work.

Rules:

- `P1` means must be completed before V1 pilot go-live
- `P2` means should be completed before V1 is considered stable
- `P3` means useful follow-up after V1 is running

Recommended owners:

- `Product`
- `Engineering`
- `Ops`
- `Admin`

Status values:

- `todo`
- `in_progress`
- `blocked`
- `done`

## Execution order

Work should be executed in this order:

1. Governance and scope lock
2. Security hardening decisions
3. Runtime and architecture hardening
4. Reception and QR flow
5. Documentation round
6. Operations readiness
7. Pilot verification and release

## Sprint 1: Scope, ownership, and trust model

Goal:

- remove ambiguity before implementation and release prep continues

### P1-01 V1 scope note

- Owner: `Product`
- Status: `todo`
- Task:
  - write a one-page V1 scope note
  - list the allowed V1 user journeys
  - list the explicit non-goals
- Output:
  - approved scope note in `docs/`
- Done when:
  - no open scope questions remain for V1 release

### P1-02 Ownership map

- Owner: `Product`
- Status: `todo`
- Task:
  - assign named owners for system, admin, operations, and support
  - record who approves release and rollback
- Output:
  - owner matrix in `docs/`
- Done when:
  - every critical flow has a named human owner

### P1-03 Canonical production origin

- Owner: `Engineering`
- Status: `todo`
- Task:
  - choose the single production domain
  - document it as the canonical app origin
  - verify QR codes, auth redirects, and app links all target that origin
- Output:
  - canonical origin documented
- Done when:
  - there is one production URL and no ambiguity about which one is official

### P1-04 Reception deployment note

- Owner: `Ops`
- Status: `todo`
- Task:
  - define physical touch-screen setup
  - define browser/app mode
  - define network setup
  - define who can access device settings
- Output:
  - reception deployment note in `docs/`
- Done when:
  - the physical runtime environment is explicitly described

## Sprint 2: Security baseline before citizen-facing pilot

Goal:

- close the most important security and privacy gaps before release

### P1-05 Host/origin hardening

- Owner: `Engineering`
- Status: `todo`
- Task:
  - review `auth.ts`
  - review `lib/server/request-origin.ts`
  - review redirect/origin construction across auth and mutation routes
  - remove unnecessary trust in forwarded host headers where possible
  - align redirects with canonical origin
- Files:
  - `auth.ts`
  - `lib/server/request-origin.ts`
  - `lib/server/origin-guard.ts`
  - relevant route handlers
- Done when:
  - production redirect/origin logic no longer depends on loosely trusted host input

### P1-06 CSP tightening

- Owner: `Engineering`
- Status: `todo`
- Task:
  - review current CSP in `lib/server/security.ts`
  - reduce `unsafe-inline` usage if technically possible
  - document any CSP exceptions that remain
- Files:
  - `lib/server/security.ts`
  - related frontend/runtime files if changes are needed
- Done when:
  - CSP is intentionally defined, not just baseline-enabled

### P1-07 Auth/session configuration review

- Owner: `Engineering`
- Status: `todo`
- Task:
  - review session lifetime for citizen use
  - verify secure production cookie behavior
  - verify admin assignment model
  - document secret rotation expectations
- Files:
  - `auth.ts`
  - `lib/server/users.ts`
  - `.env.example`
- Done when:
  - auth/session settings are justified and documented

### P1-08 Privacy and retention package

- Owner: `Product`
- Status: `todo`
- Task:
  - define what personal data is stored
  - define retention period for user, follows, saved searches, audit/security events
  - define deletion handling process
  - define support contact path
- Output:
  - privacy notice
  - retention/deletion note
- Done when:
  - a user can be told clearly what is stored and how deletion works

### P1-09 Security monitoring thresholds

- Owner: `Ops`
- Status: `todo`
- Task:
  - define which events to monitor
  - define what counts as abnormal auth/security activity
  - define who gets notified and what action is taken
- Output:
  - monitoring note
- Done when:
  - auth abuse and security spikes are not only logged but actionable

## Sprint 3: Architecture and runtime hardening

Goal:

- make V1 stable and maintainable under real use

### P1-10 Runtime dependency map

- Owner: `Engineering`
- Status: `todo`
- Task:
  - document all runtime dependencies
  - document failure impact and fallback behavior
- Include:
  - Vercel
  - Postgres
  - Auth.js secrets
  - Jobindsats API
  - Statbank
  - daily import flow
- Output:
  - dependency map document
- Done when:
  - every critical dependency has an owner and a known failure mode

### P1-11 Background job ownership

- Owner: `Ops`
- Status: `todo`
- Task:
  - define owner and review cadence for:
    - daily imports
    - follow checks
    - translation sync workflows
- Output:
  - operations ownership table
- Done when:
  - no automated job exists without an operational owner

### P1-12 Backup and restore note

- Owner: `Ops`
- Status: `todo`
- Task:
  - document DB backup approach
  - document restore path
  - document who can initiate restore
- Output:
  - backup/restore note
- Done when:
  - restore is documented clearly enough to execute under pressure

### P2-01 Shared server-logic cleanup

- Owner: `Engineering`
- Status: `todo`
- Task:
  - identify duplicated auth/redirect/validation logic across routes and actions
  - centralize repeated behavior where it improves clarity and reduces mistakes
- Done when:
  - critical rules are defined once or in obviously shared helpers

## Sprint 4: Reception UX and QR/mobile handoff

Goal:

- make the public physical flow understandable and safe

### P1-13 QR handoff design

- Owner: `Product`
- Status: `done`
- Task:
  - define where QR appears
  - define what landing URL it uses
  - define the wording around scan/install
  - ensure contrast and size work in real conditions
- Current V1 decision:
  - QR is shown on the home screen in kiosk mode
  - kiosk mode is enabled explicitly with `?kiosk=1`
  - QR hands the user off to the normal locale route without kiosk mode
- Done when:
  - a first-time visitor can discover and use QR without explanation

### P1-14 Kiosk idle reset behavior

- Owner: `Engineering`
- Status: `done`
- Task:
  - define idle timeout
  - define which local UI state resets
  - define how the kiosk returns to home
- Current V1 implementation:
  - kiosk idle behavior runs only when the route is opened with `?kiosk=1`
  - idle timeout is `75` seconds
  - attract mode rotates through up to `5` municipalities
  - each municipality is shown for `10` seconds
  - first touch exits attract mode and resets to the normal home state
- Likely files:
  - `components/home/home-map-explorer.tsx`
  - `components/maps/sjaelland-municipality-map.tsx`
  - kiosk-related layout or top-level state files
- Done when:
  - an abandoned reception session reliably returns to a clean starting state

### P1-15 Touch usability review

- Owner: `Product`
- Status: `todo`
- Task:
  - review tap target sizes
  - review readability at standing distance
  - review touch-only interaction assumptions
  - review whether critical actions are too small or hidden
- Done when:
  - the kiosk experience is usable without keyboard, mouse, or staff instruction

### P1-16 Mobile continuation verification

- Owner: `Engineering`
- Status: `in_progress`
- Task:
  - verify QR opens the correct page
  - verify kiosk route does not leak kiosk behavior into the normal mobile route
  - verify PWA install path on mobile
  - verify register/login/follow flows are practical on phone
- Current verification state:
  - local route verification is documented in `docs/v1-mobile-continuation-verification.md`
  - kiosk route and normal mobile route are isolated correctly in local verification
  - real-device phone QA is still required before this item can be marked done
- Done when:
  - kiosk-to-phone continuation works end-to-end on a real device

## Sprint 5: Documentation round

Goal:

- make the codebase supportable and auditable

### P1-17 Critical module documentation pass

- Owner: `Engineering`
- Status: `done`
- Task:
  - add concise doc headers or comments to critical modules
  - explain purpose, auth assumptions, storage behavior, and risk points
- Files:
  - `auth.ts`
  - `lib/server/auth.ts`
  - `lib/server/auth-actions.ts`
  - `lib/server/rate-limit.ts`
  - `lib/server/security.ts`
  - `lib/server/origin-guard.ts`
  - `lib/server/request-origin.ts`
  - `app/api/follows/route.ts`
  - `app/api/follows/check/route.ts`
  - `app/api/saved-searches/route.ts`
  - `app/api/home-state/route.ts`
- Done when:
  - a maintainer can understand each critical module without rediscovering intent

### P1-18 README and architecture summary refresh

- Owner: `Engineering`
- Status: `done`
- Task:
  - update `README.md`
  - add architecture summary
  - add local setup plus environment overview
- Current V1 coverage:
  - README now documents runtime layers, kiosk entry route, local kiosk testing and critical environment variables
  - README reflects the shared route/client/server/persistence/jobs model instead of the earlier prototype-only framing
- Done when:
  - README reflects the real runtime model and not just the prototype history

### P1-19 Security/compliance docs refresh

- Owner: `Product`
- Status: `done`
- Task:
  - update security, privacy, release, and rollback docs to match final V1 state
- Files:
  - `docs/security-authorization-audit.md`
  - `docs/v1-hardening-verification.md`
  - `docs/privacy-and-compliance-basics.md`
  - `docs/release-operations-checklist.md`
  - `docs/deployment-and-rollback-runbook.md`
- Done when:
  - documentation matches the live product and operating model

### P2-02 Architecture map document

- Owner: `Engineering`
- Status: `todo`
- Task:
  - write a simple architecture map covering route layer, server layer, persistence, jobs, and dependencies
- Done when:
  - a maintainer can orient in the system in under 10 minutes

## Sprint 6: Operations readiness

Goal:

- make V1 run safely after release

### P1-20 Monitoring checklist

- Owner: `Ops`
- Status: `todo`
- Task:
  - define where deployment, app, and job failures are checked
  - define daily and weekly review tasks
- Done when:
  - recurring checks exist and are assigned

### P1-21 Support playbook

- Owner: `Ops`
- Status: `todo`
- Task:
  - write support steps for:
    - user cannot log in
    - user wants deletion
    - kiosk is stuck
    - import data is wrong
    - admin route is inaccessible
- Done when:
  - common incidents can be handled without improvisation

### P1-22 Release and rollback drill

- Owner: `Ops`
- Status: `todo`
- Task:
  - rehearse release checklist
  - rehearse rollback path
  - record what information must be captured during release
- Done when:
  - rollback has been practiced once and not only documented

### P2-03 Secret rotation rehearsal

- Owner: `Ops`
- Status: `todo`
- Task:
  - rehearse rotation of auth-related secret(s)
  - document impact and verification steps
- Done when:
  - secret rotation is understood operationally

## Sprint 7: Pilot QA and go-live decision

Goal:

- verify the real system before reception launch

### P1-23 End-to-end pilot QA

- Owner: `Engineering`
- Status: `todo`
- Task:
  - anonymous browse
  - municipality detail
  - QR scan
  - mobile open
  - install
  - register
  - login
  - follow
  - follow update display
  - admin verification
- Output:
  - pilot QA report
- Done when:
  - all critical V1 journeys are green on real devices

### P1-24 Security verification in deployed environment

- Owner: `Engineering`
- Status: `todo`
- Task:
  - verify production headers
  - verify cookies
  - verify admin/user access separation
  - verify throttling behavior
- Output:
  - deployed security verification note
- Done when:
  - production hardening is verified in the real environment, not only locally

### P1-25 Soft-launch watch plan

- Owner: `Ops`
- Status: `todo`
- Task:
  - define first-week watch windows
  - define what metrics/events are checked daily
  - define who can pause rollout if needed
- Done when:
  - the first week after launch has an active observation plan

## Suggested implementation sequence for Engineering

If engineering work starts now, the recommended technical order is:

1. `P1-05` Host/origin hardening
2. `P1-06` CSP tightening
3. `P1-07` Auth/session configuration review
4. `P1-14` Kiosk idle reset behavior
5. `P1-16` Mobile continuation verification
6. `P1-17` Critical module documentation pass
7. `P1-18` README and architecture summary refresh
8. `P1-23` End-to-end pilot QA
9. `P1-24` Security verification in deployed environment

## Suggested implementation sequence for Product/Ops

1. `P1-01` V1 scope note
2. `P1-02` Ownership map
3. `P1-04` Reception deployment note
4. `P1-08` Privacy and retention package
5. `P1-09` Security monitoring thresholds
6. `P1-13` QR handoff design
7. `P1-15` Touch usability review
8. `P1-20` Monitoring checklist
9. `P1-21` Support playbook
10. `P1-22` Release and rollback drill
11. `P1-25` Soft-launch watch plan

## Minimal go-live set

The minimal set that must be green before V1 pilot release is:

- `P1-01`
- `P1-02`
- `P1-03`
- `P1-04`
- `P1-05`
- `P1-06`
- `P1-07`
- `P1-08`
- `P1-09`
- `P1-10`
- `P1-11`
- `P1-12`
- `P1-13`
- `P1-14`
- `P1-15`
- `P1-16`
- `P1-17`
- `P1-18`
- `P1-19`
- `P1-20`
- `P1-21`
- `P1-22`
- `P1-23`
- `P1-24`
- `P1-25`

## First three tasks to start now

If the team wants the fastest correct start, begin here:

1. `P1-01` V1 scope note
2. `P1-05` Host/origin hardening
3. `P1-13` QR handoff design

That combination locks the target, hardens the trust model, and validates the core reception-to-phone concept early.
