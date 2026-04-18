# JOBVEJ V1 Go-Live Plan

Date: 2026-04-18

## Purpose

This plan defines the concrete path to get JOBVEJ version 1 into controlled production use on reception touch screens with QR-based mobile handoff.

The target operating model for V1 is:

- one or more touch screens in a reception area
- citizens can explore municipalities without logging in
- citizens can scan a QR code and install the app on mobile
- expected traffic is low:
  - up to 20 users per day
  - about 10 percent create a user account
- users who create accounts to follow municipalities must be handled as securely as reasonably possible for V1

This plan is intentionally optimized for:

- controlled rollout, not broad public-sector production scale
- strong practical security around accounts and user data
- stable operations with low manual burden
- a simple, understandable product experience in a public physical setting

## Decision framing

V1 should be treated as a controlled citizen-facing pilot, not as a fully matured municipal production platform.

That means:

- the app can go live if code, operations, privacy basics, and device setup are brought to a coherent baseline
- the app should not go live if security, monitoring, retention, and support responsibilities are still implicit or undocumented

## Go-live principle

The correct order is:

1. lock scope
2. harden the account and runtime surfaces
3. make the reception flow usable end-to-end
4. document operations, privacy, and code
5. run controlled verification
6. release with named ownership and rollback readiness

Do not invert this order. Documentation and QA should validate a stable target, not chase moving product scope.

## Phase 0: Lock the V1 target

Goal:

- define what V1 is and what it is not

Tasks:

1. Freeze the V1 user journeys:
   - anonymous touch-screen browse
   - QR scan to phone
   - install PWA on phone
   - register/login
   - follow municipality
   - receive updated follow state in-app
2. Freeze the physical deployment model:
   - number of reception devices
   - screen orientation
   - browser/app mode
   - network setup
   - who can physically access device settings
3. Freeze the V1 data scope:
   - email
   - optional name
   - follows
   - saved searches
   - security/audit events
4. Freeze the support model:
   - who owns releases
   - who monitors imports
   - who handles citizen support questions
   - who can access admin

Deliverables:

- approved V1 scope note
- named system owner
- named admin owner
- named operations owner

Exit criteria:

- no unresolved product questions remain about the V1 flows
- no new V1 features are added after this point unless they are release blockers

## Phase 1: Security and privacy baseline for account users

Goal:

- protect account holders and reduce avoidable security risk before release

Tasks:

1. Tighten the hosting and origin model:
   - define one canonical production domain
   - stop relying on loosely trusted host headers for app URL construction
   - verify Auth.js callbacks and redirects only use the canonical origin
2. Tighten content security policy:
   - reduce or eliminate `unsafe-inline` where feasible
   - document any remaining CSP exceptions and why they are necessary
3. Review authentication settings:
   - verify `AUTH_SECRET` rotation process exists
   - verify secure cookies are on in production
   - verify session lifetime is acceptable for citizen users
   - verify admin accounts are limited to named email addresses only
4. Strengthen abuse resistance:
   - keep existing login/register throttling
   - add monitoring for spikes in auth failures and `security.*` events
   - define threshold-based response actions
5. Lock down admin access:
   - minimum admin account count
   - no shared admin login
   - confirm admin list is documented and reviewed before release
6. Define data protection basics:
   - retention period for user accounts
   - retention period for follows and saved searches
   - retention period for audit/security events
   - deletion process for user account data on request
7. Publish minimum privacy transparency:
   - what data is stored
   - why it is stored
   - who can access it
   - how a user asks for deletion or support

Deliverables:

- security hardening checklist updated to current code
- privacy notice for V1
- retention/deletion policy note
- incident contact and handling note

Exit criteria:

- canonical production origin is fixed and documented
- admin access model is explicit and minimal
- data retention and deletion rules are written down
- monitoring exists for auth/security anomalies

## Phase 2: Architecture and runtime hardening

Goal:

- make the deployed system stable, understandable, and supportable

Tasks:

1. Confirm architecture boundaries:
   - UI components remain client-side only where interaction requires it
   - auth, persistence, validation, rate limiting, and external integrations remain centralized in `lib/server`
   - scripts remain outside runtime paths
2. Reduce hidden coupling:
   - identify any server logic currently duplicated across routes/actions
   - move shared rules into dedicated server modules
