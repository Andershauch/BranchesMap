# JOBVEJ Admin And Translations Sprint Plan

Date: 2026-04-18

## Current status

Sprint status: `done`

Closeout note:

- admin navigation has been split into explicit tools
- `admin/home-map` is focused on operational map controls
- security events have their own route
- `regionTag` has been removed from the active admin workflow
- `AppTextTranslation` is live as the DB-backed runtime override layer
- `admin/app-texts` is live with search, filtering, reset, placeholder validation, and audit logging
- runtime dictionaries use file fallback plus DB override for approved frontend groups
- admin now has a top-level overview page at `/{locale}/admin`

## Closeout verification

The sprint was closed against these practical checks:

- admin can navigate between home-map, security, system texts, and Jobindsats title translations
- security review no longer lives inside the home-map tool
- primary map controls are shown before advanced display settings
- `regionTag` is no longer exposed as an active admin input without a concrete use case
- one edited system text is persisted in DB and reflected at runtime
- file dictionaries still act as fallback when DB overrides are absent
- non-approved keys are not editable through the system text editor
- placeholder mismatches are rejected on save
- system text update and reset actions are audit-logged

Verification notes:

- `npx prisma db push` was green when the translation model was introduced
- `npx prisma generate` was green when the translation model was introduced
- `npx tsc --noEmit` is green
- `npm run lint` is green

## Goal

This sprint makes the admin area usable as an operational tool and starts the transition from file-based UI text dictionaries to an editable translation system.

The sprint is intentionally split into two tracks:

1. Admin information architecture and workflow cleanup
2. System text editing architecture and first implementation slice

## Why this sprint now

Current findings from the codebase:

- `app/[locale]/admin/home-map/page.tsx` mixes map configuration, security review, and navigation into one page
- `homeMapRegionTag` is stored and editable but currently has no meaningful runtime use
- Jobindsats title translations already prove that a DB-backed translation editor works
- the rest of the UI still depends on static TS dictionaries in `lib/i18n/dictionaries/*.ts`

This means:

- the admin area needs information architecture cleanup before more features are added
- translation editing should be built on a stable model, not by directly editing nested dictionary files

## Sprint outcome

At the end of this sprint, the team should have:

- a cleaner admin navigation with separated operational concerns
- a focused home-map admin tool that prioritizes the controls people actually use
- security events moved to their own admin page
- a clear decision on `regionTag`
- a DB model and runtime strategy for editable system texts
- a first working admin editor for system texts
- one migrated slice of app copy running from DB overrides with file fallback

## Scope

In scope:

- admin IA cleanup
- security events page
- home-map admin simplification
- decision and implementation for `regionTag`
- DB model for system text translations
- runtime override layer for app dictionaries
- first admin editor for system text keys
- first migrated text domains

Out of scope for this sprint:

- full migration of every app string
- WYSIWYG or rich text editing
- workflow approvals / draft publishing
- audit history per translation key
- non-text content management
- redesign of citizen-facing flows beyond admin-related fallout

## Recommended sprint order

Execute in this order:

1. Admin IA decision and page split
2. `regionTag` decision and cleanup
3. Security events page
4. Home-map admin simplification
5. System text translation data model
6. Runtime override layer
7. Admin editor for system texts
8. Migrate the first text groups
9. QA and documentation

## Workstream A: Admin IA Cleanup

### Ticket A1: Introduce explicit admin navigation

Purpose:

- make the admin area understandable as a toolset instead of a single overloaded page

Build:

- add a shared admin navigation pattern or top-level admin landing structure
- create explicit links for:
  - `Admin / Kortstyring`
  - `Admin / Sikkerhed`
  - `Admin / Jobindsats-oversættelser`
  - `Admin / Systemtekster`

Likely files:

- `app/[locale]/admin/home-map/page.tsx`
- shared admin layout or new admin index page
- related dictionary labels

Done when:

- an admin can understand the available tools from navigation alone
- home-map is no longer treated as the implicit catch-all admin page

### Ticket A2: Move security events out of home-map admin

Purpose:

