# JOBVEJ V1 Data Retention and Deletion

Date: 2026-04-18

## Purpose

This note defines the concrete V1 retention and deletion position for JOBVEJ.

It is written for controlled pilot operation and support. It is not a full municipal legal package, but it is the operational rule set the team must actually follow before V1 goes live.

## Scope

This note covers:

- user accounts
- follows
- saved searches
- audit and security events
- rate-limit buckets
- imported product data

## V1 retention rules

### 1. Auth session state

- Citizen sessions have a maximum lifetime of 7 days.
- Session refresh/update window is 12 hours.
- Session cookies are expected to be secure in production.

Operational intent:

- keep sign-in persistent enough for normal citizen use on mobile
- avoid long-lived session exposure

### 2. User accounts

Stored data:

- email
- optional name
- role
- password hash
- locale preference

Retention rule for V1:

- retain until the user asks for deletion or support initiates an approved deletion
- no automatic inactivity deletion is implemented in product code in V1
- admin accounts must be reviewed manually and must not be shared accounts

### 3. Follows and saved searches

Stored data:

- followed municipalities
- saved-search records
- associated timestamps and product state

Retention rule for V1:

- retain while the account exists
- delete immediately when the account is deleted
- users may also remove follows and saved searches individually through the product

Implementation note:

- current schema uses cascading delete from `User` to `SavedSearch` and `SearchFollow`

### 4. Audit and security events

Stored data:

- auth events
- security events
- selected admin-sensitive actions
- event metadata and timestamps

Retention rule for V1:

- retain for 180 days as the default operational period
- if an event is part of an active incident or abuse investigation, retention may be extended to up to 365 days
- after the applicable period, events should be pruned during an operations maintenance task

Deletion behavior when a user account is deleted:

- audit rows linked through `userId` are detached from the user record by database relation behavior
- user-specific audit rows with `entityType = User` should have `entityId` redacted as part of the deletion process

### 5. Rate-limit buckets

Stored data:

- derived request-throttling counters
- reset timestamps

Retention rule for V1:

- operational only
- retain no longer than 7 days
- safe to prune regularly

### 6. Imported product data

Stored data:

- Jobindsats import runs
- municipality job snapshots
- translation/product metadata

Retention rule for V1:

- treated as product data, not citizen personal data
- retained according to product and operational need

## Deletion requests

### Standard service target

- user deletion requests should be completed within 30 calendar days
- if the request is straightforward, target same-week completion

### Approved V1 deletion process

1. Confirm which account is being deleted.
2. Confirm the request is legitimate through the agreed support process.
3. Run a dry-run deletion review:
   - `npm run user:delete -- --email user@example.com`
4. Review the output and confirm it matches the intended account.
5. Execute deletion:
   - `npm run user:delete -- --email user@example.com --execute`
6. Record that deletion was completed in the support log or release/support note.

### Admin-account deletion

- admin accounts must not be deleted casually
- review admin access first
- if deletion is still required, execution must be explicit:
  - `npm run user:delete -- --email admin@example.com --execute --allow-admin`

## What the deletion script does

The V1 deletion script:

- finds the user by normalized email
- shows the impact in dry-run mode by default
- blocks admin deletion unless `--allow-admin` is supplied
- redacts `entityId` on `AuditEvent` rows where the deleted user was the direct `User` entity
- deletes the user record
- relies on cascade deletion for follows and saved searches

## V1 limitations

The following are still true in V1:

- there is no user self-service account deletion flow in the product UI
- there is no automated retention pruning job yet
- there is no formal legal workflow embedded in the product itself

## Required operational follow-up

Before V1 goes live, operations must still define:

- the actual support contact channel used in citizen-facing text
- where deletion requests are logged
- who is authorized to execute deletion for normal users
- who is authorized to approve deletion of an admin account

## Related documents

- `docs/privacy-and-compliance-basics.md`
- `docs/compliance-and-security-assessment.md`
- `docs/v1-go-live-plan.md`