3. Formalize configuration:
   - document every required environment variable
   - document which values are secrets
   - document which env vars are required for local, preview, and production
4. Formalize operational dependencies:
   - Postgres
   - Vercel
   - Auth.js secrets
   - Jobindsats API
   - Statbank dependency
   - daily import workflow
5. Add failure-mode handling:
   - define what the UI should do when external job data is unavailable
   - define what operations should do when daily imports fail
   - define what happens if follow-check jobs fail
6. Verify backup and restore path:
   - database backup method
   - how to restore to a known good state
   - who is authorized to do it

Deliverables:

- architecture note for V1 runtime
- env/config reference
- dependency map
- backup/restore note

Exit criteria:

- every runtime dependency is documented
- every critical background job has an owner and recovery action
- core business rules are centralized, not scattered

## Phase 3: Reception usability and physical deployment flow

Goal:

- make the touch-screen experience obvious, resilient, and low-friction

Tasks:

1. Design the reception landing flow:
   - user understands within 5 seconds what the app is
   - primary CTA is explore map
   - secondary CTA is scan QR and continue on phone
2. Add and verify QR handoff:
   - kiosk QR must point to the canonical production entry URL for the app
   - reception entry URL must use explicit kiosk mode, for example `/da?kiosk=1`
   - mobile handoff target must not keep kiosk mode enabled on the citizen's phone
   - QR must be large enough and high contrast
   - QR must be reachable from the home screen and municipality context where relevant
3. Optimize for touch-screen behavior:
   - large tap targets
   - no hover-only affordances
   - no tiny topbar actions for critical flows
   - clear reset/start-over path after an abandoned session
4. Define kiosk/session-reset behavior:
   - kiosk behavior must be explicitly enabled and not affect the standard mobile route
   - when idle, return to the home state automatically
   - clear any local UI state after timeout
   - prevent a previous visitor from leaving the device in a confusing state
5. Verify mobile continuation flow:
   - QR scan opens correct locale-aware page
   - standard mobile route behaves normally without kiosk overlays or idle reset
   - PWA install flow is understandable
   - follow/register flow is practical on mobile
6. Verify accessibility and clarity:
   - Danish first, with clear language switching
   - high contrast for kiosk conditions
   - readable typography at standing distance
   - clear labels around what requires login and what does not

Deliverables:

- reception UX checklist
- QR placement decision
- kiosk idle/reset specification
- documented kiosk entry URL and mobile handoff rule

Exit criteria:

- a first-time citizen can browse without guidance
- a citizen can move from kiosk to phone without confusion
- the kiosk reliably returns to a clean state
- kiosk-only behavior is isolated from the normal mobile experience

## Phase 4: Documentation round

Goal:

- make the codebase and operations understandable enough that V1 can be maintained safely

This phase is mandatory before go-live.

Tasks:

1. Code documentation pass for critical modules:
   - `auth.ts`
   - `lib/server/auth.ts`
   - `lib/server/auth-actions.ts`
   - `lib/server/rate-limit.ts`
   - `lib/server/origin-guard.ts`
   - `lib/server/request-origin.ts`
   - `lib/server/security.ts`
   - `lib/server/search-follows.ts`
   - `app/api/follows/route.ts`
   - `app/api/follows/check/route.ts`
   - `app/api/saved-searches/route.ts`
   - `app/api/home-state/route.ts`
2. Add documentation where a future maintainer would otherwise guess:
   - why the route exists
   - what auth model it expects
   - what data it reads/writes
   - what abuse controls exist
   - what errors/fallbacks are expected
3. Remove misleading or stale comments.
4. Update top-level docs:
   - README with architecture summary and local setup
   - security/hardening note
   - release operations checklist
   - rollback runbook
   - privacy/compliance basics
5. Add a short architecture map:
   - route layer
   - server layer
   - persistence layer
   - import/background layer
   - external dependencies

Definition of done for documentation:

- a new maintainer can identify ownership, inputs, outputs, and risk on all critical flows without reading the entire codebase

Exit criteria:

- critical runtime modules have useful comments or doc headers
- top-level docs match actual code and operations
- there are no undocumented security-sensitive flows

## Phase 5: Operational readiness

