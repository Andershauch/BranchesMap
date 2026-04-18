# JOBVEJ V1 Mobile Continuation Verification

Date: 2026-04-18

## Scope

This note records what has been verified for the kiosk-to-mobile continuation flow and what still requires a real phone.

## Verified locally

Environment used:

- existing local dev server on `http://localhost:3000`

Routes checked:

- `/da`
- `/da?kiosk=1`

Local verification results:

1. Standard home route loads successfully.
   - HTTP `200` on `/da`
   - route renders with `kioskModeEnabled: false`
   - no QR handoff card is rendered in the returned HTML
   - `handoffQrDataUrl` is `null`

2. Kiosk route loads successfully.
   - HTTP `200` on `/da?kiosk=1`
   - route renders with `kioskModeEnabled: true`
   - QR handoff card is present in the returned HTML
   - QR image is rendered as a `data:image/png;base64,...` payload

3. Mobile handoff target is isolated from kiosk mode.
   - kiosk route generates `handoffUrl` as `http://localhost:3000/da`
   - the QR target does not include `?kiosk=1`
   - this confirms the intended V1 behavior:
     - kiosk-only UI stays on the reception route
     - the citizen lands on the normal mobile route

4. Route-level kiosk gating is active on the server entrypoint.
   - `app/[locale]/page.tsx` reads `searchParams.kiosk`
   - QR generation only happens when `kiosk=1`
   - normal locale routes keep the shared mobile experience without kiosk overlays

## Real-device verification

Confirmed by manual test after deployment:

- the kiosk QR code scans correctly on a physical phone
- the phone opens the expected deployed app route
- kiosk mode behaves as expected on the kiosk entry route
- QR handoff behaves as expected in the deployed environment

## Current status

`P1-16` is now complete for the kiosk-route and QR continuation scope that was defined for V1.

## Remaining broader mobile QA outside P1-16 scope

The following can still be tested as part of broader pilot QA:

1. Add the app to the home screen.
2. Confirm the installed app opens normally.
3. Create a user.
4. Log in.
5. Follow a municipality.
6. Confirm the follow state is visible and usable on the phone.

## Conclusion

The implemented route isolation for kiosk versus mobile behavior is working both in local verification and in deployed manual testing.
