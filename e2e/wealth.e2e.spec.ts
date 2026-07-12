import { test, expect } from "@playwright/test";

const PERSIST_SETTLE_MS = 1500;

test.describe("Wealth tab persistence", () => {
  test("should persist an edited position name after reloading the page", async ({ page }) => {
    await page.goto("/");

    // The wealth tab refreshes prices from Yahoo on mount, which replaces the whole
    // portfolio array from a pre-mount snapshot. Waiting for that first round trip to
    // settle before editing avoids a race where the refresh overwrites the user's edit.
    await page
      .waitForResponse(
        (response) => response.url().endsWith("/api/prices") && response.request().method() === "POST",
        { timeout: 15000 },
      )
      .catch(() => {});

    await page.getByRole("button", { name: "Editar cartera" }).click();

    const positionNameInput = page.getByRole("textbox", { name: "Nombre" }).first();
    await expect(positionNameInput).toBeVisible();

    const editedPositionName = "Fidelity MSCI World E2E";
    await positionNameInput.fill(editedPositionName);
    await positionNameInput.blur();

    await page.waitForTimeout(PERSIST_SETTLE_MS);
    await page.reload();

    await page.getByRole("button", { name: "Editar cartera" }).click();
    await expect(page.getByRole("textbox", { name: "Nombre" }).first()).toHaveValue(editedPositionName);
  });
});

test.describe("Wealth targets persistence", () => {
  test("should persist an edited emergency fund target after reloading the page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Editar objetivos" }).click();

    const emergencyFundInput = page.getByRole("spinbutton", { name: "Fondo de emergencia objetivo (€)" });
    await expect(emergencyFundInput).toBeVisible();

    const editedEmergencyFund = "6000";
    await emergencyFundInput.fill(editedEmergencyFund);
    await emergencyFundInput.blur();

    await page.waitForTimeout(PERSIST_SETTLE_MS);
    await page.reload();

    await page.getByRole("button", { name: "Editar objetivos" }).click();
    await expect(page.getByRole("spinbutton", { name: "Fondo de emergencia objetivo (€)" })).toHaveValue(editedEmergencyFund);
  });
});
