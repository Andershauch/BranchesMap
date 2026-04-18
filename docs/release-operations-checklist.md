# JOBVEJ Release Operations Checklist

Date: 2026-04-18

## Before release

- `npm run lint`
- `npx tsc --noEmit`
- `npx next build`
- verify `main` is clean except intentional release changes
- verify latest title-translation DB state is acceptable
- verify latest daily import status is acceptable
- verify V1 QA report is still representative of current code
- verify `APP_BASE_URL`, `AUTH_SECRET`, and `ADMIN_USER_EMAILS` are configured in production

## Release

- push intended release commit to `main`
- confirm Vercel production deployment finishes successfully
- record deployed commit SHA

## After release

- open kiosk entry route, for example `/da?kiosk=1`
- verify QR handoff card is visible only on kiosk entry route
- leave kiosk entry idle and verify attract-mode/reset triggers as expected
- open home page
- verify standard home page without `?kiosk=1` does not show kiosk QR card or idle overlay
- open municipality page
- open login page
- verify follow/save flow for authenticated user
- verify admin home-map
- verify admin title editor
- verify `/manifest.webmanifest`
- verify `/sw.js`
- run `npm run security:report -- --hours 4`
- confirm account deletion command is still available for support handling:
  - `npm run user:delete -- --email nobody@example.com`

## Watch list after release

- failed daily imports
- unexpected `security.*` event spikes
- auth/login failures
- kiosk route not resetting correctly after idle time
- QR handoff opening the wrong route or keeping kiosk mode on mobile
- broken translation rows for new imported titles
- broken Jobnet links or municipality presentation regressions

## Monitoring reference

For V1 security event review and thresholds, use:

- `docs/v1-security-monitoring-thresholds.md`
- `docs/v1-monitoring-checklist.md`
