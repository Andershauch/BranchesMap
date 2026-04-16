# Data Quality and Ranking Plan

Date: 2026-04-16

## Goal

Improve how industries and representative job titles are prioritized so the app helps users faster and with better quality.

## Current state

The app currently uses:

- daily Jobindsats import
- keyword-based mapping from raw titles to 7 product industries
- representative title selection from imported top titles

This is sufficient for v1, but it has clear weaknesses:

- some raw titles are too generic
- ranking has been too close to raw import order
- presentation quality has not been explicitly scored

## What is implemented now

The first ranking pass now:

- maps raw Jobindsats titles to product industries
- normalizes representative titles
- scores titles by:
  - number of open positions
  - import rank
  - presentation quality
  - penalties for generic labels
  - bonuses for concrete role titles
- scores imported industries by:
  - category volume
  - representative title quality
  - representative title coverage
  - number of usable titles

This improves which titles are shown under the top industries.

The mapping layer has also been expanded to cover more of the previously weak areas, especially:

- pedagogical/social titles
- sales and customer-facing titles
- engineering / technical titles
- metal / auto / industrial titles
- hospitality-adjacent titles

The current ranking also uses recent import history to prefer industries that are stable across the latest periods instead of only reacting to a single-period spike.

The UI now also uses a stricter representative-title display filter:

- mapped titles can still exist in the data layer
- but broad umbrella labels are hidden from the representative title UI when better alternatives exist

Imported representative titles now also have a separate translation layer:

- English is the current reference translation set
- other locales have dedicated override files and currently fall back to English, then original Danish

There is now also a repeatable audit step in the repo:

- `npm run jobindsats:audit:titles`

It writes a report of:

- top unmapped titles
- top mapped-but-generic titles

This is the basis for cleaning the mapping systematically instead of by guesswork.

## Next ranking steps

### Step 1

Improve title quality scoring further:

- stronger penalties for generic umbrella labels
- stronger bonuses for citizen-readable concrete role names
- better handling of category-like labels that should not be shown first

### Step 2

Introduce industry ranking signals beyond volume:

- open positions
- newly posted positions
- change over time
- stability over multiple imports

Note:

- stability over multiple imports is now partly implemented
- a real freshness component is still limited by the current import shape, because `newlyPostedPositions` is available per municipality snapshot, not per mapped industry

### Step 3

Introduce a richer internal model:

- main product industry
- optional subcategory/tag
- preferred representative titles per locale

### Step 4

Prepare for user-help ranking:

- locale-aware title preferences
- later: distance/relevance weighting when precise job data exists

## Practical outcome target

The app should eventually separate:

- `most jobs overall`
- `best representative titles to show`
- `most useful titles for the current user`

These are related, but they are not the same ranking problem.
