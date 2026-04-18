# JOBVEJ V1 Deployed Security Verification

Date: 2026-04-18

## Scope

This note records production-environment checks performed against:

- `https://branches-map.vercel.app/da`
- `https://branches-map.vercel.app/da?kiosk=1`
- `https://branches-map.vercel.app/da/login`
- `https://branches-map.vercel.app/da/kommuner/naestved`
- `https://branches-map.vercel.app/api/follows`
- `https://branches-map.vercel.app/api/follows/check`
- `https://branches-map.vercel.app/da/admin/home-map`
- `https://branches-map.vercel.app/da/admin/jobindsats-titles`
- `https://branches-map.vercel.app/manifest.webmanifest`
- `https://branches-map.vercel.app/sw.js`

## Verified live

1. Production headers are present on HTML routes.
   - `Content-Security-Policy` is active
   - `Strict-Transport-Security` is active
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy` is present
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Cross-Origin-Resource-Policy: same-origin`

2. Public HTML routes are `no-store`.
   - observed on `/da`
   - observed on `/da?kiosk=1`
   - observed on `/da/login`
   - observed on `/da/kommuner/naestved`

3. Canonical origin redirects are active.
   - anonymous `POST` to `/api/follows` returned `303`
   - redirect target was `https://branches-map.vercel.app/da/register?...`
   - this confirms canonical origin use rather than request-host drift

4. Same-origin mutation protection is active.
   - `POST /api/follows` with `Origin: https://evil.example` returned `403`
   - response body was `{"ok":false,"error":"Untrusted request origin."}`

5. Admin/user separation is active for anonymous requests.
   - `/da/admin/home-map` returned `307` to `/da/login?...`
   - `/da/admin/jobindsats-titles` returned `307` to `/da/login?...`
   - unauthenticated access did not expose admin content

6. Rate limiting is active in production.
   - repeated anonymous `POST` requests to `/api/follows/check` were executed
   - requests `1-20` returned `401`
   - request `21` returned `429`
   - subsequent response included `Retry-After: 51`

7. Public PWA assets are served over HTTPS.
   - `/manifest.webmanifest` returned `200`
   - `/sw.js` returned `200`
   - service worker route returned `Service-Worker-Allowed: /`

8. Observed cookie policy on anonymous routes is secure by default.
   - `NEXT_LOCALE` is set with `Secure`
   - `NEXT_LOCALE` is set with `SameSite=lax`

9. Authenticated session behavior after successful login is verified.
   - normal user login was verified live on deployed app
   - authenticated session behavior worked as expected

10. Authenticated non-admin user access boundaries are verified.
    - authenticated non-admin user could not access admin functionality
    - user/admin separation works as expected in deployed environment

11. Authenticated admin access is verified.
    - admin login was verified live
    - admin routes opened successfully after login

## Status

`P1-24` is `done`.

## Conclusion

The deployed app is behaving like a hardened public Next.js app should behave in real environment verification.

The highest-risk controls are now proven live:

- security headers
- canonical origin redirects
- origin rejection
- admin protection
- rate limiting
- authenticated session verification
- authenticated user/admin role separation
