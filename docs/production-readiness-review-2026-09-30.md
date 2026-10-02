# Production readiness review

Date: 2026-09-30
Scope: source, dependency, API and build review for the controlled JOBVEJ pilot. No production deployment or database import was performed.

## Decision

The app has a credible pilot foundation and now builds cleanly, but it is **not yet cleared for a broad production launch**. The Jobindsats v3 transition and StatBank vacancy-table change have been addressed in source. A full scheduled import, production deployment and smoke test, account-recovery controls and operational ownership still need to be confirmed.

## Architecture and data flow

Next.js App Router serves the localized map, kiosk, account and admin routes. Auth.js issues JWT sessions; `lib/server/auth.ts` re-reads the account and current role from Postgres on protected requests. Prisma persists accounts, follows, saved searches, audit events, import snapshots and throttles. A daily GitHub Actions workflow imports Jobindsats snapshots. The public `/api/jobs` path reads StatBank tables and calculates a municipality estimate from official regional/industry data plus a reference weighting model.

Jobindsats Y25i07 gives aggregate counts and ESCO titles; it is not a feed of individual job adverts with employer, address or application link. The app's job cards remain sample content. Municipality/industry estimates must remain labelled as estimates and sample jobs must remain labelled as sample content until a real advert feed is integrated.

## Live API verification

| Service | Check on 2026-09-30 | Result |
|---|---|---|
| Jobindsats v2 | Y25i07 table metadata, legacy raw-token header | HTTP 200 today; STAR says v2 is retired after 30 September 2026 |
| Jobindsats v3 | Node client: subjects, filtered tables, Y25i07 metadata and relevant-table catalogue | HTTP 200; client now sends Bearer auth and handles v3 metadata groups |
| Jobindsats v3 data | Næstved, latest monthly period, all three measures | HTTP 200; one returned row was 2026M08, 703 open positions, 349 daily average, 355 newly posted |
| StatBank legacy tables | Production `/api/jobs` response and app's existing request to LSK01/LSK02 | HTTP 200, but latest period was 2025K4 |
| StatBank current tables | LSK13 metadata and Region Zealand query | Active table; HTTP 200; current period 2026K2; DB25 10-grouping values and expected nested JSONSTAT payload |

The complete daily import was not run because it writes to Postgres. The single-row check does not prove all 43 municipality mappings or the database upsert path.

