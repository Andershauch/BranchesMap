# JOBVEJ V1 Background Job Ownership

Date: 2026-04-18

## Purpose

This document defines the minimum ownership and review expectations for recurring V1 background jobs.

## Jobs in scope

The current V1 recurring jobs and operational flows are:

1. daily Jobindsats import batch
2. follow-check operational path
3. Jobindsats title translation sync flows

## Ownership model

The following named roles must exist before go-live:

- operations owner
- engineering owner
- admin owner

This document defines responsibility boundaries even where final human names are still pending.

## 1. Daily Jobindsats import batch

Primary mechanism:

- GitHub Actions workflow: `.github/workflows/jobindsats-daily.yml`
- script entrypoint: `npm run jobindsats:daily`

Operational owner:

- operations owner

Technical owner:

- engineering owner

Review cadence:

- daily on working days
- additional review after any failed run

What must be checked:

- latest run succeeded
- no repeated failures are accumulating
- imported data still appears current enough for pilot use

Escalate when:

- latest run fails
- failures repeat
- imported municipality data looks clearly stale or wrong

## 2. Follow-check operational path

Primary mechanism:

- `POST /api/follows/check`
- may be triggered operationally with admin session or `FOLLOW_CHECK_SECRET`

Operational owner:

- admin owner

Technical owner:

- engineering owner

Review cadence:

- review availability weekly
- review immediately if follow updates appear wrong or missing

What must be checked:

- endpoint remains callable by the approved operational path
- rate limiting and auth behavior are still correct
- follow updates still behave as expected in the app

Escalate when:

- endpoint becomes inaccessible unexpectedly
- auth/authorization behavior changes unexpectedly
- follow updates stop appearing correctly

## 3. Translation sync and maintenance flows

Primary mechanisms:

- `npm run jobindsats:translations:sync-db`
- `npm run jobindsats:translations:compile`
- `npm run jobindsats:translations:populate-new-drafts`
- admin translation tooling

Operational owner:

- admin owner

Technical owner:

- engineering owner

Review cadence:

- weekly
- after import/schema/content changes that affect title flows

What must be checked:

- translation rows are still available
- new imported titles are being surfaced correctly
- admin translation tooling remains usable

Escalate when:

- translation editor breaks
- new imported titles stop appearing
- translation sync scripts fail repeatedly

## Minimum ownership rule

No job should be considered operationally covered unless:

- one role owns its routine review
- one role owns technical diagnosis when it fails

## Current status

This document defines the ownership model and review cadence.

If named humans are not yet assigned, the ownership map is still incomplete and must be finalized through:

- `docs/v1-ownership-map.md`

## Related documents

- `docs/v1-monitoring-checklist.md`
- `docs/v1-support-playbook.md`
- `docs/v1-ownership-map.md`
