# JOBVEJ V1 Release and Rollback Drill

Date: 2026-04-18

## Purpose

This drill defines how V1 release and rollback readiness should be rehearsed before pilot go-live.

The goal is not to create a full incident-management framework. The goal is to prove that the team can:

- release intentionally
- verify the deployed app quickly
- decide whether rollback is needed
- execute the rollback path without improvisation

## Required participants

The drill should involve at least:

- operations owner
- engineering owner

Recommended:

- admin owner

## Preconditions

Before running the drill, confirm:

- current production deployment is healthy
- `main` contains the intended release state
- Vercel access is available to the operators involved
- GitHub access is available to the operators involved
- the standard release checklist is up to date

## Drill scope

The drill has two parts:

1. release rehearsal
2. rollback rehearsal

The drill may be run as:

- tabletop only, using the current healthy deployment and documented steps
- or live, by releasing a low-risk change and then rolling back in a controlled way

For V1, a tabletop drill is acceptable if a live rollback is judged too disruptive before pilot usage starts.

## Part 1: Release rehearsal

### Objective

Prove that the team can release and verify the most important citizen and admin paths.

### Steps

1. Confirm local release gates:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npx next build`
2. Confirm production configuration expectations:
   - `APP_BASE_URL`
   - `AUTH_SECRET`
   - `ADMIN_USER_EMAILS`
3. Push the intended release commit to `main`.
4. Wait for Vercel production deployment to finish.
5. Record:
   - commit SHA
   - deployment URL
   - deployment timestamp
6. Run the post-deploy checks:
   - `/da`
   - `/da?kiosk=1`
   - one municipality page
   - login page
   - admin page
   - `/manifest.webmanifest`
   - `/sw.js`
7. Run:

```bash
npm run security:report -- --hours 4
```

### Pass criteria

- deployment completes successfully
- required routes load
- kiosk route works
- no immediate auth/admin regression is observed
- no unexpected security event spike appears

## Part 2: Rollback rehearsal

### Objective

Prove that the team can choose and execute a rollback path fast enough for V1 support reality.

### Rollback options to rehearse

#### Option A: redeploy the last known good Vercel deployment

Use when:

- the problem is deployment-specific
- the last good deployment is already known

Rehearse:

1. identify the currently healthy previous production deployment
2. identify who is authorized to promote/redeploy it
3. confirm how that deployment would be restored
4. confirm which post-rollback checks would be run

#### Option B: revert the bad commit on `main`

Use when:

- the bad change is known
- revert is safer than promoting an older deployment

Rehearse:

1. identify the bad commit SHA
2. identify the revert command path
3. confirm who pushes the revert commit
4. confirm how the reverted deployment would be verified

### Post-rollback verification checklist

After either rollback path, confirm:

- `/da` loads
- `/da?kiosk=1` loads
- QR card is visible on kiosk route only
- login page loads
- admin route loads for admin user
- latest production deployment is healthy in Vercel

## What must be recorded during the drill

The drill output should capture:

- drill date and participants
- deployment commit SHA used for rehearsal
- chosen rollback method
- how long it took to identify the rollback target
- how long it took to describe the execution path
- which checks were run
- any ambiguities or missing permissions/tools discovered
- follow-up actions required

## Drill log template

Use the template below for the first V1 drill and for later refresh drills.

```md
# JOBVEJ V1 Release And Rollback Drill Log

Date:
Participants:
Drill type: tabletop | live

## Release rehearsal

- Release commit SHA:
- Production deployment URL:
- Deployment timestamp:
- Local gates checked:
  - [ ] npm run lint
  - [ ] npx tsc --noEmit
  - [ ] npx next build
- Production config checked:
  - [ ] APP_BASE_URL
  - [ ] AUTH_SECRET
  - [ ] ADMIN_USER_EMAILS

## Post-deploy checks

- [ ] /da
- [ ] /da?kiosk=1
- [ ] municipality page
- [ ] login page
- [ ] admin page
- [ ] /manifest.webmanifest
- [ ] /sw.js
- [ ] npm run security:report -- --hours 4

Notes:

## Rollback rehearsal

- Preferred rollback method:
- Last known good deployment identified:
- Bad commit identification path:
- Revert path described:
- Post-rollback checks reviewed:
  - [ ] /da
  - [ ] /da?kiosk=1
  - [ ] QR only on kiosk route
  - [ ] login page
  - [ ] admin page
  - [ ] healthy production deployment visible in Vercel

## Timings

- Time to identify rollback target:
- Time to describe execution path:

## Findings

- Ambiguities:
- Missing permissions or tools:
- Follow-up actions:

## Result

- Drill result: pass | pass with follow-up | fail
- Approved by:
```

## Current V1 decision

For V1 pilot readiness, a documented drill log using the template above is accepted as the minimum operational artifact if a live rollback rehearsal is not performed before pilot start.

## Minimum success criteria

`P1-22` should be considered complete when:

- the team can name the preferred rollback method for V1
- the team can identify the last known good deployment quickly
- the team can identify the bad commit quickly
- the post-release and post-rollback checks are explicit
- any permission or ownership gaps discovered in the drill are documented
- a drill log exists, even if the first V1 pass is tabletop rather than live

## Expected V1 decision rule

For V1, the preferred rollback method should usually be:

- redeploy the last known good Vercel deployment

Use commit revert when:

- the bad change is clearly isolated
- the revert path is faster or more reliable than deployment promotion

## Follow-up after the drill

If the drill exposes gaps, update:

- `docs/deployment-and-rollback-runbook.md`
- `docs/release-operations-checklist.md`
- `docs/v1-support-playbook.md`
- `docs/v1-go-live-backlog.md`

## Related documents

- `docs/deployment-and-rollback-runbook.md`
- `docs/release-operations-checklist.md`
- `docs/v1-support-playbook.md`
- `docs/v1-monitoring-checklist.md`
