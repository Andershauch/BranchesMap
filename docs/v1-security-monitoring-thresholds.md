# JOBVEJ V1 Security Monitoring Thresholds

Date: 2026-04-18

## Purpose

This note defines the minimum monitoring and response thresholds for `security.*` events in JOBVEJ V1.

It is designed for the actual V1 operating model:

- low traffic
- public-facing reception use
- a small number of account users
- manual operational oversight rather than a full SOC setup

## Signals in scope

The following event families are currently emitted and must be monitored:

- `security.auth_throttled`
- `security.auth_failure`
- `security.origin_rejected`
- `security.unauthorized_request`
- `security.rate_limited`

These events currently come from:

- login and register flows
- authenticated mutation routes
- follow-check endpoint
- Jobindsats discovery endpoint
- jobs and home-state operational APIs

## Review cadence

### Daily review

Run once per working day:

```bash
npm run security:report -- --hours 24
```

Review:

- total event volume
- which event type dominates
- whether the same route, IP, or flow repeats unusually

### Release-day review

Run:

```bash
npm run security:report -- --hours 4
```

Do this:

- before release
- after release
- the next business day after release

### Immediate review

Run immediately if:

- staff reports suspicious login behavior
- the app appears to be under automated probing
- admin routes are unexpectedly inaccessible
- the reception deployment behaves abnormally

## Thresholds

Because V1 traffic is low, thresholds should be conservative.

### Green

Normal background level.

Definition:

- `security.auth_failure`: 0 to 5 in 24 hours
- `security.auth_throttled`: 0 to 1 in 24 hours
- `security.origin_rejected`: 0 in 24 hours
- `security.unauthorized_request`: 0 in 24 hours
- `security.rate_limited`: 0 to 5 in 24 hours

Action:

- record nothing beyond normal daily review

### Amber

Suspicious but not yet clearly hostile.

Definition:

- `security.auth_failure`: 6 to 15 in 24 hours
- `security.auth_throttled`: 2 to 4 in 24 hours
- any `security.origin_rejected`
- any `security.unauthorized_request`
- `security.rate_limited`: 6 to 20 in 24 hours
- repeated events from the same route or repeated metadata pattern over 4 hours

Action:

1. Review recent events in admin UI and `security:report`.
2. Check whether the events map to expected staff testing or release activity.
3. Note the date, route, and likely cause in the operations/support log.
4. Re-check within the same day.

### Red

Likely abuse, misconfiguration, or active incident.

Definition:

- `security.auth_failure`: more than 15 in 24 hours
- `security.auth_throttled`: 5 or more in 24 hours
- 3 or more `security.origin_rejected` in 24 hours
- 2 or more `security.unauthorized_request` in 24 hours
- `security.rate_limited`: more than 20 in 24 hours
- a burst of 5 or more security events of any type within 1 hour
- any pattern that affects login usability for real users

Action:

1. Treat as an operational incident.
2. Review the latest events immediately.
3. Check whether the issue is caused by:
   - release/config error
   - kiosk/device misbehavior
   - external probing or abuse
4. If auth or admin access is affected, pause non-essential changes and do not release new code until the cause is understood.
5. Record the incident and outcome in the operations log.

## Route-specific interpretation

### `security.auth_failure`

Usually means:

- user typo
- repeated guessing
- scripted login attempts

Interpretation for V1:

- a few isolated failures are normal
- clustered failures for the same account or same IP pattern are not

### `security.auth_throttled`

Usually means:

- repeated bad login/register attempts
- abuse or aggressive retry behavior

Interpretation for V1:

- this should be rare
- more than one or two in a day is already notable at V1 scale

### `security.origin_rejected`

Usually means:

- a cross-origin mutation attempt
- broken deployment origin configuration
- unexpected testing setup

Interpretation for V1:

- treat every occurrence as worth review

### `security.unauthorized_request`

Usually means:

- probing of protected operational endpoints
- invalid admin/session expectations

Interpretation for V1:

- treat every occurrence as suspicious until explained

### `security.rate_limited`

Usually means:

- bursty traffic
- probing
- badly behaved client retry loops
- staff/admin testing without pacing

Interpretation for V1:

- small numbers may be harmless
- repeated or clustered numbers should be investigated

## Owner and response model

V1 requires these named roles to be assigned before go-live:

- operations owner
- engineering owner
- admin owner

Minimum response expectation:

- operations owner performs the daily review
- engineering owner is contacted for amber or red technical anomalies
- admin owner is contacted if admin-only routes or follow-check/discovery endpoints are involved

## Minimum tooling for V1

Use both:

- admin UI recent security events view
- CLI report:

```bash
npm run security:report -- --hours 24
```

This is sufficient for V1 manual review, but it is not a substitute for full observability if the rollout grows.

## V1 limitations

The following are still true:

- there is no automated alert delivery yet
- there is no dashboard with historical trend lines
- review is still manual

## Related documents

- `docs/release-operations-checklist.md`
- `docs/security-authorization-audit.md`
- `docs/v1-go-live-plan.md`
