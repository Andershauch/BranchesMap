import { expect, test } from "@playwright/test";

const password = "E2E-only-password-2026";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/da/login");
  // Let Next.js finish loading client bundles before filling the server-action form.
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);
  await expect(passwordInput).toHaveValue(password);
  await page.getByRole("button", { name: "Log ind" }).click();
  await expect(page).toHaveURL(/\/da\/follows$/);
}

test("a member can reset a password once using a valid reset link", async ({ page }) => {
  const resetToken = "e2e-password-reset-token-2026";
  await page.goto(`/da/reset-password?token=${resetToken}`);
  // The reset page is the first form in this suite that submits immediately
  // after navigation. Wait for Next.js to hydrate its server action before
  // interacting with it, as we do for the other account flows below.
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="password"]').fill("Password-after-reset-2026");
  await page.getByRole("button", { name: "Gem adgangskode" }).click();
  await expect(page).toHaveURL(/\/da\/login\?passwordReset=1$/);

  await page.goto("/da/login");
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="email"]').fill("password-reset@e2e.branchesmap.test");
  await page.locator('input[name="password"]').fill("Password-after-reset-2026");
  await page.getByRole("button", { name: "Log ind" }).click();
  await expect(page).toHaveURL(/\/da\/follows$/);

  await page.goto(`/da/reset-password?token=${resetToken}`);
  await page.locator('input[name="password"]').fill("Another-password-after-reset-2026");
  await page.getByRole("button", { name: "Gem adgangskode" }).click();
  await expect(page).toHaveURL(/\/da\/reset-password\?invalid=1$/);
  const resetError = page.locator("main p[role='alert']");
  await expect(resetError).toHaveCount(1);
  await expect(resetError).toContainText("Linket er ugyldigt eller udløbet");
});

test("a member can sign in and sign out", async ({ page }) => {
  await signIn(page, "member@e2e.branchesmap.test");
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "Log ud" }).click();
  await expect(page).toHaveURL(/\/da(?:\?.*)?$/);
  await page.goto("/da/login");
  await expect(page.getByRole("heading", { name: "Log ind" })).toBeVisible();
});

test("a member cannot enter the admin area", async ({ page }) => {
  await signIn(page, "member@e2e.branchesmap.test");
  await page.goto("/da/admin");
  await expect(page).toHaveURL(/\/da\/follows$/);
});

test("an admin cannot enter superadmin user management", async ({ page }) => {
  await signIn(page, "admin@e2e.branchesmap.test");
  await page.goto("/da/admin/users");
  await expect(page).toHaveURL(/\/da\/admin$/);
  await expect(page.getByRole("heading", { name: "Admin: brugere" })).toHaveCount(0);
});

test("a superadmin can open user management", async ({ page }) => {
  await signIn(page, "superadmin@e2e.branchesmap.test");
  await page.goto("/da/admin/users");
  await expect(page).toHaveURL(/\/da\/admin\/users$/);
  await expect(page.getByRole("heading", { name: "Admin: brugere" })).toBeVisible();
});

test("an invited admin can accept the invitation only once", async ({ page }) => {
  await page.goto("/da/invite/e2e-invite-token-2026");
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="password"]').fill("Invited-account-password-2026");
  await page.getByRole("button", { name: "Opret konto" }).click();
  await expect(page).toHaveURL(/\/da\/admin$/);

  await page.goto("/da/invite/e2e-invite-token-2026");
  await expect(page.getByText(/Invitationen er ugyldig/)).toBeVisible();
});

test("email verification is required before a new member can sign in", async ({ page }) => {
  await page.goto("/da/login");
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="email"]').fill("unverified-login@e2e.branchesmap.test");
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Log ind" }).click();
  await expect(page).toHaveURL(/\/da\/verify-email\?sent=1(?:&.*)?$/);

  await page.goto("/da/verify-email/confirm?token=e2e-email-verify-token-2026");
  await page.getByRole("button", { name: "Bekræft min e-mail" }).click();
  await expect(page).toHaveURL(/\/da\/login\?verified=1/);
  await signIn(page, "pending-verify@e2e.branchesmap.test");
});

test("kiosk mode exposes the kiosk manifest and QR handoff", async ({ page }) => {
  await page.goto("/da?kiosk=1");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest-kiosk.webmanifest");
  await expect(page.locator("aside img")).toHaveAttribute("alt", /.+/);

  const manifestResponse = await page.request.get("/manifest-kiosk.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  await expect(manifestResponse.json()).resolves.toMatchObject({ start_url: "/da?kiosk=1", display: "fullscreen" });
});
