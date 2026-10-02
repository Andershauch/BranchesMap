# JOBVEJ V1 Backup and Restore Note

Date: 2026-10-02

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

Read-only Neon inspection on 2026-10-02 found no configured snapshot schedules for the Production or staging branches. The Production branch reports six hours of history retention (`history_retention_seconds: 21600`) on plan `free_v3`.

On 2026-10-02, a restore drill succeeded from staging snapshot `before-account-verification-schema` to isolated branch `staging-restore-drill-2026-10-02`. Read-only checks confirmed that the restored branch contained the expected 43 municipalities, 387 demo jobs, 43 import snapshots, 293 industry categories, and 2,009 top titles. The snapshot had one user while current staging has two, consistent with its earlier capture time. The drill branch expires automatically on 2026-10-03 at 09:40 UTC. No Production settings or data were changed.

Neon rejected creation of another manual snapshot with `snapshots limit exceeded`; the existing staging snapshot was left untouched and no plan or billing change was made. As a separate Production check, an isolated branch `production-restore-drill-2026-10-02` was forked from Production at LSN `0/13C4FA10` (`2026-10-02T09:19:28Z`) and set to expire automatically on 2026-10-03 at 10:00 UTC. Read-only checks on the copy returned 43 municipalities, 387 demo jobs, 258 import snapshots, 1,750 categories, 12,046 top titles, and 8 users. This confirms that Neon can create a branch from current Production state; it does not test a saved Production snapshot or a restore to an older recovery point.

The staging snapshot drill and Production branch-fork check verify useful recovery mechanics but do not prove that a saved Production snapshot can be restored or establish suitable retention. The owner states Production currently has no users other than themselves and accepts the existing configuration provisionally while that remains true. Before opening the site to other users, operations must confirm Production recovery points, retention, restore target and procedure, and agree an acceptable recovery-point objective. Production settings have not been changed.

## Related documents

- `docs/deployment-and-rollback-runbook.md`
- `docs/v1-monitoring-checklist.md`
- `docs/v1-support-playbook.md`
