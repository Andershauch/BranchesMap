# JOBVEJ V1 Data and Product Logic

Date: 2026-04-17

## Scope

This note locks the V1 behavior for:

- industry ranking
- representative titles
- daily Jobindsats updates
- the relationship between imported counts and Jobnet links

## 1. Industry ranking and representative titles

V1 uses the daily `Y25i07` Jobindsats import as the primary source for municipality-level job volume.

The app does not expose raw Jobindsats title ordering directly. Instead it uses a presentation layer that:

- maps imported titles to the 7 product industries
- scores representative titles by:
  - open positions
  - import rank
  - title quality
  - generic-title penalties
- scores industries by:
  - total open positions
  - representative title quality
  - representative title coverage
  - stability across recent imports

Representative titles shown in the UI are filtered to avoid broad umbrella labels when more concrete titles exist.

V1 decision:

- keep the 7 product industries in the UI
- keep representative titles as supporting examples
- do not expand V1 into a more granular subcategory system

## 2. Daily import flow

V1 daily flow is:

1. GitHub Actions runs `.github/workflows/jobindsats-daily.yml`
2. The workflow runs `npm run jobindsats:daily`
3. `scripts/run-jobindsats-daily.ts` runs:
   - `npm run jobindsats:import:y25i07`
   - `npm run jobindsats:translations:sync-db`
   - follow-check if app secrets are configured
4. The import persists municipality snapshots and mapped category counts
5. New imported titles are automatically created in `JobindsatsTitleTranslation`
6. New rows can then be filtered in the admin translation editor as `Nye/importerede`

V1 decision:

- new imported titles must never block import or break runtime
- fallback display is allowed until translations are reviewed
- translation work enters the editor automatically through DB sync

## 3. Counts vs. Jobnet searches

The numbers shown for top industries on municipality pages come from the imported Jobindsats aggregation.

The clickable links open a related Jobnet search based on:

- municipality
- product industry
- sometimes representative title

These Jobnet links are intentionally useful, but they are not a guaranteed 1:1 reproduction of the imported count.

V1 decision:

- municipality sheet pills: clickable related Jobnet search, no count shown
- municipality page cards: imported count is shown, but the page explicitly states that clicking opens a related Jobnet search that may show a different number
- the UI must not imply that a Jobnet click reproduces the exact imported count

## 4. Operational expectation

For V1, the correct interpretation is:

- imported count = structured municipality-level signal from Jobindsats
- Jobnet click = practical navigation into relevant live jobs

These serve different user needs and are intentionally kept separate until a future version can unify count and click behavior behind the same live job feed.
