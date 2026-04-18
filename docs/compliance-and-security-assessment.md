# Compliance and Security Assessment

Date: 2026-04-16

## Scope

This note assesses the current security and compliance posture of the application based on the implemented codebase and current deployment model.

It focuses on:

- authentication and authorization
- protection of user-related data
- operational abuse resistance
- suitability for use in a Danish municipal context

## Executive summary

The application is no longer a loose prototype from a security perspective. It has a solid baseline:

- Auth.js-based authentication
- role-based admin authorization
- server-side authorization on private and admin routes
- origin checks on mutation routes
- rate limiting on sensitive endpoints
- CSP and baseline security headers
- security audit events
- authorization audit documentation

That said, it is not yet at a level where it should be considered municipal-production-ready for Danish citizens.

The main reason is not a single critical code flaw. The main gap is the combination of:

- missing operational observability and alerting
- incomplete governance around retention, deletion and incident handling
- lack of a documented privacy/compliance package for citizen-facing use

## Current strengths

### Authentication and authorization

- Auth.js is used as the authentication layer.
- Admin access is role-based instead of token-cookie based.
- Private pages are gated server-side.
- Admin pages and admin write actions are gated server-side.
- Mutation routes are scoped to the current user in storage operations.

### Request hardening

- mutation origin checks exist on authenticated write routes
- distributed database-backed rate limiting is implemented
- login and registration throttling is in place
- baseline CSP and security headers are enabled
- private views use `no-store`

### Auditability

- security-relevant events are written as audit events
- admin can inspect recent `security.*` events in the admin UI
- route-by-route authorization audit exists in:
  - `docs/security-authorization-audit.md`

## Key risks

### 1. Personal data exposure risk

The app stores and processes at least:

- email
- optional name
- municipality follow relationships
- saved searches
- audit/security events tied to users

This means the app processes personal data. In a municipal context, that requires explicit governance beyond code-level security.

Current risk:

- V1 retention/deletion and privacy notes now exist, but are still operational documents rather than fully embedded product flows
- there is no documented data inventory tied to legal basis and purpose limitation

Impact:

- elevated compliance risk under GDPR-style public-sector expectations

### 2. Operational abuse and incident response risk

Rate limiting and audit events now exist, but operational maturity is still limited.

Current risk:

- no alerting on abnormal `security.*` event patterns
- no documented incident workflow
- no explicit retention strategy for audit/security logs

Impact:

- suspicious access patterns may be recorded but not acted on in time

### 3. Session and account abuse risk

Current auth posture is materially improved, but not yet maximal.

Current risk:

- auth abuse protection is good, but not yet equivalent to a hardened identity platform setup with advanced anomaly handling
- there is no dedicated user-facing account recovery / verification / suspicious login process

Impact:

- acceptable for controlled rollout
- weaker than what is expected for a broad citizen-facing deployment

### 4. Content and external dependency risk

The application depends on external data and deployment services.

Current risk:

- imported data quality affects user-facing output
- secrets and deployment configuration remain operationally sensitive
- upstream API availability can affect freshness of data

Impact:

- low direct confidentiality impact
- medium availability and integrity impact

## Municipal-context assessment

### Current suitability

Appropriate for:

- internal demos
- pilot testing
- limited controlled rollout
- product validation with non-sensitive usage assumptions

Not yet appropriate for:

- broad municipal public launch
- handling sensitive citizen-specific workflows
- any deployment that assumes mature public-sector governance out of the box

## What would be needed for municipal readiness

### Compliance package

1. Data inventory
   - what personal data is stored
   - where it is stored
   - why it is stored
   - who can access it

2. Retention and deletion policy
   - users
   - follows
   - saved searches
   - audit events
   - security events

3. Privacy and transparency
   - privacy notice
   - lawful basis / purpose description
   - user-facing explanation of what is tracked

4. Supplier and hosting review
   - hosting
   - database
   - authentication layer
   - external data providers

5. DPIA / risk review
   - especially if the app becomes citizen-facing and behavior data is tied to identity

### Security maturity package

1. Alerting on `security.*` events
2. Retention and pruning for audit/security logs
3. Regular authorization review for new features
4. Backup / restore / incident runbook
5. Optional stronger identity controls if rollout broadens

## Practical risk rating

### Confidentiality

Current: medium

Reason:

- user data is not highly sensitive by design
- controls are decent
- compliance/governance is still incomplete

### Integrity

Current: medium to good

Reason:

- admin and user write paths are server-gated
- imported data remains a dependency and ranking/mapping quality still affects output

### Availability

Current: medium

Reason:

- app is deployable and stable
- still dependent on background imports, deployment config and external services

## Recommended next steps

### Immediate

1. Write a formal data inventory
2. Define retention and deletion rules
3. Add alerting/monitoring on security events

### Near term

1. Add compliance-oriented product documentation
2. Review incident response and backup expectations
3. Review supplier/data processor posture for actual deployment context

### Before municipal production use

1. Complete privacy/compliance pack
2. Validate operational monitoring
3. Re-run security review after final feature scope is known

## Bottom line

The application has a strong security baseline for a mature prototype.

It is not yet ready to be treated as a municipal citizen-facing production system, not because the code is obviously unsafe, but because compliance, governance, retention, observability and incident handling are not yet complete enough for that context.
