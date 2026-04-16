# Jobindsats Title Translation Workflow

Date: 2026-04-16

## Goal

Translate imported Jobindsats representative titles without changing the original Danish search terms used for Jobnet links.

## Current model

- source of truth is `data/jobindsats-titles.csv`
- runtime translations are generated into `lib/i18n/generated/jobindsats-title-translations.ts`
- UI translation uses:
  1. locale-specific translation from generated data
  2. English reference translation
  3. original Danish title

## Files

Editable source file:

- `data/jobindsats-titles.csv`

Generated runtime file:

- `lib/i18n/generated/jobindsats-title-translations.ts`

Audit output:

- `docs/generated/jobindsats-title-missing.csv`

Scripts:

- `npm run jobindsats:translations:compile`
- `npm run jobindsats:translations:rebuild-csv`
- `npm run jobindsats:audit:master`
- `npm run jobindsats:audit:translations -- --locale=<locale>`

## Translation rule

In `data/jobindsats-titles.csv`:

- `da_key` is the Danish source title and must stay unchanged
- `en` is the English master translation
- the other locale columns are optional overrides
- if a locale cell is empty, fallback will use English first and Danish after that

## Workflow

1. Edit `data/jobindsats-titles.csv`
2. Run `npm run jobindsats:translations:compile`
3. Validate with `npm run lint` or `npm run build`
4. When new titles arrive from imports, run `npm run jobindsats:audit:master`
5. Fill the missing rows shown in `docs/generated/jobindsats-title-missing.csv`

If `data/jobindsats-titles.csv` ever becomes unreadable, rebuild it from the last clean committed locale files:

- `npm run jobindsats:translations:rebuild-csv`

## Important constraint

Jobnet links still use the original Danish title in the query string.

This is intentional and should not be changed unless search quality is re-tested.
