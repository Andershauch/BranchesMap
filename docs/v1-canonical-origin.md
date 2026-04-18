# JOBVEJ V1 Canonical Origin

Date: 2026-04-18

## Purpose

This note defines the single canonical production origin for JOBVEJ V1.

It exists because redirects, origin checks, and QR handoff URLs must use one explicit production origin.

## Canonical production origin

The canonical production origin for V1 is:

```text
https://branches-map.vercel.app
```

## Canonical routes

Standard public/mobile route:

```text
https://branches-map.vercel.app/da
```

Reception kiosk route:

```text
https://branches-map.vercel.app/da?kiosk=1
```

## Required behavior

The following rules apply:

- all auth redirects must resolve against the canonical origin
- same-origin mutation validation must resolve against the canonical origin
- QR handoff must use the canonical origin
- kiosk QR must hand the user off to the normal mobile route, not the kiosk route

## Required production environment value

Production must set:

```text
APP_BASE_URL=https://branches-map.vercel.app
```

## Operational note

If preview deployments are used, they must not silently replace the V1 canonical production origin decision.

For V1, the citizen-facing canonical app URL is the production Vercel domain above unless and until a new production domain is explicitly approved and documented.

## Current status

This document reflects the current deployed V1 decision and the implemented origin model in code.

## Related documents

- `docs/deployment-and-rollback-runbook.md`
- `docs/release-operations-checklist.md`
- `docs/v1-go-live-plan.md`