- remove operational noise from the configuration page

Build:

- create a dedicated `admin/security` page
- move the security event list there
- keep the initial V1 scope simple:
  - latest events
  - basic metadata rendering
  - paging or load-more only if necessary

Likely files:

- new `app/[locale]/admin/security/page.tsx`
- current security rendering logic extracted from `admin/home-map/page.tsx`
- possibly shared formatting helpers

Done when:

- `admin/home-map` no longer shows event cards
- security review has its own page and route

### Ticket A3: Simplify the home-map admin page

Purpose:

- prioritize the fields admins actually use most often

Decision:

The first visible controls on the home-map page should be:

- municipality name
- active status
- show on home map
- use in attract mode
- priority

Advanced controls should be visually secondary:

- label mode
- any future advanced display metadata

Build:

- compress the municipality forms into a more tool-like layout
- make primary toggles visually clearer than secondary metadata
- show summary stats at top:
  - visible municipalities
  - attract municipalities

Done when:

- an admin can change home-map and attract-mode setup without scrolling through unrelated controls

## Workstream B: RegionTag Decision

### Ticket B1: Decide whether `regionTag` stays

Current finding:

- `homeMapRegionTag` is stored, editable, and normalized
- it is not currently used in meaningful runtime behavior

Decision rule:

- if no concrete use case exists for the next 1-2 sprints, remove it from the UI now
- only keep it if it is assigned one immediate function

Valid immediate uses would be:

- filtering municipalities in admin
- batch operations in admin
- future campaign/rotation grouping in attract mode

Recommendation:

- remove `regionTag` from the admin UI in this sprint unless a named user story depends on it now
- keep DB field temporarily if you want a low-risk rollback path

Done when:

- `regionTag` is either:
  - removed from the admin interface, or
  - attached to a concrete runtime/admin use case

## Workstream C: Editable System Texts

### Ticket C1: Design the system text data model

Purpose:

- move editable UI text into a stable, searchable DB model

Recommended model:

- table name example: `AppTextTranslation`
- key: flat string key such as `menu.login` or `travel.note`
- locale: locale code
- value: translated text
- description: optional editor guidance
- group: optional high-level section such as `menu`, `auth`, `travel`
- createdAt / updatedAt

Recommended uniqueness:

- unique on `[key, locale]`

Do not model this as:

- one giant JSON blob
- one row per page with nested content
- direct DB replacement for the entire typed dictionary object

Reason:

- flat keys are easier to search
- filtering by locale and group becomes trivial
- migration from file dictionaries is incremental

Done when:

- schema is added
- naming convention is documented
- a seed/import strategy exists

### Ticket C2: Build runtime dictionary override layer

Purpose:

- keep the app stable while gradually moving text into DB

Required behavior:

1. file dictionary remains the canonical fallback
2. DB values override matching keys when present
3. missing DB values do not break rendering

Recommended approach:

- keep `lib/i18n/schema.ts` as the structural contract
- flatten the base dictionary into key-value pairs
- apply DB overrides by locale
- rebuild the dictionary object shape before returning from dictionary loader

Likely files:

- `lib/i18n/dictionaries.ts`
- new helper files such as:
  - `lib/i18n/flatten-dictionary.ts`
  - `lib/server/app-text-translations.ts`

Done when:

- app output is unchanged when DB is empty
- DB override of a single key is reflected in runtime without code changes

### Ticket C3: Build admin editor for system texts

Purpose:

- give admins the same kind of usable editing interface that already exists for Jobindsats titles

Recommended initial UX:

- route: `admin/system-texts`
- search by key or current value
- filter by locale
- filter by group
- simple textarea editor
- pagination

Use the Jobindsats translation editor as the pattern:

- `app/[locale]/admin/jobindsats-titles/page.tsx`
- `lib/server/jobindsats-title-translations.ts`

Do not try to build:

- rich text
- nested tree editors
- inline editing across every page in the app

Done when:

- one key can be edited in admin
- the DB value persists
- the runtime app reflects the edited value

### Ticket C4: Migrate the first text groups

