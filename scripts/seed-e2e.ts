import { createHash } from "node:crypto";

import { prisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/password";

const rawDatabaseUrl = process.env.DATABASE_URL;
if (process.env.RUN_E2E_TESTS !== "1") {
  throw new Error("Set RUN_E2E_TESTS=1 before seeding the isolated E2E database.");
}
if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL must point to the local branches_map_e2e database.");
}

const databaseUrl = new URL(rawDatabaseUrl);
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
if (!localHosts.has(databaseUrl.hostname.toLowerCase()) || databaseName !== "branches_map_e2e") {
  throw new Error("E2E fixtures may only be written to a local database named branches_map_e2e.");
}

const fixtures = [
  { email: "superadmin@e2e.branchesmap.test", name: "E2E Superadmin", role: "superadmin" as const },
  { email: "admin@e2e.branchesmap.test", name: "E2E Admin", role: "admin" as const },
  { email: "member@e2e.branchesmap.test", name: "E2E Member", role: "user" as const },
];
const fixturePassword = "E2E-only-password-2026";
const invitationEmail = "invited-admin@e2e.branchesmap.test";
const invitationToken = "e2e-invite-token-2026";
const pendingEmail = "pending-verify@e2e.branchesmap.test";
const blockedLoginEmail = "unverified-login@e2e.branchesmap.test";
const verificationToken = "e2e-email-verify-token-2026";
const resetEmail = "password-reset@e2e.branchesmap.test";
const resetToken = "e2e-password-reset-token-2026";

async function main() {
  const passwordHash = hashPassword(fixturePassword);
  const users = new Map<string, string>();

  for (const fixture of fixtures) {
    const user = await prisma.user.upsert({
      where: { email: fixture.email },
      update: { name: fixture.name, passwordHash, locale: "da", role: fixture.role, isActive: true, emailVerifiedAt: new Date() },
      create: { ...fixture, passwordHash, locale: "da", isActive: true, emailVerifiedAt: new Date() },
      select: { id: true },
    });
    users.set(fixture.role, user.id);
  }

  const pendingUser = await prisma.user.upsert({
    where: { email: pendingEmail },
    update: { name: "E2E Pending Member", passwordHash, locale: "da", role: "user", isActive: true, emailVerifiedAt: null },
    create: { email: pendingEmail, name: "E2E Pending Member", passwordHash, locale: "da", role: "user", isActive: true },
    select: { id: true },
  });
  await prisma.user.upsert({
    where: { email: blockedLoginEmail },
    update: { name: "E2E Unverified Login", passwordHash, locale: "da", role: "user", isActive: true, emailVerifiedAt: null },
    create: { email: blockedLoginEmail, name: "E2E Unverified Login", passwordHash, locale: "da", role: "user", isActive: true },
  });
  const resetUser = await prisma.user.upsert({
    where: { email: resetEmail },
    update: { name: "E2E Password Reset", passwordHash, locale: "da", role: "user", isActive: true, emailVerifiedAt: new Date() },
    create: { email: resetEmail, name: "E2E Password Reset", passwordHash, locale: "da", role: "user", isActive: true, emailVerifiedAt: new Date() },
    select: { id: true },
  });
  await prisma.userActionToken.deleteMany({ where: { userId: pendingUser.id, purpose: "email_verification" } });
  await prisma.userActionToken.create({
    data: {
      userId: pendingUser.id,
      purpose: "email_verification",
      tokenHash: createHash("sha256").update(verificationToken).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  await prisma.userActionToken.deleteMany({ where: { userId: resetUser.id, purpose: "password_reset" } });
  await prisma.userActionToken.create({
    data: {
      userId: resetUser.id,
      purpose: "password_reset",
      tokenHash: createHash("sha256").update(resetToken).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  await prisma.user.deleteMany({ where: { email: invitationEmail } });
  await prisma.userInvitation.deleteMany({ where: { email: invitationEmail } });
  await prisma.userInvitation.create({
    data: {
      email: invitationEmail,
      name: "E2E Invited Admin",
      locale: "da",
      role: "admin",
      tokenHash: createHash("sha256").update(invitationToken).digest("hex"),
      invitedByUserId: users.get("superadmin")!,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  console.log("Seeded isolated E2E fixtures. Test password: E2E-only-password-2026");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
