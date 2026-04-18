import { disconnectPrismaScriptClient, prisma } from "./prisma-script-client";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseArgs(argv: string[]) {
  let email: string | null = null;
  let execute = false;
  let allowAdmin = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--execute") {
      execute = true;
      continue;
    }

    if (arg === "--allow-admin") {
      allowAdmin = true;
      continue;
    }

    if (arg === "--email") {
      email = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg.startsWith("--email=")) {
      email = arg.slice("--email=".length);
    }
  }

  return {
    email: email ? normalizeEmail(email) : null,
    execute,
    allowAdmin,
  };
}

function printUsage() {
  console.log("Usage:");
  console.log("  npm run user:delete -- --email user@example.com");
  console.log("  npm run user:delete -- --email user@example.com --execute");
  console.log("  npm run user:delete -- --email admin@example.com --execute --allow-admin");
}

async function main() {
  const { email, execute, allowAdmin } = parseArgs(process.argv.slice(2));

  if (!email) {
    printUsage();
    throw new Error("--email is required.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          savedSearches: true,
          searchFollows: true,
          auditEvents: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(`No user found for ${email}.`);
  }

  if (user.role === "admin" && !allowAdmin) {
    throw new Error(
      "Refusing to delete an admin account without --allow-admin. Use a named non-shared admin account review first.",
    );
  }

  const linkedUserEntityAuditEvents = await prisma.auditEvent.count({
    where: {
      entityType: "User",
      entityId: user.id,
    },
  });

  console.log(
    JSON.stringify(
      {
        mode: execute ? "execute" : "dry-run",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
        impact: {
          savedSearchesDeleted: user._count.savedSearches,
          searchFollowsDeleted: user._count.searchFollows,
          auditEventsDetachedByUserRelation: user._count.auditEvents,
          userEntityAuditEventsRedacted: linkedUserEntityAuditEvents,
        },
      },
      null,
      2,
    ),
  );

  if (!execute) {
    console.log("Dry-run only. Re-run with --execute to delete the account.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditEvent.updateMany({
      where: {
        entityType: "User",
        entityId: user.id,
      },
      data: {
        entityId: null,
      },
    });

    await tx.user.delete({
      where: {
        id: user.id,
      },
    });
  });

  console.log(`Deleted user account ${user.email}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaScriptClient();
  });
