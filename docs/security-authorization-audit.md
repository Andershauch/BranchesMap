# Security Authorization Audit

Date: 2026-04-18

This note documents the current route-by-route authorization posture after the Auth.js migration and the first hardening passes.

It now reflects the current V1 state after origin hardening, auth/session review,
privacy retention work, security monitoring thresholds, and kiosk/mobile flow isolation.

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
- citizen session lifetime is capped and explicitly configured in code
- canonical production redirects and absolute URLs are anchored to `APP_BASE_URL`
- role-based admin authorization
- named admin allowlist via `ADMIN_USER_EMAILS`
- origin checks for cookie-authenticated mutation routes
- `no-store` on private pages
- CSP and baseline security headers
- distributed database-backed rate limiting on sensitive routes
- centralized input parsing/validation for key form flows
- documented operational deletion path via `npm run user:delete -- --email user@example.com`
- documented manual security review path via `npm run security:report -- --hours 24`
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

1. Security event visibility is still manual-first.
   - We now write audit rows for important abuse/security events.
   - We now have review thresholds and a reporting script.
   - We still do not have automated alerting or dashboards.

2. Auth throttling still depends on header-derived client identity.
   - Current throttling uses request headers plus per-identity keys.
   - That is appropriate for V1, but it is not a strong anti-abuse identity model.

3. Auth.js transport route is delegated to the framework.
   - That is expected.
   - Any future custom callback logic should be reviewed carefully if added.

4. Kiosk-mode is now isolated by route flag rather than deployment boundary.
   - This is the correct V1 choice for reuse of the shared home experience.
   - It must still be verified on the real reception entry URL during pilot QA.

## Recommended next steps

1. Add observability around `security.*` audit events.
   - V1 manual review thresholds now live in `docs/v1-security-monitoring-thresholds.md`
2. Complete real-device verification of the kiosk-to-phone flow for the `?kiosk=1` entry route.
3. Move high-risk auth flows to route handlers if stricter per-IP controls become necessary.
4. Re-run this audit whenever a new admin feature, write route, or background operational endpoint is introduced.
