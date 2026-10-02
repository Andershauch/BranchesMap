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

- Add an expiry cleanup job for consumed and expired `UserActionToken` rows before sustained public registration.
- Configure and test Preview mail delivery with an approved recipient.
- Add a second factor or organizational SSO for administrators before production access is broadened. Current credentials authentication does not provide MFA.
- Add browser coverage for password reset after the E2E environment can provide a seeded reset token; DB integration coverage exercises single-use behavior and session invalidation.
- New account-recovery page copy currently has Danish and English text; other supported locales fall back to English pending translation.

## Verification

Run `npm run verify:ci`. The database integration suite must run in GitHub Actions against its disposable PostgreSQL database (`RUN_DB_INTEGRATION_TESTS=1`). E2E tests run separately with the isolated `branches_map_e2e` database and `RUN_E2E_TESTS=1`; never point these suites at Preview or Production.
