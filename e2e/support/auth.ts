import { expect, test, type Page } from "@playwright/test";

export interface Credentials {
  email: string;
  password: string;
}

// Credenciales solo por variables de entorno: la base es la de producción y no se
// deben commitear contraseñas. Ver .env.example (E2E_*).
function readCredentials(prefix: "ADMIN" | "CLIENT"): Credentials | null {
  const email = process.env[`E2E_${prefix}_EMAIL`];
  const password = process.env[`E2E_${prefix}_PASSWORD`];
  return email && password ? { email, password } : null;
}

export const ADMIN = readCredentials("ADMIN");
export const CLIENT = readCredentials("CLIENT");

/** Salta el test (en vez de fallar) si no hay credenciales configuradas para ese rol. */
export function requireCredentials(credentials: Credentials | null, role: string): asserts credentials is Credentials {
  test.skip(!credentials, `Define E2E_${role}_EMAIL y E2E_${role}_PASSWORD para correr este test.`);
}

export async function fillLoginForm(page: Page, { email, password }: Credentials) {
  await page.goto("/login");
  // Los <label> del formulario no están asociados a los inputs (sin htmlFor), por eso se
  // ubican por type/autocomplete en lugar de getByLabel.
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
}

export async function login(page: Page, credentials: Credentials) {
  await fillLoginForm(page, credentials);
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}
