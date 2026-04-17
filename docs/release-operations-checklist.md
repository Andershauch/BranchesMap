# JOBVEJ Release Operations Checklist

Date: 2026-04-17

## Before release

- `npm run lint`
- `npx next build`
- verify `main` is clean except intentional release changes
- verify latest title-translation DB state is acceptable
- verify latest daily import status is acceptable
- verify V1 QA report is still representative of current code

## Release

- push intended release commit to `main`
- confirm Vercel production deployment finishes successfully
- record deployed commit SHA

## After release

- open home page
- open municipality page
- open login page
- verify follow/save flow for authenticated user
- verify admin home-map
- verify admin title editor
- verify `/manifest.webmanifest`
- verify `/sw.js`

## Watch list after release

- failed daily imports
- unexpected `security.*` event spikes
- auth/login failures
- broken translation rows for new imported titles
- broken Jobnet links or municipality presentation regressions
