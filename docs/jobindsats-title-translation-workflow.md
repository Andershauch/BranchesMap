# Jobindsats Title Translation Workflow

Date: 2026-04-16

## Goal

Translate imported Jobindsats representative titles without changing the original Danish search terms used for Jobnet links.

## Current model

- original Danish title stays the source of truth
- UI translation uses:
  1. locale-specific override
  2. English reference translation
  3. original Danish title

## Files

Reference file:

- `lib/i18n/jobindsats-titles/en.ts`

Locale override files:

- `lib/i18n/jobindsats-titles/pl.ts`
- `lib/i18n/jobindsats-titles/uk.ts`
- `lib/i18n/jobindsats-titles/ar.ts`
- `lib/i18n/jobindsats-titles/fa.ts`
- `lib/i18n/jobindsats-titles/ur.ts`
- `lib/i18n/jobindsats-titles/de.ts`

## Translation rule

- do not change the object keys
- only translate the values
- if a title is not translated yet, leave it out and fallback will handle it

## Important constraint

Jobnet links still use the original Danish title in the query string.

This is intentional and should not be changed unless search quality is re-tested.
