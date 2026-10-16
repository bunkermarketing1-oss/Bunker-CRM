import { expect, test } from "@playwright/test";
import { ADMIN, CLIENT, login, requireCredentials } from "./support/auth";

// Solo lectura: estos tests corren contra la base de producción, no crean ni borran datos.

test.describe("Admin role", () => {
  test.beforeEach(async ({ page }) => {
    requireCredentials(ADMIN, "ADMIN");
    await login(page, ADMIN);
  });

  test("can open the integrations hub to connect social networks", async ({ page }) => {
    await page.goto("/marketing/integrations");
    await expect(page).toHaveURL(/\/marketing\/integrations/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("sees campaigns from every client with a client filter", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(page.getByRole("heading", { name: /campañas & métricas por cliente/i })).toBeVisible();
  });
});

test.describe("Client role", () => {
  test.beforeEach(async ({ page }) => {
    requireCredentials(CLIENT, "CLIENT");
    await login(page, CLIENT);
  });

  test("is sent back to the dashboard when opening admin-only marketing pages", async ({ page }) => {
    await page.goto("/marketing/integrations");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("cannot read integrations through the API even with a valid session", async ({ page }) => {
    const response = await page.request.get("/api/integrations");
    expect(response.status()).toBe(403);
  });

  test("sees only their own campaigns page from the sidebar", async ({ page }) => {
    await page.getByRole("link", { name: /mis campañas/i }).click();
    await expect(page).toHaveURL(/\/campaigns/);
    await expect(page.getByRole("heading", { name: /rendimiento de tus campañas/i })).toBeVisible();
  });
});
