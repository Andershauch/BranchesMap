import "dotenv/config";

import { pruneExpiredUserActionTokens } from "@/lib/server/action-token-maintenance";
import { disconnectPrismaScriptClient, prisma } from "./prisma-script-client";

async function main() {
  const result = await pruneExpiredUserActionTokens({ db: prisma });
  console.log(JSON.stringify({ deleted: result.deleted, retentionDays: 30, cutoff: result.cutoff.toISOString() }));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrismaScriptClient();
  });
