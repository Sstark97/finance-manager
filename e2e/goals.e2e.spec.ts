import { test, expect } from "@playwright/test";

const PERSIST_SETTLE_MS = 1500;

test.describe("Goals tab persistence", () => {
  test("should persist an edited annual salary after reloading the page", async ({ page }) => {
    await page.goto("/goals");

    const annualSalaryInput = page.getByRole("spinbutton", { name: "Salario bruto anual actual" });
    await expect(annualSalaryInput).toBeVisible();

    const editedAnnualSalary = "31000";
    await annualSalaryInput.fill(editedAnnualSalary);
    await annualSalaryInput.blur();

    await page.waitForTimeout(PERSIST_SETTLE_MS);
    await page.reload();

    await expect(page.getByRole("spinbutton", { name: "Salario bruto anual actual" })).toHaveValue(editedAnnualSalary);
  });
});
