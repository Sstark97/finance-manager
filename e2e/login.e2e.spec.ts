import { test, expect } from "@playwright/test";
import { E2E_TEST_USER } from "./setup/testUser.mjs";

test.describe("Credentials login", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("should sign the seeded test user in and land on their dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("textbox", { name: "Email" }).fill(E2E_TEST_USER.email);
    await page.getByLabel("Contraseña").fill(E2E_TEST_USER.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await page.waitForURL("/");
    await expect(page.getByRole("heading", { name: "Resumen financiero" })).toBeVisible();
  });

  test("should show an error message when the password is wrong", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("textbox", { name: "Email" }).fill(E2E_TEST_USER.email);
    await page.getByLabel("Contraseña").fill("wrong-password");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();

    await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
  });

  test("should redirect an unauthenticated visitor from the home page to login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login/);
  });
});
