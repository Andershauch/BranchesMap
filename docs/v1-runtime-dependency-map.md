# JOBVEJ V1 Runtime Dependency Map

Date: 2026-04-18

## Purpose

This document defines the critical runtime dependencies for JOBVEJ V1 and the expected failure impact for each.

It is written for pilot operations, support, and release readiness.

## Dependency overview

The current V1 runtime depends on:

1. Vercel production hosting
2. Postgres via `DATABASE_URL`
3. Prisma client/runtime
4. Auth configuration and secrets
5. Jobindsats import pipeline
6. GitHub Actions daily import workflow
7. Statbank live-estimate integration

## 1. Vercel production hosting

Used for:

- serving the public web app
- serving kiosk and mobile routes
- serving API routes

Failure impact:

- citizen-facing app becomes unavailable
- kiosk route becomes unavailable
- auth and admin routes become unavailable

Primary signals:

- failed production deployment
- runtime errors in Vercel
- kiosk or `/da` route no longer loading

Fallback / recovery:

- use documented rollback path
- redeploy last known good production deployment if required

## 2. Postgres via `DATABASE_URL`

Used for:

- users
- follows
- saved searches
- audit events
- import snapshots
- translation rows
- rate-limit buckets

Failure impact:

- login/register may fail
- follow/save operations may fail
- home-state and admin review data may fail
- import and operational scripts may fail

Primary signals:

- Prisma initialization errors
- failed route handlers touching DB
- failed import workflow runs

Fallback / recovery:

- no meaningful V1 fallback for DB write features
- public pages may still partly render from static/mock-backed data, but user/account features should be treated as degraded

## 3. Prisma client/runtime

Used for:

- all structured application persistence
- script-based operational commands

Failure impact:

- same practical impact as DB failure for most critical flows

Primary signals:

- Prisma runtime errors
- script failures in imports, deletion, or reporting

Fallback / recovery:

- none beyond fixing DB connectivity/configuration or rolling back a bad deployment

## 4. Auth configuration and secrets

Critical items:

- `APP_BASE_URL`
- `AUTH_SECRET`
- `ADMIN_USER_EMAILS`

Used for:

- canonical redirects and origin validation
- signed session handling
- admin allowlist resolution

Failure impact:

- build or runtime auth failures
- broken redirects
- broken admin access
- incorrect QR/mobile handoff origin behavior if origin config drifts

Primary signals:

- build failures
- login failures
- admin route failures
- origin/security event anomalies

Fallback / recovery:

- correct production environment configuration
- redeploy if config drift caused a bad deployment

## 5. Jobindsats import pipeline

Used for:

- municipality job totals
- top-industry presentation
- imported title/translation discovery

Failure impact:

- imported municipality data becomes stale
- translation/admin workflows may fall behind
- daily freshness expectation is lost

Primary signals:

- failed daily import workflow
- stale imported values in app/admin view

Fallback / recovery:

- previous imported data remains in DB
- app may continue to serve stale but existing imported data until next successful run

## 6. GitHub Actions daily import workflow

Workflow:

- `.github/workflows/jobindsats-daily.yml`

Used for:

- scheduled import execution
- translation sync step through the daily batch
- optional follow-check trigger when env vars are present

Failure impact:

- import freshness stops updating
- downstream data becomes stale

Primary signals:

- failed scheduled run
- repeated failed runs

Fallback / recovery:

- manual workflow dispatch
- manual engineering/ops follow-up

## 7. Statbank live-estimate integration

Used for:

- optional live estimate enrichment when enabled

Failure impact:

- fallback to imported or mock/DB-backed totals and industries
- app should remain usable without this dependency

Primary signals:

- console/server errors around Statbank live estimate reads

Fallback / recovery:

- built-in fallback already exists in the data layer
- this is not a hard V1 dependency for core operation

## Dependency severity summary

### Hard dependencies

- Vercel production hosting
- Postgres
- Prisma
- auth/env configuration

### Soft but operationally important dependencies

- Jobindsats import pipeline
- GitHub Actions daily import workflow

### Optional/degradable dependency

- Statbank live estimates

## Related documents

- `docs/deployment-and-rollback-runbook.md`
- `docs/v1-monitoring-checklist.md`
- `docs/v1-support-playbook.md`
