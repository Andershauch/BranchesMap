import "dotenv/config";

import { spawnSync } from "node:child_process";

function runImportStep() {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm run jobindsats:import:y25i07"]
      : ["run", "jobindsats:import:y25i07"];

  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`Jobindsats import step failed with exit code ${result.status ?? "unknown"}.`);
  }
}

async function runFollowCheckStep() {
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  const followCheckSecret = process.env.FOLLOW_CHECK_SECRET?.trim();

  if (!appBaseUrl || !followCheckSecret) {
    console.log("Skipping follow check step because APP_BASE_URL or FOLLOW_CHECK_SECRET is not configured.");
    return;
  }

  const endpoint = new URL("/api/follows/check", appBaseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-follows-check-secret": followCheckSecret,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Follow check request failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  console.log(JSON.stringify({ step: "follow-check", payload }, null, 2));
}

async function main() {
  console.log("Starting daily Jobindsats batch...");
  runImportStep();
  await runFollowCheckStep();
  console.log("Daily Jobindsats batch completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
