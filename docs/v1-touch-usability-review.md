# JOBVEJ V1 Touch Usability Review

Date: 2026-04-18

## Scope

This review covers the touch-first reception experience on the deployed kiosk flow and the current implementation in:

- `components/home/home-map-explorer.tsx`
- `components/maps/sjaelland-municipality-map.tsx`
- `components/home/municipality-sheet.tsx`

## Inputs used

- manual deployed verification that kiosk mode and QR handoff work as expected
- code review of the kiosk map, sheet, and login/register entry flows
- live inspection of the deployed login page and anonymous follow redirect behavior

## Summary

The kiosk experience is usable for V1 without keyboard or mouse.

The current implementation already does the important things right:

- kiosk behavior is isolated to `?kiosk=1`
- the map uses pointer gestures rather than hover-dependent interaction
- the first visible actions in the sheet are large and centered
- the QR handoff is visible without entering a menu
- an abandoned session resets automatically

The remaining issues are real, but they are V1 polish issues rather than release blockers.

## Passes

1. Primary touch targets are large enough.
   - main sheet actions use full-width buttons with `min-h-10` or `min-h-11`
   - header controls use `h-10` to `h-11`
   - login submit button uses a large centered tap target

2. The core kiosk interaction is touch-native.
   - municipality selection happens through pointer interaction on the SVG map
   - the sheet expands and collapses with touch gestures
   - idle mode can be dismissed with a single touch anywhere on screen

3. Critical kiosk actions are visually obvious.
   - QR card is visible at the top left in kiosk mode
   - the municipality sheet anchors from the bottom and becomes the main action area
   - anonymous follow action redirects into registration instead of failing silently

4. Readability is acceptable for normal interaction distance.
   - page headings and action labels are large enough
   - login and register forms use high-contrast text and roomy spacing
   - municipality names in the sheet are prominent

## Risks and follow-up

1. The sheet close/collapse button is small.
   - current size is `h-7.5 w-7.5`, which is around `30px`
   - that is below a comfortable touch target for a public kiosk
   - the sheet is still operable because swipe and backdrop tap both work

2. The preview swipe hint is too small for standing-distance reading.
   - the hint currently renders at `text-[8px]`
   - it should not be treated as critical guidance

3. The QR card is compact.
   - the current width is around `11rem` to `12rem`
   - this is workable because the user already confirmed real-device scanning works
   - if reception lighting is poor, increasing the card size would still be a sensible `P2`

## V1 decision

`P1-15` can be treated as complete for V1.

Reason:

- the kiosk is usable with touch only
- the critical actions are discoverable
- no blocking keyboard-only or mouse-only dependency was found

## Recommended P2 polish

- enlarge the sheet close/collapse button to at least `40px`
- replace the tiny swipe hint with clearer visual affordance or remove it
- consider a slightly larger QR card on wide kiosk displays
