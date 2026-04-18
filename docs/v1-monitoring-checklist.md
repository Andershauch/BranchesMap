# JOBVEJ V1 Monitoring Checklist

Date: 2026-04-18

## Purpose

This checklist defines where V1 monitoring actually happens and which recurring checks must be performed.

It is intentionally practical for the real V1 operating model:

- low traffic
- manual operations oversight
- Vercel-hosted web app
- GitHub Actions-driven daily import job

## Monitoring surfaces

The current V1 monitoring surface is split across four places:

1. Vercel production deployment view
   - use for deployment success/failure
   - use for runtime errors visible in logs
   - use for environment/config regressions after deploy

2. GitHub Actions workflow history
   - use for daily import job health
   - workflow: `.github/workflows/jobindsats-daily.yml`

3. Admin UI recent security events
   - use for quick inspection of recent security-related audit events

4. CLI operational scripts
   - `npm run security:report -- --hours 24`
   - `npm run user:delete -- --email user@example.com`

## Daily checklist

Run once per working day.

### 1. Check production deployment health

Where:

- Vercel project dashboard

Confirm:

- latest production deployment is healthy
- no unexpected failed production deployment attempts occurred
- no obvious runtime/config regressions are visible

### 2. Check daily import workflow

Where:

- GitHub Actions
- workflow: `Jobindsats Daily Import`

Confirm:

- latest scheduled or manual run succeeded
- no repeated failures are piling up
- failure, if any, has a known reason and owner

### 3. Review security events

Run:

```bash
npm run security:report -- --hours 24
```

Confirm:

- event volume is in the expected V1 range
- no unexpected `security.origin_rejected`
- no unexpected `security.unauthorized_request`
- no suspicious auth failure or throttling pattern

Use thresholds from:

- `docs/v1-security-monitoring-thresholds.md`

### 4. Quick product sanity check

Confirm:

- `/da` loads
- `/da?kiosk=1` loads
- QR handoff still appears on kiosk route
- kiosk route still resets correctly after idle time if this is feasible to verify that day

## Weekly checklist

Run once per week.

### 1. Review recurring failures and anomalies

Check:

- Vercel deployment history
- GitHub Actions history
- security event pattern for the last 7 days

Goal:

- identify whether issues are isolated or recurring

### 2. Review admin-sensitive operational access

Confirm:

- `ADMIN_USER_EMAILS` still reflects named current admins
- no unexpected admin-access problem has been reported
- operational secrets have not drifted from expected V1 configuration

### 3. Review support-relevant operational readiness

Confirm:

- deletion command still works in dry-run mode
- follow-check operational path is still available
- release and rollback notes still match the current deployment model

Suggested commands:

```bash
npm run user:delete -- --email nobody@example.com
npm run security:report -- --hours 168
```

## Release-day checklist

In addition to the standard release checklist, confirm:

1. latest production deploy completed successfully
2. kiosk route still works on the deployed domain
3. run:

```bash
npm run security:report -- --hours 4
```

4. latest daily import state is acceptable before and after release

## Ownership

Minimum named owners required:

- operations owner
- engineering owner
- admin owner

Expected cadence ownership:

- operations owner:
  - daily monitoring review
  - weekly review
- engineering owner:
  - technical investigation when deployment, runtime, or auth anomalies appear
- admin owner:
  - review when admin-only routes, follow-checks, or security events involve protected operational flows

## What counts as a monitoring failure

Treat the following as failures of the monitoring routine itself:

- no one reviews the daily import outcome
- no one reviews security events for multiple working days
- a failed production deploy goes unnoticed
- kiosk route regressions are only discovered by citizens rather than by review

## Related documents

- `docs/v1-security-monitoring-thresholds.md`
- `docs/release-operations-checklist.md`
- `docs/deployment-and-rollback-runbook.md`
- `docs/v1-go-live-backlog.md`
