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

7. Install
   - manually verified on deployed app
   - install/add-to-home-screen flow works as expected

8. Register
   - manually verified on deployed app
   - test user registration completed successfully

9. Login
   - manually verified on deployed app
   - authenticated user login completed successfully

10. Follow as authenticated user
    - manually verified on deployed app
    - user could follow a municipality successfully

11. Follow update display
    - manually verified live
    - follow state and update marker behavior work as expected

12. Admin verification
    - manually verified on deployed app
    - admin login and admin routes work as expected

## Remaining gaps

No open gaps remain for `P1-23`.

## Status

`P1-23` is `done`.

## Conclusion

The full V1 pilot journey is now verified in deployed environment, including:

- anonymous browse
- kiosk and QR continuation
- install flow
- authenticated citizen flow
- follow flow and update display
- authenticated admin verification
