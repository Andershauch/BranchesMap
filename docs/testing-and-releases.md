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

The hook runs the same `npm run verify:ci` gate before Git sends refs. GitHub Actions runs the gate on every push and pull request as a second check. Require the **Verify application** status check in GitHub branch protection before merging changes to `main`.

Local Git hooks can be bypassed or may not be enabled in another clone. GitHub Actions therefore remains the shared verification record; branch protection is needed to require a passing result before merge.

## Test scope

The fast, database-free unit suite covers request validation, StatBank request construction and freshness rules, Jobindsats period/table normalization and title classification, same-origin mutation checks, and API security headers. Database-backed user, invitation, and importer flows still need staging integration tests before go-live.
