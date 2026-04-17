## JOBVEJ V1 QA Release Report

Date: 2026-04-17

### Scope

The following flows were verified against the running app:

- anonymous user
- authenticated user
- admin user
- locales: `da`, `en`, `uk`, `ar`, `fa`, `ur`, `pl`, `de`

### Verified Results

1. Public routes
- `/{locale}` returns `200` for all 8 locales
- `/{locale}/login` returns `200` for all 8 locales
- `/{locale}/register` returns `200` for all 8 locales
- `/{locale}/kommuner/naestved` returns `200` for all 8 locales

2. Protected routes
- anonymous access to `/{locale}/follows` redirects to `/{locale}/login`
- authenticated user access to `/{locale}/follows` returns `200` for all 8 locales
- authenticated user access to `/{locale}/saved-searches` returns `200` for all 8 locales
- non-admin access to `/da/admin/home-map` redirects to `/da/login`
- admin access to `/{locale}/admin/home-map` returns `200` for all 8 locales
- admin access to `/{locale}/admin/jobindsats-titles` returns `200` for all 8 locales

3. Auth flows
- login page renders correctly
- register page renders correctly
- register server action was submitted successfully and returned `303` with session cookie
- login server action was submitted successfully and returned `303` with session cookie

4. User flows
- authenticated follow mutation succeeds and redirects with `followed=created`
- authenticated saved-search mutation succeeds and redirects with `saved=created`
- follows page renders created entry
- saved searches page renders created entry

5. PWA/runtime checks
- `/manifest.webmanifest` returns `200`
- `/sw.js` returns `200`
- `/icon.png` returns `200`
- `/apple-icon.png` returns `200`
- manifest metadata is correct for `JOBVEJ`
- development runtime correctly avoids registering service worker
- install copy now distinguishes local development from production/manual install

### Remaining Limitation

The browser-level install prompt and service-worker update UX were not end-to-end verified in a real production browser session from this environment. The shell environment does not have `agent-browser` available, so that final check still needs one manual production verification on the Vercel deployment.

### Release Readiness For Point 4

- end-to-end auth and protected-route QA: passed
- locale QA for central flows: passed
- PWA asset/runtime verification: passed
- manual production install-prompt verification: still pending
