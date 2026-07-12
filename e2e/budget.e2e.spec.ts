import { test, expect } from "@playwright/test";

const PERSIST_SETTLE_MS = 1500;
const INVERSION_CATEGORY_INDEX = 1;

test.describe("Budget tab persistence", () => {
  test("should persist an edited actual amount for a category after saving and reloading the page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Presupuesto" }).click();
    await page.getByRole("button", { name: /desglose/ }).click();

    const inversionActualInput = page.getByRole("spinbutton", { name: "Real" }).nth(INVERSION_CATEGORY_INDEX);
    await expect(inversionActualInput).toBeVisible();

    const editedActualAmount = "444";
    await inversionActualInput.fill(editedActualAmount);

    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Guardado ✓")).toBeVisible();

    await page.waitForTimeout(PERSIST_SETTLE_MS);
    await page.reload();

    await page.getByRole("button", { name: "Presupuesto" }).click();
    await page.getByRole("button", { name: /desglose/ }).click();
    await expect(page.getByRole("spinbutton", { name: "Real" }).nth(INVERSION_CATEGORY_INDEX)).toHaveValue(editedActualAmount);
  });
});
