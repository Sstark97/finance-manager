import { test, expect } from "@playwright/test";

const PERSIST_SETTLE_MS = 1500;

test.describe("Budget tab persistence", () => {
  test("should persist a movement registered for a category after reloading the page", async ({ page }) => {
    await page.goto("/budget");
    await page.getByRole("button", { name: /desglose/ }).click();

    const newMovementAmountInput = page.getByRole("spinbutton", { name: "Importe del nuevo movimiento de Inversión" });
    await expect(newMovementAmountInput).toBeVisible();

    const movementAmount = "444";
    await newMovementAmountInput.fill(movementAmount);

    const newMovementRow = page.locator(".mov-row", { has: newMovementAmountInput });
    await newMovementRow.getByRole("button", { name: "+ Movimiento" }).click();

    const registeredMovementAmountInput = page.getByRole("spinbutton", { name: "Importe del movimiento de Inversión" });
    await expect(registeredMovementAmountInput).toHaveValue(movementAmount);

    await page.waitForTimeout(PERSIST_SETTLE_MS);
    await page.reload();

    await page.getByRole("button", { name: /desglose/ }).click();
    await expect(page.getByRole("spinbutton", { name: "Importe del movimiento de Inversión" })).toHaveValue(movementAmount);
  });
});
