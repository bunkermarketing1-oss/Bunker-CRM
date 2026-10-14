import { expect, test } from "@playwright/test";
import { ADMIN, fillLoginForm, login, requireCredentials } from "./support/auth";

test.describe("Authentication", () => {
  test("private pages redirect anonymous visitors to the login page", async ({ page }) => {
    await page.goto("/crm/leads");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fcrm%2Fleads/);
  });

  test("a wrong password shows an error and keeps the visitor on the login page", async ({ page }) => {
    requireCredentials(ADMIN, "ADMIN");
    await fillLoginForm(page, { email: ADMIN.email, password: `${ADMIN.password}-wrong` });

    await expect(page.getByText(/credenciales|incorrect|inválid/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("an admin lands on the dashboard after signing in", async ({ page }) => {
    requireCredentials(ADMIN, "ADMIN");
    await login(page, ADMIN);
  });
});
