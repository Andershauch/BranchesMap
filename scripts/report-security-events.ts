import { disconnectPrismaScriptClient, prisma } from "./prisma-script-client";

function parseHoursArg(argv: string[]) {
  for (const arg of argv) {
    if (arg.startsWith("--hours=")) {
      const parsed = Number.parseInt(arg.slice("--hours=".length), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
    }
  }

  const index = argv.indexOf("--hours");
  if (index >= 0) {
    const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
  }

  return 24;
}

async function main() {
  const hours = parseHoursArg(process.argv.slice(2));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [counts, recentEvents] = await Promise.all([
    prisma.auditEvent.groupBy({
      by: ["action"],
      where: {
        action: {
          startsWith: "security.",
        },
        createdAt: {
          gte: since,
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          action: "desc",
        },
      },
    }),
    prisma.auditEvent.findMany({
      where: {
        action: {
          startsWith: "security.",
        },
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        windowHours: hours,
        since: since.toISOString(),
        counts: counts.map((entry) => ({
          action: entry.action,
          count: entry._count._all,
        })),
        recentEvents: recentEvents.map((event) => ({
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          metadata: event.metadata,
          createdAt: event.createdAt.toISOString(),
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaScriptClient();
  });
