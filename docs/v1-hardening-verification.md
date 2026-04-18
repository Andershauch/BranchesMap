# JOBVEJ V1 Hardening Verification

Date: 2026-04-18

## Scope

This note verifies that the previously implemented hardening baseline is still reflected in the current codebase.

## Verified controls

### Authentication and authorization

- Auth.js is the active authentication layer.
- `AUTH_SECRET` is now treated as an explicit production requirement.
- citizen sessions are configured for a 7-day maximum lifetime and 12-hour update window.
- Admin access is role-based.
- admin access is centralized through the `ADMIN_USER_EMAILS` allowlist.
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
- canonical app URL building now uses `APP_BASE_URL` in production
- CSP is now more explicit about allowed sources:
  - inline script attributes are blocked
  - framing is explicitly blocked
  - `unsafe-inline` remains only because the current Next.js runtime and some current inline styles still depend on it
- cookie-authenticated mutation routes still use origin checks
- private pages still use `no-store`
- rate limiting still exists on sensitive operational endpoints
- auth throttling remains in place for login and register flows

Verified from:
- `lib/server/security.ts`
- `proxy.ts`
- `lib/server/origin-guard.ts`
- `lib/server/request-origin.ts`
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
- V1 review thresholds and a reporting command now exist for manual operations review
- authorization audit documentation still exists

Verified from:
- `lib/server/security-events.ts`
- `lib/server/audit.ts`
- `app/[locale]/admin/home-map/page.tsx`
- `docs/security-authorization-audit.md`
- `docs/v1-security-monitoring-thresholds.md`
- `scripts/report-security-events.ts`

### Privacy and deletion operations

- a V1 retention/deletion note now exists
- a V1 privacy notice now exists
- a conservative account deletion script now exists for operations handling

Verified from:
- `docs/v1-data-retention-and-deletion.md`
- `docs/v1-privacy-notice.md`
- `scripts/delete-user-account.ts`

### Kiosk/mobile separation

- kiosk QR handoff is explicitly tied to the `?kiosk=1` route
- attract-mode and idle reset are isolated from the standard mobile route

Verified from:
- `app/[locale]/page.tsx`
- `components/home/home-map-explorer.tsx`

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
- `npx tsc --noEmit`

Open verification still required:

- deployed-environment header/cookie verification
- real-device kiosk-to-phone QA
- full release-day `npx next build`

## Current conclusion

The V1 hardening baseline is still present in the latest code and documentation.

This does not mean the app is public-sector production-ready in the strongest compliance sense. It means the agreed V1 hardening package remains implemented and intact after the latest UI, translation, PWA and product changes.
