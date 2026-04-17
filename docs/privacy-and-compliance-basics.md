# JOBVEJ Privacy and Compliance Basics

Date: 2026-04-17

## Purpose

This note captures the minimum privacy/compliance baseline for a V1 release.

It is not a full municipal DPIA or legal package. It is the minimum operational statement needed to understand what the product stores, why it stores it, and what still requires later governance work.

## Data categories currently processed

### Account data

- email
- optional display name
- role (`user` / `admin`)
- password hash

Purpose:
- authentication
- access control
- account identification

### User preference and product-use data

- followed municipalities
- saved searches
- translation edits made through admin tooling

Purpose:
- provide user-specific functionality
- allow admins to maintain translation quality

### Operational and audit data

- auth events
- security events
- selected admin actions
- event metadata such as route, flow, reason and actor linkage

Purpose:
- abuse detection
- operational troubleshooting
- accountability for admin-sensitive actions

### External and imported content

- Jobindsats import snapshots
- derived ranking and title metadata

Purpose:
- show municipality-level job/industry information

## Access model

- anonymous users can access public map and municipality views
- authenticated users can access their own follows and saved searches
- admins can access admin tools and security/translation operations
- server-side gating is used for private and admin routes

## Minimum retention position for V1

This project does not yet implement a full automated retention/deletion lifecycle in product code.

For V1, the operational position is:

- user accounts are retained until explicitly removed
- follows and saved searches are retained until user deletion or explicit cleanup
- audit/security events are retained for operational review
- imported Jobindsats data is retained as product data, not user data

## V1 limitations

The following still remain outside the current V1 baseline:

- formal legal-basis mapping per data category
- full retention and deletion automation
- formal privacy notice inside the product flow
- supplier/data-processor review pack
- incident response governance beyond engineering notes

## Practical release position

For V1, the app should be treated as:

- suitable for controlled release and product validation
- not yet equivalent to a full municipal citizen-service compliance package

## Related documents

- `docs/compliance-and-security-assessment.md`
- `docs/security-authorization-audit.md`
- `docs/v1-hardening-verification.md`