Official references: [Jobindsats v3 guide](https://jobindsats.dk/api/kom-i-gang/brugervejledning-til-version-3/), [v3 announcement and v2 retirement date](https://jobindsats.dk/nyheder/nyhed/ny-version-af-jobindsats-api-er-nu-klar-til-brug/), [Statistics Denmark's current vacancy tables](https://www.dst.dk/en/Statistik/udgivelser/nyt/relateret?pid=1402), [StatBank API](https://www.dst.dk/en/Statistik/hjaelp-til-statistikbanken/api).

## Changes made

- Migrated `lib/server/jobindsats.ts` and `scripts/jobindsats-discovery.ps1` to v3 endpoints, Bearer authentication and v3 query/response shapes.
- Updated the Y25i07 importer for v3 rows/columns and monthly metadata; added a 24-hour per-table metadata cache to avoid repeating metadata reads for each municipality.
- Migrated the StatBank estimate from the legacy LSK01/LSK02 tables (latest period 2025K4) to current LSK13 DB25 regional/industry data (latest period 2026K2); branch mapping now uses stable industry codes.
- Removed internal exception details from public `/api/jobs` error responses while retaining server-side error logging.
- Bounded StatBank's in-memory data cache to 64 entries per table and a six-hour TTL.
- Capped relevant-table discovery results at 100, rejected invalid discovery modes, and validated table IDs before using them in URL paths.
- Replaced the fixed example `AUTH_SECRET` in `.env.example` with a placeholder.
- Updated Auth.js/Next.js and aligned Prisma CLI, client and adapter on 7.10.0. Fixed duplicate copy keys and role typing in the superadmin user page/action discovered by TypeScript.
- Replaced the outdated v2 assumptions in the integration status and import plan.

## Verification

### Staging follow-up after the source review

- Pushed commit `e85bb661` to Git branch `staging`; Vercel Preview reached `READY` at [the staging URL](https://branches-map-git-staging-andershauchs-projects.vercel.app). Production `main` was not changed.
- GitHub Actions CI run `36760594760` passed. The local pre-push hook also passed Prisma validation, typecheck, lint, all 22 tests and the production build.
- Neon staging schema matched Prisma. Reference seed added 43 municipalities, 129 municipality-industry relations and 387 demo jobs. The branch started without copied production rows.
- Jobindsats Y25i07 import runs `cmuoh0i2f0000lg61dfc84cyx` and `cmuohkivr0000vg61qi72cgi9` completed for all 43 active municipalities, period `2026M08`. After the rerun, staging still contains 43 snapshots, 293 category rows and 2,009 top-title rows. Næstved matches the live API check: 703 open positions, 349 daily average and 355 newly posted. Wider municipality reconciliation remains outstanding.
- Created staging-only test accounts at reserved `.test` addresses: superadmin, admin (through the invitation acceptance service) and regular user. Local HTTP checks against the staging database verified Auth.js credentials sessions, role claims, access to `/da/admin` and `/da/admin/users`, denial of an incorrect password, and single-use invitation acceptance. The temporary admin/user records and invitation row were removed after testing; the staging superadmin remains.
- The deployed Danish login page returned HTTP 200 with security headers, and deployed `/api/jobs` returned HTTP 200 with LSK13 data for 2026K2. Credential login was tested against the locally running production build with staging data, but the deployed Preview login was not exercised in a browser. Preview has no `RESEND_API_KEY`; no invitation email was sent. Invitation delivery and the browser-based end-to-end flows remain outstanding.

- `npm run lint` — passed, including encoding check.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed with Next.js 16.3.7; 450 static pages generated.
- `npm run db:generate` — passed with Prisma 7.10.0.
- Direct Node client and PowerShell v3 calls — passed.
- PowerShell v3 table-search filter against the saved live catalogue — found Y25i07 using nested v3 table groups.
- StatBank LSK13 metadata and Region Zealand live JSONSTAT request — passed.
- Local `/api/jobs` returned the generic 503 response with no Prisma/database internals. The full data path could not complete because the sandbox denied the app's Postgres connection (`EACCES`).
- `npm audit` — 4 high findings remain in the Prisma dependency graph (`prisma`, `@prisma/config`, `deepmerge-ts`, `mysql2`); no critical findings remain. npm's suggested automatic fix downgrades Prisma to 6.19.3, so that breaking downgrade was not applied. Review again when Prisma publishes a compatible fix; do not call the dependency report clean.
- The original source review had no automated test suite or browser run. The follow-up added 22 unit/API-contract tests; browser E2E tests are still absent.

## Findings and release gates

### P1 — Run and verify the complete v3 import

Only one municipality was fetched live. The importer has not written a new v3 run to Postgres, so data coverage, transaction/upsert behavior, translations and runtime reads from the new snapshot are still unverified.

**Accept when:** run the normal GitHub Actions job, verify all active municipalities were imported for the latest period, compare representative counts with Jobindsats, confirm the app reads the new snapshot, and record the import-run ID. Check the workflow's timeout and failure notification.

### P1 — Deploy and verify the StatBank table migration

The deployed app still returned LSK01/LSK02 data from 2025K4 during this review. Source now uses LSK13 and the live query returned 2026K2, but the source change has not been deployed. LSK13's DB25 groupings differ from the legacy DB07 groupings; the municipality industry display remains a grouped estimate and must not be presented as a direct municipality count. The local end-to-end route could not be verified because Postgres access is denied in this environment.

**Accept when:** deploy the change, verify `/api/jobs` reports 2026K2 and uses LSK13, compare Region Zealand's total against StatBank, and confirm the source note and estimate labels are visible in Danish and English.

### P1 — Close the remaining dependency findings

The current audit reports four high Prisma-graph issues. They appear in the CLI/config dependency path, but npm includes Prisma through the client peer graph. They are not proven reachable from the request handlers; they remain a supply-chain finding until the vendor path is patched or independently assessed.

**Accept when:** a future Prisma version removes the findings without a major downgrade, or a documented dependency-path review establishes a safe supported mitigation and `npm audit` is rerun.

### P1 — Complete account verification and recovery

Credentials login, scrypt password hashes, invitation links and database-backed role checks already exist. Public self-registration does not verify email ownership, there is no self-service password reset, and admins do not have MFA. Account deletion and retention pruning are manual operations.

**Recommended policy:** keep public browsing anonymous; require verified email for citizen accounts; use invitations for staff/admin accounts; add MFA or organizational SSO for admins; implement one-use, expiring password-reset tokens and self-service deletion. Keep role checks server-side and avoid confirming whether an email is registered in public responses.

**Decision:** choose open citizen registration for a public service, or invitation-only registration for a closed pilot. Do not broaden rollout until email ownership and account recovery have an owner and tested flow.

### P1 — Reverify production and operational controls

The existing deployed security note is from 2026-04-18 and predates the current dependency and API changes. Source documents do not prove the current production environment has the expected secrets, backups, alerts, or restore capability.

**Accept when:** perform current production checks for login/registration, role separation, headers/cookies, kiosk-to-phone flow, PWA assets, API availability and the imported snapshot. Confirm backup retention and complete one restore drill. Assign named owners for import failures, account deletion, security events and rollback.

### P2 — Make quality gates routine

There is a scheduled import workflow but no repository CI workflow covering lint, typecheck and build on pull requests. These checks were green locally in this review.

**Accept when:** add a PR quality workflow with `npm ci`, Prisma client generation, lint, typecheck and production build; require it before merge. Keep secrets out of PR workflows for untrusted forks.

### P2 — Measure production performance

The StatBank cache is now bounded, but no representative mobile, kiosk or production latency/Core Web Vitals baseline was measured. Static page generation is not an end-user performance measurement.

**Accept when:** capture a Lighthouse/Web Vitals baseline on a real mobile device and kiosk screen, plus p50/p95 for `/api/jobs` and database-backed account flows. Set thresholds before further optimization.

## API opportunities

Jobindsats v3 provides normalized measurement metadata, period types, dimensions, hierarchy values and measure groups, so new reports can discover and query measurements without hardcoding v2's shape. STAR also publishes an API console for trying queries. StatBank's documentation describes a DCAT-AP catalogue endpoint that requires an API key; this could support future automated table discovery. Neither catalogue is currently required by the app's runtime, and neither should replace validation of the specific measurement used in production.

## Scope limits

This is a source and live-endpoint engineering review, not a penetration test, legal opinion, compliance certification, capacity test, or proof of production configuration. Review privacy, retention, processor agreements and accessibility for the actual municipality and rollout context with the responsible owners.
