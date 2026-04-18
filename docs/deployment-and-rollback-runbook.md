# JOBVEJ Deployment and Rollback Runbook

Date: 2026-04-18

## Deployment model

Primary release path:

1. merge or push the intended release commit to `main`
2. Vercel builds and deploys from `origin/main`
3. verify the deployed URL

Optional manual production deploy:

- `npx vercel --prod --yes`

Use manual deploy only when a direct production deployment is intentionally required.

## Standard release flow

1. confirm `main` contains the intended commit
2. confirm local validation is green:
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npx next build`
3. push `main`
4. wait for Vercel production deployment to complete
5. verify:
   - kiosk route loads at `/da?kiosk=1`
   - kiosk QR is visible only on kiosk route
   - home page loads
   - one municipality page loads
   - login page loads
   - admin page loads for admin user
   - manifest and service worker are reachable

## Rollback options

### Preferred: redeploy last known good Vercel deployment

Use when:
- the issue is deployment-specific
- the last good deployment is already known

Action:
- in Vercel, identify the last healthy production deployment
- promote/redeploy that version

### Alternative: revert the bad commit on `main`

Use when:
- the bad change is known
- the fix is simply to remove the broken commit

Action:
1. identify the bad commit
2. run a normal git revert
3. push the revert commit to `main`
4. allow Vercel to deploy the reverted state

Do not use destructive history rewrites on `main`.

## Release blockers

Do not release when any of the following are true:

- `npm run lint` fails
- `npx next build` fails
- database schema/client are out of sync
- authentication is broken
- daily Jobindsats import is failing without an acknowledged workaround
- critical admin page or follow/save flow is broken

## Known operational dependencies

- Vercel deployment environment
- Postgres database via `DATABASE_URL`
- Jobindsats API token
- Auth.js/session secrets and related env vars
- daily GitHub Actions import workflow

## Authentication configuration requirements

Production must not be considered valid unless all of the following are configured:

- `APP_BASE_URL`
- `AUTH_SECRET`
- `ADMIN_USER_EMAILS`

Operational notes:

- `AUTH_SECRET` must be stored in deployment secrets and rotated outside git
- `ADMIN_USER_EMAILS` must contain named individual admin accounts only
- citizen sessions are configured for a 7-day maximum lifetime with a 12-hour refresh window
- kiosk entry URLs should use the explicit `?kiosk=1` flag and should not be reused as the mobile handoff target

## Minimum post-deploy checks

- `/da` returns healthy app shell
- `/da?kiosk=1` returns kiosk-enabled home state
- `/da/kommuner/naestved` returns municipality page
- `/manifest.webmanifest` returns `200`
- `/sw.js` returns `200`
- login works
- admin home-map works
- translation editor works

## Monitoring reference

Use these documents for recurring operational review after deployment:

- `docs/v1-monitoring-checklist.md`
- `docs/v1-security-monitoring-thresholds.md`

## Drill reference

Use this document for the required V1 rehearsal of release and rollback readiness:

- `docs/v1-release-and-rollback-drill.md`
