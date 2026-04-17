# JOBVEJ V1 Hardening Verification

Date: 2026-04-17

## Scope

This note verifies that the previously implemented hardening baseline is still reflected in the current codebase.

## Verified controls

### Authentication and authorization

- Auth.js is the active authentication layer.
- Admin access is role-based.
- Private pages require authenticated user context.
- Admin pages and admin actions require admin context.
- User-scoped data mutations remain scoped by `userId`.

Verified from:
- `auth.ts`
- `lib/server/auth.ts`
- `lib/server/auth-actions.ts`
- `app/[locale]/follows/page.tsx`
- `app/[locale]/saved-searches/page.tsx`
- `app/[locale]/admin/home-map/page.tsx`
- `app/[locale]/admin/home-map/actions.ts`
- `app/api/follows/route.ts`
- `app/api/saved-searches/route.ts`

### Request hardening

- baseline security headers are still applied
- CSP is still applied
- cookie-authenticated mutation routes still use origin checks
- private pages still use `no-store`
- rate limiting still exists on sensitive operational endpoints
- auth throttling remains in place for login and register flows

Verified from:
- `lib/server/security.ts`
- `proxy.ts`
- `lib/server/origin-guard.ts`
- `lib/server/rate-limit.ts`
- `lib/server/auth-actions.ts`
- `app/api/follows/route.ts`
- `app/api/saved-searches/route.ts`
- `app/api/follows/check/route.ts`
- `app/api/jobindsats/discovery/route.ts`
- `app/api/jobs/route.ts`

### Auditability and abuse visibility

- security-relevant events are still written as `security.*` audit events
- admin UI still exposes recent security events
- authorization audit documentation still exists

Verified from:
- `lib/server/security-events.ts`
- `lib/server/audit.ts`
- `app/[locale]/admin/home-map/page.tsx`
- `docs/security-authorization-audit.md`

### Translation/admin operations

- title translations are now DB-backed
- new imported titles are automatically synced into DB
- admin editor can filter missing and newly imported translation rows

Verified from:
- `lib/server/jobindsats-title-translations.ts`
- `app/[locale]/admin/jobindsats-titles/page.tsx`
- `scripts/sync-jobindsats-titles-to-db.ts`
- `scripts/populate-new-jobindsats-title-drafts.ts`

## Validation performed

- `npm run lint`
- `npx next build`
- V1 QA route/access verification documented in:
  - `docs/v1-qa-release-report.md`

## Current conclusion

The V1 hardening baseline is still present in the latest code.

This does not mean the app is public-sector production-ready in the strongest compliance sense. It means the agreed V1 hardening package remains implemented and intact after the latest UI, translation, PWA and product changes.
