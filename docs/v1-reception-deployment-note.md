# JOBVEJ V1 Reception Deployment Note

Date: 2026-04-18

## Purpose

This note describes the intended physical and runtime deployment model for the V1 reception setup.

It is written to prevent ambiguous kiosk behavior at go-live.

## Intended device model

V1 assumes:

- one or more reception touch screens
- the kiosk opens the dedicated kiosk route
- the kiosk is used for public anonymous browsing
- citizens continue on their own phone through the QR handoff

## Required start URL

The kiosk start URL must be:

```text
https://branches-map.vercel.app/da?kiosk=1
```

The kiosk must not start on the plain `/da` route.

## Screen and interaction assumptions

The intended interaction model is:

- portrait-first full-screen kiosk use
- touch interaction only
- no dependency on hover
- no dependency on keyboard or mouse for normal citizen use

## Browser/app mode

Recommended V1 setup:

- run in a locked-down browser or kiosk mode where possible
- hide browser chrome if device policy allows it
- prevent casual navigation away from the kiosk route

If true kiosk locking is not available, use the closest available constrained browser mode and ensure staff can restore the correct start URL quickly.

## Network assumptions

The reception device must have:

- stable internet access
- access to the deployed Vercel production app
- access to required app assets such as manifest and service worker

V1 does not assume reliable offline kiosk operation for the full map flow.

## Physical access expectations

Before go-live, operations must know:

- who can unlock the device
- who can change browser/device settings
- who can restore the kiosk route if the device is left on the wrong page
- who is called if the kiosk becomes unavailable during reception hours

## Required daily operational checks

At minimum, operations should be able to verify:

- kiosk route loads
- QR is visible
- idle reset still works
- normal `/da` route still remains separate from kiosk behavior

## Kiosk privacy posture

The kiosk is intended for public use, so the deployment model assumes:

- anonymous browse is the default
- kiosk reset after idle is part of the privacy posture
- kiosk route should not preserve one visitor's interaction state for the next visitor

## Current V1 assumption level

This document describes the intended deployment baseline.

If the final reception hardware, browser mode, or network policy differs materially from this note, the document must be updated before pilot go-live.

## Related documents

- `docs/v1-go-live-plan.md`
- `docs/v1-mobile-continuation-verification.md`
- `docs/v1-soft-launch-watch-plan.md`
