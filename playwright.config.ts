import { defineConfig, devices } from "@playwright/test";

function assertIsolatedE2eDatabase() {
  if (process.env.RUN_E2E_TESTS !== "1") {
    throw new Error("Set RUN_E2E_TESTS=1 to run browser tests against the isolated E2E database.");
  }

  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) {
    throw new Error("DATABASE_URL must point to the local branches_map_e2e database.");
  }

  const databaseUrl = new URL(rawDatabaseUrl);
  const host = databaseUrl.hostname.toLowerCase();
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));

  if (!localHosts.has(host) || databaseName !== "branches_map_e2e") {
    throw new Error("E2E tests are restricted to a local database named branches_map_e2e.");
  }
}

assertIsolatedE2eDatabase();

const baseURL = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "test-results/e2e",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      APP_BASE_URL: baseURL,
    },
  },
});
