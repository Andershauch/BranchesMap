# JOBVEJ V1 Pilot QA Report

Date: 2026-04-18

## Scope

This report tracks the critical V1 journeys defined in `P1-23`.

## Green

1. Anonymous browse
   - deployed `/da` route loads successfully

2. Municipality detail
   - deployed `/da/kommuner/naestved` route loads successfully

3. QR scan
   - manually verified on deployed kiosk flow
   - QR code scans correctly on a physical phone

4. Mobile open
   - manually verified on deployed app
   - QR handoff opens the expected non-kiosk route

5. Kiosk isolation
   - kiosk entry route is isolated to `?kiosk=1`
   - normal route does not inherit kiosk behavior

6. Anonymous follow handoff
   - anonymous `POST /api/follows` redirects safely into registration with `followMunicipality`

## Not yet executed

1. Install
   - add to home screen / installed-app flow has not been formally recorded in this report

2. Register
   - not executed in this QA pass

3. Login
   - not executed in this QA pass

4. Follow as authenticated user
   - not executed in this QA pass

5. Follow update display
   - not executed in this QA pass

6. Admin verification
   - anonymous protection is verified
   - authenticated admin workflow has not been executed in this QA pass

## Status

`P1-23` is `in_progress`.

Reason:

- the anonymous public and kiosk flows are green
- the authenticated citizen and admin flows still need one recorded pilot round on real devices

## Required final QA pass

To close `P1-23`, execute and record:

1. Install the app on a phone.
2. Create a test user.
3. Log in with that user.
4. Follow a municipality.
5. Confirm the follow state and update marker behavior.
6. Log in with an admin account.
7. Open admin home-map and title editor successfully.

## Conclusion

The public reception journey is in good shape.

The remaining QA work is now concentrated in authenticated flows rather than basic routing, kiosk behavior, or QR continuation.
