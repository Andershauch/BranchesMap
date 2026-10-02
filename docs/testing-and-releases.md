# Tests and release checks

## Local verification

Install locked dependencies once with `npm ci`, then run:

```sh
npm run test
npm run verify:ci
```

`verify:ci` validates Prisma configuration, checks TypeScript, runs lint and unit tests, and completes a production build. Locally it uses a syntactically valid database URL and does not require a live database. GitHub Actions starts a disposable PostgreSQL service and applies the Prisma schema before running the same gate, so build-time database paths are exercised without production data.

## Run checks before every push

This repository includes a Git pre-push hook. It is enabled in this local clone. To enable it in another clone, run:

```sh
git config core.hooksPath .githooks
```

The hook runs the same `npm run verify:ci` gate before Git sends refs. GitHub Actions runs the gate on every push and pull request as a second check. The `main` branch requires pull requests and both **Verify application** and **Browser end-to-end tests** checks before merge, including for administrators.

Local Git hooks can be bypassed or may not be enabled in another clone. GitHub Actions therefore remains the shared verification record; branch protection is needed to require a passing result before merge.

## Test scope

The fast, database-free unit suite covers request validation, StatBank request construction and freshness rules, Jobindsats period/table normalization and title classification, same-origin mutation checks, password hashing, API security headers, and account-copy coverage for all supported locales. GitHub Actions also runs database-backed account, invitation, and expired-token cleanup integration tests against its disposable PostgreSQL service. They are gated by `RUN_DB_INTEGRATION_TESTS=1` and refuse to run unless the database is local and named `branches_map_ci`.

The browser suite covers login/logout, member/admin/superadmin access boundaries, invitation acceptance and single use, password reset and reset-token reuse, and the kiosk manifest and QR handoff. GitHub Actions builds and runs the app in production mode in Chromium against a separate disposable PostgreSQL database named `branches_map_e2e`; it never connects to Neon, staging, or production. Both the browser configuration and fixture seeder reject non-loopback hosts or another database name.

The account-token cleanup workflow runs daily on `main` and can also be started manually there. It requires the production `DATABASE_URL` repository secret and removes only `UserActionToken` rows whose expiry is older than 30 days. It is added on the staging branch and does not run against Production until merged to `main`.

To run it locally, start a disposable local PostgreSQL instance with a database named `branches_map_e2e`, then set `DATABASE_URL`, `RUN_E2E_TESTS=1`, and `AUTH_SECRET` in the shell. Install the browser once with `npx playwright install chromium`, then run:

```sh
npm run db:push
npm run test:e2e:seed
npm run test:e2e
```

E2E fixtures use `@e2e.branchesmap.test` accounts and a test-only password. Never configure these commands with a shared or hosted database. GitHub Actions runs the browser suite on every push and pull request; require both **Verify application** and **Browser end-to-end tests** as status checks before merging changes to `main`. Staging is not used by automated tests.