Purpose:

- prove the architecture with a bounded slice before migrating everything

Recommended first migration set:

1. `menu.*`
2. `authStatus.*`
3. `travel.*`
4. `adminHomeMap.*`

Reason:

- high visibility
- operationally useful
- relatively small
- easy to verify

Second wave after that:

- `loginPage.*`
- `registerPage.*`
- `sheet.*`
- `home.*`

Done when:

- the first group set can be edited from admin
- file dictionaries still provide fallback for unmigrated keys

## Concrete ticket breakdown

### Sprint ticket list

1. `S1` Create admin landing/navigation structure: `done`
2. `S2` Create `admin/security` page and move event list there: `done`
3. `S3` Simplify `admin/home-map` page and demote advanced controls: `done`
4. `S4` Decide `regionTag` and either remove from UI or assign one concrete function: `done`
5. `S5` Add DB schema for app text translations: `done`
6. `S6` Implement dictionary override service with file fallback: `done`
7. `S7` Create `admin/system-texts` page: `done`
8. `S8` Seed/import first system text key set: `done`
9. `S9` Wire first text groups to runtime override checks: `done`
10. `S10` Run admin and i18n QA pass: `done`

## Acceptance criteria

### Admin acceptance

- admin users can navigate between at least:
  - home-map config
  - security events
  - Jobindsats translations
  - system texts
- security events are no longer embedded in the home-map tool
- home-map tool emphasizes the primary operational controls first
- `regionTag` is either removed from UI or clearly used

### Translation acceptance

- system text translations are stored in DB
- file dictionaries remain fallback-safe
- one edited DB value changes the visible app text
- editor supports search and locale switching
- at least one text group is migrated end-to-end

## Acceptance result

Admin acceptance: `passed`

- admin users can now navigate between the required four tool areas
- security events are on their own page
- home-map focuses on visible/attract/priority before advanced display settings
- `regionTag` is removed from the active admin UI

Translation acceptance: `passed`

- system text translations are stored in DB
- file dictionaries remain fallback-safe
- runtime reflects edited DB values
- the editor supports search, locale switching, filters, reset, and status review
- the first approved frontend groups are editable end-to-end through the runtime override layer

## Suggested implementation split

### Sprint 1A: Admin usability

Take first:

- `S1`
- `S2`
- `S3`
- `S4`

Expected output:

- admin is immediately more usable
- no translation architecture risk yet

### Sprint 1B: Translation platform

Take next:

- `S5`
- `S6`
- `S7`
- `S8`
- `S9`

Expected output:

- first editable system texts working in production architecture

### Sprint 1C: QA and closeout

Take last:

- `S10`

Expected output:

- tested admin flow
- tested fallback behavior
- updated documentation

## Technical notes

### RegionTag

At the moment, `regionTag` behaves like dead metadata.

If retained, the sprint must explicitly add one of:

- admin filter by region
- region bulk update action
- attract-mode grouping by region

If none of those are implemented now, hide it from the admin UI.

### Dictionary migration strategy

Recommended migration strategy:

1. keep `schema.ts`
2. keep existing file dictionaries
3. add a flatten/unflatten adapter
4. let DB override only known keys
5. ignore unknown DB keys in runtime, but surface them in admin diagnostics later

This avoids a dangerous hard cutover.

### Permissions and audit

The system text editor should reuse existing admin auth patterns.

Strong recommendation:

- record audit events for translation changes once the editor is working

That can be a follow-up ticket if needed, but should be planned early.

## Risks

1. Trying to migrate every string in one sprint will slow the team down.
2. Replacing typed dictionaries completely in one step will increase breakage risk.
3. Leaving `regionTag` undecided will keep clutter in the admin tool.
4. If system text keys are not flat and well named, the editor will become hard to use quickly.

## Recommended start-now sequence

If work starts immediately, begin here:

1. build admin navigation and split out security events
2. remove or demote `regionTag`
3. design `AppTextTranslation` schema and override layer

That sequence gives the fastest visible improvement while setting up the translation editor on a stable foundation.
