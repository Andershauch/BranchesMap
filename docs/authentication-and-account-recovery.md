# Authentication and account recovery

Updated: 2026-10-02

## Account policy

- Public registration creates a citizen account with `emailVerifiedAt = null`. The account cannot sign in until its mailbox is verified.
- Staff and administrators must use an invitation. Accepting the single-use invitation confirms control of the invited mailbox.
- The initial superadmin is created through the one-time setup flow and is marked verified because the deployment owner selected and provisioned that address.
- Password reset is available only to active, verified accounts. The response is generic whether or not an address exists.
- A successful password reset increments `sessionVersion`, invalidating existing JWT sessions on their next authenticated request. Deactivation and role changes do the same.

## Token handling

`UserActionToken` stores only a SHA-256 hash of a random 256-bit token. Email verification tokens expire after 24 hours and reset tokens after one hour. Requests invalidate prior outstanding tokens of the same purpose. Tokens are consumed once in a database transaction. Verification requires an explicit button press after opening the email link, so automated email link scanners do not consume it on GET.

The verification and reset requests use distributed database rate limits and generic user-facing responses. Mail-provider failures are recorded as security events without recording the raw token or email address.

## Required configuration and deployment

Preview must have its own `RESEND_API_KEY` and `MAIL_FROM`; `MAIL_REPLY_TO` is optional. The sender domain must be verified in Resend. Use an approved test mailbox to verify registration, resend, invitation, and reset delivery. Do not use a production mailbox or production Resend key for Preview.

The additive Prisma schema change is applied to the Preview database `neondb` on Neon branch `staging` (2026-10-02). A Neon snapshot named `before-account-verification-schema` was created first. The one pre-existing staging superadmin was marked verified using its account creation time so the staging owner can continue signing in. Production remains untouched until rollout decisions and Preview acceptance are complete. This repository currently uses `prisma db push`, not checked-in SQL migrations. Confirm the generated schema diff and take a Neon snapshot before each environment schema change.

## Existing accounts rollout

Existing rows receive `emailVerifiedAt = null` when the additive column is introduced. Do not enable this code in Production until the account owner decides how to handle those users. Options are to grandfather previously provisioned users with a reviewed one-time backfill, or require them to use the verification/resend flow. The latter requires working Production email delivery and support instructions. Never infer verification from a password hash alone.

## Operational follow-up

- A daily GitHub Actions cleanup workflow and `npm run auth:cleanup-tokens` remove action tokens after their 30-day retention window. The workflow is restricted to `main` and requires the production `DATABASE_URL` repository secret; it will run in Production only after this change is merged.
- Preview mail delivery was confirmed on 2026-10-02 with an approved mailbox. The account received and used the verification link; staging records the account as active and verified. The first attempt happened before `RESEND_API_KEY` was added to Preview; a Preview redeployment was needed to load the key.
- Administrator MFA or organizational SSO is deferred by the project owner. Credentials authentication does not provide MFA; do not broaden administrator access until a solution and rollout are approved.
- Browser coverage exercises a seeded password-reset link, successful sign-in with the new password, and rejection of token reuse. Database integration coverage exercises single-use behavior and session invalidation.
- Account verification and recovery copy is provided for all supported locales (`da`, `en`, `uk`, `ar`, `fa`, `ur`, `pl`, `de`), including right-to-left layout for Arabic, Persian and Urdu.

## Verification

Run `npm run verify:ci`. The database integration suite must run in GitHub Actions against its disposable PostgreSQL database (`RUN_DB_INTEGRATION_TESTS=1`). E2E tests run separately with the isolated `branches_map_e2e` database and `RUN_E2E_TESTS=1`; never point these suites at Preview or Production.
