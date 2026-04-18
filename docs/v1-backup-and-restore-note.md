# JOBVEJ V1 Backup and Restore Note

Date: 2026-04-18

## Purpose

This note defines the minimum backup and restore position required for V1.

It is not a full disaster-recovery program. It is the minimum operational baseline needed so the team can answer:

- what data exists
- what must be restorable
- who is allowed to restore

## Systems in scope

The backup/restore concern for V1 is primarily:

- Postgres data behind `DATABASE_URL`

Application code itself is already versioned in GitHub and deployed through Vercel, so the critical irreplaceable operational state is database state.

## Data that must be considered restorable

The V1 database contains:

- users
- follows
- saved searches
- audit/security events
- import runs
- municipality import snapshots
- translation rows
- rate-limit buckets

## Minimum V1 backup position

Before pilot go-live, operations must confirm that the Postgres provider in use has an available backup capability or managed restore capability.

Minimum expectation:

- backups exist outside the running app process
- restore can be initiated by an authorized operator
- the team knows how to restore to a known good point or snapshot

## Restore authorization

Restore must not be a casual action.

Minimum required approval:

- operations owner
- engineering owner

If the restore would affect live citizen data during pilot usage, the system owner should also be informed or approve according to local practice.

## When restore should be considered

Restore should be considered when:

- production data is corrupted
- destructive operational error occurred
- import or admin workflows caused unrecoverable bad state
- database outage requires recovery to a known good state

Restore should not be the first answer for:

- a normal deploy regression
- a route bug that can be fixed by rollback
- isolated user-support issues

## Preferred order of response

1. determine whether the issue is code/deployment or data
2. if code/deployment:
   - use release rollback first
3. if data corruption or unrecoverable bad state:
   - evaluate DB restore path

## Minimum information to capture before restore

Record:

- reason for considering restore
- impacted data or feature area
- current production deployment commit SHA
- current time/date
- intended restore point or backup snapshot
- approving owner(s)

## Minimum verification after restore

After any restore, confirm:

- `/da` loads
- `/da?kiosk=1` loads
- login works
- follow/save behavior works
- admin home-map works
- import/admin-sensitive pages load

## Current status

This note defines the restore decision model, but it does not by itself prove that the DB provider backup configuration is present.

That final confirmation must still be provided by operations for the actual Postgres environment in use.

## Related documents

- `docs/deployment-and-rollback-runbook.md`
- `docs/v1-monitoring-checklist.md`
- `docs/v1-support-playbook.md`
