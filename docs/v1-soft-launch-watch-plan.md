# JOBVEJ V1 Soft-Launch Watch Plan

Date: 2026-04-18

## Purpose

This plan defines how the first week of V1 pilot usage should be watched after launch.

The purpose is to keep the rollout controlled and to detect kiosk, auth, deployment, and import issues before they affect too many citizens.

## Scope

This watch plan covers the first 7 days after pilot launch.

It is designed for the expected V1 scale:

- low daily traffic
- reception kiosk usage
- QR handoff to mobile
- a small number of account creations

## Required owners

Before soft launch begins, the following roles must be assigned:

- operations owner
- engineering owner
- admin owner

## Daily watch window

For the first week, perform one explicit review each day.

Recommended timing:

- once shortly after the reception opens or the first expected usage period
- once after the daily import workflow has completed if import freshness matters that day

## What must be checked every day

### 1. Production deployment health

Where:

- Vercel production dashboard

Confirm:

- latest production deployment is healthy
- no unexpected production failures occurred

### 2. Kiosk route health

Confirm:

- `/da?kiosk=1` loads
- QR card is visible on kiosk route
- kiosk route still differs from the normal route
- idle reset still behaves as expected if feasible to test that day

### 3. Normal route health

Confirm:

- `/da` loads
- normal route does not show kiosk-only UI

### 4. Security event review

Run:

```bash
npm run security:report -- --hours 24
```

Review against:

- `docs/v1-security-monitoring-thresholds.md`

### 5. Daily import review

Where:

- GitHub Actions
- workflow: `Jobindsats Daily Import`

Confirm:

- latest run succeeded
- no repeated import failure exists

### 6. Support issues reported since previous review

Check:

- login problems
- kiosk problems
- QR handoff problems
- incorrect municipality data
- admin-access issues

Use:

- `docs/v1-support-playbook.md`

## Specific watch items for the first week

Because this is a reception pilot, the highest-signal risks are:

- kiosk route stops resetting cleanly
- QR opens the wrong URL
- QR keeps kiosk mode on the phone
- login and registration fail unexpectedly
- daily import stops refreshing data
- admin-only operational paths fail silently

## Pause conditions

The rollout should be paused or limited immediately if any of the following occur:

1. kiosk route is unusable for real visitors
2. QR handoff opens the wrong route or keeps kiosk-only behavior on mobile
3. multiple users cannot log in
4. latest production deployment is unhealthy and affects citizen-facing routes
5. red-level security threshold is reached
6. imported municipality data is clearly wrong across multiple municipalities

## Escalation path

### Operations owner

Responsible for:

- daily watch review
- first triage of issues
- deciding whether to involve engineering or admin owner

### Engineering owner

Involve when:

- kiosk route is broken
- auth is broken
- production deployment is unhealthy
- data/import behavior is technically suspicious
- security event review reaches amber or red patterns

### Admin owner

Involve when:

- admin-only routes are affected
- follow-check/discovery operations are involved
- translation/admin workflows appear broken

## What must be logged each day

Record at minimum:

- date
- reviewer name
- deployment status
- kiosk route status
- normal route status
- latest import status
- security review result
- support issues observed
- whether escalation was required
- final daily watch result:
  - green
  - watch closely
  - pause rollout

## End-of-week decision

At the end of the first 7 days, the team should decide whether V1 is:

- stable enough to continue under normal monitoring cadence
- still in extended watch mode
- paused pending fixes

Decision inputs:

- number of support incidents
- kiosk reliability
- QR/mobile continuation reliability
- auth reliability
- import reliability
- security event pattern

## Related documents

- `docs/v1-monitoring-checklist.md`
- `docs/v1-security-monitoring-thresholds.md`
- `docs/v1-support-playbook.md`
- `docs/release-operations-checklist.md`
