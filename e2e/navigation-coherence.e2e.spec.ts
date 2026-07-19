import { test, expect } from "@playwright/test";

const PERSIST_SETTLE_MS = 1500;

test.describe("Cross-section navigation coherence", () => {
  test("should reflect a wealth target edited in Patrimonio on the Resumen dashboard after navigating there", async ({ page }) => {
    await page.goto("/wealth");

    await page.getByRole("button", { name: "Editar objetivos" }).click();
    const emergencyFundInput = page.getByRole("spinbutton", { name: "Fondo de emergencia objetivo (€)" });
    await expect(emergencyFundInput).toBeVisible();

    const editedEmergencyFund = "6543";
    await emergencyFundInput.fill(editedEmergencyFund);
    await emergencyFundInput.blur();

    // Give the debounced autosave time to persist before navigating away, exercising the
    // same guarantee the flush-on-unmount effect provides: the edit must be durable by the
    // time another section re-reads it from the server on the next navigation.
    await page.waitForTimeout(PERSIST_SETTLE_MS);

    await page.getByRole("link", { name: "Resumen" }).click();
    await page.waitForURL("/");

    await expect(page.getByRole("heading", { name: "Resumen financiero" })).toBeVisible();
    await expect(page.getByText(/6543/)).toBeVisible();
  });

  test("should reflect a debt edited in Deudas on the Resumen dashboard's net worth after navigating there", async ({ page }) => {
    await page.goto("/debts");

    await page.getByRole("button", { name: "Editar deudas" }).click();
    const balanceInput = page.getByRole("spinbutton", { name: "Saldo pendiente" }).first();
    await expect(balanceInput).toBeVisible();

    const editedBalance = "1234";
    await balanceInput.fill(editedBalance);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Guardado ✓")).toBeVisible();

    await page.waitForTimeout(PERSIST_SETTLE_MS);

    await page.getByRole("link", { name: "Resumen" }).click();
    await page.waitForURL("/");

    await expect(page.getByRole("heading", { name: "Resumen financiero" })).toBeVisible();
    await expect(page.getByText(/1234/)).toBeVisible();
  });
});
