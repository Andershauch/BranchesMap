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

## Not yet verified on a real device

The following still require a physical phone and should not be treated as complete from local route inspection alone:

- scanning the kiosk QR code with a phone camera
- confirming the phone opens the correct locale route
- confirming the phone does not inherit kiosk-only behavior after scan
- confirming the PWA install flow is understandable on the target phone(s)
- confirming register, login, and follow flows are practical on mobile touch UI

## Current status

`P1-16` is partially verified locally but is not fully complete yet.

Recommended backlog status:

- `in_progress`

## Manual real-device QA to complete P1-16

1. Open the reception entry route on the kiosk device:
   - `/da?kiosk=1`
2. Scan the QR code with an Android phone.
3. Confirm the phone opens `/da` and not `/da?kiosk=1`.
4. Confirm no kiosk QR card or idle attract behavior appears on the phone.
5. Add the app to the home screen.
6. Confirm the installed app opens normally.
7. Create a user.
8. Log in.
9. Follow a municipality.
10. Confirm the follow state is visible and usable on the phone.

## Conclusion

The implemented route isolation for kiosk versus mobile behavior is working in local verification.

The remaining risk is not architectural. It is final UX validation on a real phone and real kiosk screen.
