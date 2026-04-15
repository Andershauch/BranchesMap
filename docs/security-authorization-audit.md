# Security Authorization Audit

Date: 2026-04-15

This note documents the current route-by-route authorization posture after the Auth.js migration and the first hardening passes.

## Current route classification

### Public routes

- `/[locale]`
  - public read
  - no private data
- `/[locale]/kommuner/[slug]`
  - public read
  - optional logged-in behavior only for marking follow updates as seen for the current user
- `/[locale]/login`
  - public
  - redirects away if already authenticated
- `/[locale]/register`
  - public
  - redirects away if already authenticated
- `/api/auth/[...nextauth]`
  - public auth transport
  - delegated to Auth.js handlers
- `/api/jobs`
  - public read
  - rate limited
- `/api/utf8`
  - public diagnostic read

### Authenticated user routes

- `/[locale]/follows`
  - authenticated read
  - enforced by `requireCurrentUser`
  - `no-store` enabled
- `/[locale]/saved-searches`
  - authenticated read
  - enforced by `requireCurrentUser`
  - `no-store` enabled
- `/api/follows`
  - authenticated write for active operations
  - unauthenticated callers are redirected to login/register for the explicit follow flow
  - mutation origin is checked
  - storage-layer deletes/updates are scoped by `userId`
- `/api/saved-searches`
  - authenticated write
  - unauthenticated callers are redirected to login
  - mutation origin is checked
  - storage-layer deletes/updates are scoped by `userId`
- `lib/server/auth-actions.ts`
  - authenticated state changes via Auth.js
  - throttled
  - now emits explicit security audit events for throttling and auth failures

### Admin routes

- `/[locale]/admin/home-map`
  - admin read/write surface
  - page now enforced by `requireAdminUser`
  - `no-store` enabled
- `app/[locale]/admin/home-map/actions.ts`
  - admin write
  - enforced by `requireAdminAuth`
- `/api/jobindsats/discovery`
  - admin-only in production
  - local-development bypass remains intentional
  - rate limited
- `/api/follows/check`
  - production access via follow-check secret or admin session
  - local-development bypass remains intentional
  - rate limited

## Supporting controls now in place

- Auth.js session-based authentication
- role-based admin authorization
- origin checks for cookie-authenticated mutation routes
- `no-store` on private pages
- CSP and baseline security headers
- distributed database-backed rate limiting on sensitive routes
- centralized input parsing/validation for key form flows
- explicit security audit events for:
  - auth throttling
  - auth failures
  - rejected mutation origins
  - unauthorized follow-check requests
  - unauthorized Jobindsats discovery requests
  - rate-limit hits on operational endpoints

## Findings

### Closed

- No obvious write path currently bypasses server-side user or admin gating.
- Follow and saved-search delete/update flows are double-scoped:
  - request-level auth
  - storage-layer `userId` filtering
- Admin home-map now uses a shared admin gate instead of duplicating role checks in-page.

### Intentional exceptions

- `/api/follows/check` is open on localhost in development.
- `/api/jobindsats/discovery` is open on localhost in development.

These are acceptable for local QA, but they should remain development-only.

### Remaining gaps

1. Security event visibility is still database-only.
   - We now write audit rows for important abuse/security events.
   - We do not yet have alerting, dashboards, or retention policy around them.

2. Auth throttling is still not request-IP aware.
   - Server actions do not expose the raw request.
   - Current throttling is global + identity-based, which is better than before but not ideal.

3. Auth.js transport route is delegated to the framework.
   - That is expected.
   - Any future custom callback logic should be reviewed carefully if added.

## Recommended next steps

1. Add observability around `security.*` audit events.
2. Move high-risk auth flows to route handlers if per-IP + per-identity throttling becomes necessary.
3. Re-run this audit whenever a new admin feature, write route, or background operational endpoint is introduced.
