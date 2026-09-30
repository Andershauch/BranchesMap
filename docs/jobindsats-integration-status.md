# Jobindsats integration status

Checked: 2026-09-30. This note describes the v3 migration and the operational import path.

## Current API

The integration uses Jobindsats API v3 at `https://api.jobindsats.dk/v3`.

- Authentication is `Authorization: Bearer <JOBINDSATS_API_TOKEN>`.
- Every request specifies `format=json`.
- Discovery uses `/subjects`, `/tables`, and `/table/<table_id>`.
- Data uses `/data/<table_id>` with period, hierarchy and measure-group parameters.
- The daily import uses measurement `y25i07` and imports open positions, daily average positions, and newly posted positions by municipality and ESCO title.
- Jobindsats values are snapshots, not individual job advertisements with addresses. The app's sample job cards remain demonstration content until a separate job feed is connected.

The official v3 guide says v2 is available only through 30 September 2026. The v3 interface changes endpoint paths, parameter names and response shape, and requires Bearer authentication. New development must target v3.

## Verification performed

- 2026-09-30: `GET /v3/table/y25i07?format=json` returned HTTP 200 with period, dimension, and measure metadata.
- 2026-09-30: the updated Node client returned HTTP 200 for v3 subjects, filtered table groups, Y25i07 metadata, and the full relevant-table discovery pass.
- 2026-09-30: the same metadata endpoint returned HTTP 401 when called with the v2 raw-token header, confirming that the old client header is not compatible with v3.
- 2026-09-30: a v3 data request for Næstved and the latest month returned HTTP 200 and the expected six columns: period, area, ESCO title, open positions, daily average, and newly posted positions.
- 2026-09-30: v2 still returned HTTP 200 for the Y25i07 table catalogue when called with its legacy raw-token header. STAR states that v2 will be retired after 30 September, so this response is not a reason to keep the app on v2.
- `scripts/jobindsats-discovery.ps1` and the scheduled import must use v3 and Bearer auth together; do not change one without the other.
- The live importer writes to Postgres. A full import has not been run as part of the migration check.

## Import operations

The daily GitHub Actions workflow runs `npm run jobindsats:daily` on Windows, then persists the mapped municipality snapshots. For a controlled check, query metadata or request one municipality into a temporary output folder before running a full import. The import is idempotent by municipality, source, table, and period.

Do not replace the existing StatBank estimate path solely because Jobindsats has the more recent API. The Jobindsats snapshot is a separate signal; the app must show source and period clearly and must not present aggregate counts as specific live vacancies.

## Follow-up

1. Run the scheduled import once in its normal CI environment and verify municipality coverage and period.
2. Compare a sample of imported rows with the Jobindsats UI/API and record the import run ID.
3. Review the workflow after the first scheduled run and alert on failure or stale data.
4. Refresh this note when STAR changes table metadata, especially the ESCO hierarchy or yearly title values.

## Official references

- [Jobindsats API v3 guide](https://jobindsats.dk/api/kom-i-gang/brugervejledning-til-version-3/)
- [Announcement of v3 and v2 retirement](https://jobindsats.dk/nyheder/nyhed/ny-version-af-jobindsats-api-er-nu-klar-til-brug/)
- [Jobindsats API v2 guide](https://www.jobindsats.dk/api/kom-i-gang/brugervejledning-til-version-2/)