Goal:

- ensure the system can actually be run day-to-day

Tasks:

1. Monitoring setup:
   - deployment failures
   - failed imports
   - failed follow checks
   - spikes in auth failures
   - spikes in `security.*` events
2. Define daily and weekly operations:
   - daily import review
   - weekly security event review
   - periodic admin user review
   - periodic backup verification
3. Define support playbooks:
   - user cannot log in
   - user wants account deleted
   - import data looks wrong
   - kiosk is frozen or in wrong state
4. Define release cadence:
   - who can approve release
   - what checks must pass
   - when rollback is triggered
5. Define secrets handling:
   - where secrets live
   - who can rotate them
   - how rotation is tested

Deliverables:

- operations runbook
- support playbook
- monitoring checklist

Exit criteria:

- all recurring operational tasks have an owner
- alert conditions and response actions are documented
- rollback path has been tested once

## Phase 6: Verification and controlled pilot release

Goal:

- validate the whole flow under realistic conditions before public use

Tasks:

1. Full end-to-end QA:
   - anonymous kiosk flow
   - QR scan to phone
   - install PWA
   - register
   - login
   - follow municipality
   - follow update check
   - admin review
2. Reception simulation:
   - test with the actual touch hardware if possible
   - test standing distance readability
   - test glare and contrast
   - test session reset after inactivity
3. Security verification:
   - verify production cookies and headers
   - verify CSP in deployed environment
   - verify private routes are `no-store`
   - verify admin routes are inaccessible to normal users
   - verify auth throttling works
4. Operations drill:
   - simulate failed import
   - simulate suspicious auth spike
   - simulate rollback decision
5. Soft launch:
   - release to limited reception usage first
   - monitor first week closely
   - only then treat V1 as stable

Deliverables:

- V1 pilot QA report
- security verification note
- first-week watch plan

Exit criteria:

- all critical flows pass on real devices
- no unresolved high-severity security or usability issues remain
- rollback path is known and practical

## Priority order

The execution priority for V1 should be:

1. Phase 0: scope lock
2. Phase 1: security and privacy baseline
3. Phase 2: architecture and runtime hardening
4. Phase 3: reception usability and QR/mobile flow
5. Phase 4: documentation round
6. Phase 5: operational readiness
7. Phase 6: verification and controlled release

This order matters because:

- usability work should not be finalized before the runtime and trust model are stable
- documentation should describe the final V1 shape, not a moving target
- release verification only has value when operations and rollback are already defined

## Immediate execution backlog

These are the concrete next actions to start with now.

### Step 1: Governance and scope lock

1. Write a one-page V1 scope note.
2. Confirm system owner, admin owner, and operations owner.
3. Confirm the exact reception-device setup and canonical production domain.

### Step 2: Security hardening decisions

1. Review and tighten host/origin handling.
2. Review and tighten CSP.
3. Write retention/deletion rules.
4. Write the user-facing privacy text.

### Step 3: Kiosk and QR flow

1. Define home-screen QR placement.
2. Define kiosk entry URL and confirm it uses explicit kiosk mode.
3. Define kiosk idle timeout and reset behavior.
4. Run one end-to-end test from touch screen to installed phone app.

### Step 4: Documentation pass

1. Update README and architecture overview.
2. Document critical auth/security modules.
3. Update operations, rollback, and security notes to reflect final V1.

### Step 5: Pilot readiness

1. Run production-like QA.
2. Run a rollback drill.
3. Release to controlled reception usage.

## Release gate

V1 is ready to go live only when all of the following are true:

- V1 scope is frozen
- canonical production origin is fixed
- auth and admin model are documented and verified
- retention, deletion, and privacy basics are written down
- kiosk QR flow works on real devices
- kiosk reset behavior exists
- kiosk behavior is isolated to the kiosk entry route
- critical modules and operations are documented
- monitoring and response ownership are defined
- rollback path has been verified
- end-to-end pilot QA is green

## Explicit non-goals for V1

The following should not block V1 unless the rollout context changes:

- full municipal enterprise governance package
- advanced identity features such as MFA for citizens
- large-scale public traffic engineering
- complex analytics stack
- fully automated compliance platform

Those belong to a later production-hardening phase if the system expands beyond the current controlled use case.
