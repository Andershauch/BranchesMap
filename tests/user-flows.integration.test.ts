import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import assert from "node:assert/strict";

const enabled = process.env.RUN_DB_INTEGRATION_TESTS === "1";
const fixture = `ci-${randomUUID()}`;
const fixtureEmails = [
  `superadmin-${fixture}@example.test`,
  `second-superadmin-${fixture}@example.test`,
  `member-${fixture}@example.test`,
  `invited-${fixture}@example.test`,
];

function assertSafeIntegrationDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, "DATABASE_URL must be set when database integration tests are enabled");

  const url = new URL(databaseUrl);
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(url.hostname), "integration tests may only use a local database");
  assert.equal(url.pathname, "/branches_map_ci", "integration tests may only use the disposable branches_map_ci database");
}

let cleanup: (() => Promise<void>) | undefined;

after(async () => cleanup?.());

test("database-backed account and invitation flows", { skip: !enabled }, async () => {
  assertSafeIntegrationDatabase();
  const [{ prisma }, users, invitations] = await Promise.all([
    import("@/lib/server/prisma"),
    import("@/lib/server/users"),
    import("@/lib/server/user-invitations"),
  ]);
  cleanup = async () => {
    await prisma.user.deleteMany({ where: { email: { in: fixtureEmails } } });
    await prisma.$disconnect();
  };

  assert.equal(await prisma.user.count({ where: { role: "superadmin" } }), 0, "CI database must start without a superadmin");

  const [superadminEmail, secondSuperadminEmail, memberEmail, invitedEmail] = fixtureEmails;
  assert.ok(superadminEmail && secondSuperadminEmail && memberEmail && invitedEmail);

  const setup = await users.createInitialSuperAdmin({
    email: ` ${superadminEmail.toUpperCase()} `,
    password: "integration-superadmin-password",
    name: "CI Superadmin",
    locale: "da",
  });
  assert.equal(setup.ok, true);
  assert.equal(setup.user.email, superadminEmail);
  assert.equal(setup.user.role, "superadmin");

  const secondSetup = await users.createInitialSuperAdmin({
    email: secondSuperadminEmail,
    password: "integration-superadmin-password",
    locale: "da",
  });
  assert.deepEqual(secondSetup, { ok: false, reason: "already_configured" });

  const registration = await users.registerUser({
    email: ` ${memberEmail.toUpperCase()} `,
    password: "integration-member-password",
    name: "CI Member",
    locale: "da",
  });
  assert.equal(registration.ok, true);
  assert.equal(registration.user.email, memberEmail);
  assert.equal(registration.user.role, "user");
  assert.equal((await users.authenticateUser({ email: memberEmail, password: "wrong-password" })).ok, false);
  assert.equal((await users.authenticateUser({ email: ` ${memberEmail.toUpperCase()} `, password: "integration-member-password" })).ok, true);

  let inviteUrl: string | undefined;
  const invitation = await invitations.createUserInvitation({
    email: invitedEmail,
    name: "CI Invited Admin",
    locale: "da",
    role: "admin",
    invitedByUserId: setup.user.id,
    sendEmail: async ({ inviteUrl: url }) => {
      inviteUrl = url;
    },
  });
  assert.equal(invitation.ok, true);
  assert.ok(inviteUrl);

  const token = new URL(inviteUrl).pathname.split("/").at(-1);
  assert.ok(token);
  assert.notEqual(invitation.invitation.tokenHash, token, "database stores only a hash of the invitation token");
  assert.equal((await invitations.getUserInvitationByToken(token))?.email, invitedEmail);

  const accepted = await invitations.acceptUserInvitation({ token, password: "integration-invited-password" });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.user.email, invitedEmail);
  assert.equal(accepted.user.role, "admin");
  assert.equal(await invitations.getUserInvitationByToken(token), null);
  assert.deepEqual(await invitations.acceptUserInvitation({ token, password: "integration-invited-password" }), {
    ok: false,
    reason: "invalid_invitation",
  });
  assert.equal((await users.authenticateUser({ email: invitedEmail, password: "integration-invited-password" })).ok, true);
});
