# JOBVEJ V1 Support Playbook

Date: 2026-04-18

## Purpose

This playbook defines the minimum response steps for common V1 support incidents.

It is written for the actual V1 setup:

- reception kiosk usage
- QR handoff to mobile
- low traffic
- manual operations support

## Support roles

The following roles must be assigned before go-live:

- support/operations owner
- engineering owner
- admin owner

Escalation rule:

- support handles first triage
- engineering handles technical diagnosis and fixes
- admin owner is involved when admin-only access or operational endpoints are affected

## Incident 1: User cannot log in

### Likely causes

- wrong password
- wrong email
- temporary throttling after repeated failed attempts
- deployment/config regression affecting auth

### First response

1. Confirm the user is on the correct deployed URL.
2. Confirm whether the user can still reach the login page.
3. Ask whether the problem is:
   - wrong credentials
   - error after submit
   - page not loading

### Checks

1. Review recent security events:

```bash
npm run security:report -- --hours 24
```

2. Check for:
   - `security.auth_failure`
   - `security.auth_throttled`
3. Check whether the production deployment is healthy in Vercel.

### Resolution path

- if isolated bad credentials seem likely:
  - ask the user to retry carefully
- if throttling is likely:
  - wait for the rate-limit window to clear before retrying
- if multiple users are affected:
  - escalate to engineering immediately

### Escalate immediately if

- login page fails to load
- multiple users cannot log in
- admin access is also broken
- red-level security threshold is reached

## Incident 2: User wants account deletion

### First response

1. Confirm which account is being deleted.
2. Confirm the request is legitimate through the agreed support process.
3. Record the request in the support log.

### Execution

Dry run:

```bash
npm run user:delete -- --email user@example.com
```

Execute:

```bash
npm run user:delete -- --email user@example.com --execute
```

### Important notes

- default mode is dry-run
- do not delete an admin account casually
- admin deletion requires explicit approval and:

```bash
npm run user:delete -- --email admin@example.com --execute --allow-admin
```

### Completion

1. Confirm the deletion command completed successfully.
2. Record the completion date in the support log.
3. If the user is waiting for confirmation, send the agreed support confirmation.

## Incident 3: Kiosk is stuck or in the wrong state

### Symptoms

- map is frozen
- QR is missing from kiosk route
- kiosk does not reset after idle time
- the wrong page is open
- the device appears to be left in a previous visitor's flow

### First response

1. Confirm the kiosk is on the correct route:
   - `/da?kiosk=1`
2. Refresh the page.
3. Wait long enough to confirm idle reset still works.
4. Confirm QR card is visible on the kiosk route.

### Checks

- verify `/da?kiosk=1` loads
- verify `/da` still loads normally
- verify the kiosk route still differs from the normal route
- verify latest production deployment is healthy

### Resolution path

- if simple refresh fixes the issue:
  - record it and continue monitoring
- if the kiosk route is wrong:
  - restore the correct bookmarked/start URL
- if the deployed app is broken:
  - escalate to engineering

### Escalate immediately if

- kiosk route no longer shows QR
- kiosk no longer resets after idle time
- multiple kiosk devices show the same issue
- issue started right after deployment

## Incident 4: Import data looks wrong

### Symptoms

- municipality values look stale
- jobs or industries appear obviously wrong
- translation rows appear broken
- a daily import appears missing

### First response

1. Confirm which municipality or data area looks wrong.
2. Check whether the problem is:
   - one municipality
   - many municipalities
   - titles/translations only
   - a missing daily update

### Checks

1. Review the latest GitHub Actions run for:
   - `Jobindsats Daily Import`
2. Confirm whether the last scheduled run succeeded.
3. Check whether the issue started immediately after an import or release.

### Resolution path

- if the latest import failed:
  - treat as an operations issue
  - assign owner before next business day
- if import succeeded but data still looks wrong:
  - escalate to engineering for data inspection
- if translation rows are affected:
  - involve admin owner if admin translation tooling is needed

### Escalate immediately if

- the issue affects multiple municipalities
- the latest import workflow failed repeatedly
- municipality presentation is clearly misleading to citizens

## Incident 5: Admin route is inaccessible

### Symptoms

- admin user cannot access admin page
- admin route redirects unexpectedly
- operational endpoint requiring admin access fails

### First response

1. Confirm the user is using the correct admin account.
2. Confirm the user is on the correct deployed domain.
3. Confirm the route itself loads for non-admin users only as a redirect and not as a hard failure.

### Checks

1. Confirm `ADMIN_USER_EMAILS` is still correct in production configuration.
2. Review recent security events:

```bash
npm run security:report -- --hours 24
```

3. Check for:
   - `security.unauthorized_request`
   - auth-related failure patterns
4. Check latest production deployment health in Vercel.

### Resolution path

- if the account is not on the allowlist:
  - correct configuration through normal change control
- if admin access broke after deployment:
  - escalate to engineering immediately
- if only one admin account is affected:
  - verify identity and session state first

### Escalate immediately if

- all admins lose access
- follow-check operational path is blocked unexpectedly
- admin route failure appears together with other auth failures

## Support log minimum fields

Every handled incident should record:

- date and time
- incident type
- route or surface affected
- likely cause
- action taken
- owner
- whether escalation was required
- outcome

## Related documents

- `docs/v1-monitoring-checklist.md`
- `docs/v1-security-monitoring-thresholds.md`
- `docs/v1-data-retention-and-deletion.md`
- `docs/deployment-and-rollback-runbook.md`
