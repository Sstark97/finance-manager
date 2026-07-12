// @vitest-environment jsdom
import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetMonthlyBreakdown } from "@/features/budget/components/BudgetMonthlyBreakdown";
import type { Budget, Month } from "@/features/budget/domain/types";
import { monthFactory } from "@/features/budget/domain/MonthFactory";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

const SAMPLE_BUDGET: Budget = { ingresoNeto: 1766, gastosFijos: 778.89, inversion: 293, fondoEmergencia: 325, ocio: 270, caprichos: 100 };

function StatefulBudgetMonthlyBreakdown({ initialMonths }: { initialMonths: Month[] }): React.JSX.Element {
  const [months, setMonths] = useState<Month[]>(initialMonths);
  return <BudgetMonthlyBreakdown baseBudget={SAMPLE_BUDGET} months={months} setMonths={setMonths} />;
}

function ocioCategoryRow(): HTMLElement {
  const ocioLabel = screen.getAllByText("Ocio").find((element) => element.tagName === "SPAN") as HTMLElement;
  return ocioLabel.parentElement!.parentElement as HTMLElement;
}

async function openBreakdownAndAddOcioEvent(amount: number): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /desglose/ }));
  await user.type(screen.getByPlaceholderText("Nombre (ej. deuda puntual)"), "Cine");
  await user.type(screen.getByPlaceholderText("Importe"), String(amount));
  const comboBoxes = screen.getAllByRole("combobox");
  await user.selectOptions(comboBoxes[comboBoxes.length - 1], "Ocio");
  await user.click(screen.getByRole("button", { name: "+ Añadir" }));
}

describe("BudgetMonthlyBreakdown", () => {
  it("should increase Real for a category when an event is added, without touching Total presupuestado", async () => {
    const month = monthFactory.create(2026, 6);
    render(<StatefulBudgetMonthlyBreakdown initialMonths={[month]} />);

    await openBreakdownAndAddOcioEvent(40);

    const ocioRow = within(ocioCategoryRow());
    expect(ocioRow.getByText((_text, element) => element?.textContent === `Total presupuestado: ${currencyFormatter.euroWithCents(SAMPLE_BUDGET.ocio)}`)).toBeInTheDocument();
    expect(ocioRow.getByText((_text, element) => element?.textContent === `+${currencyFormatter.euroWithCents(40)} vs plan`)).toBeInTheDocument();
  });

  it("should leave the manual Real input empty after an event is added with no manual actual registered", async () => {
    const month = monthFactory.create(2026, 6);
    render(<StatefulBudgetMonthlyBreakdown initialMonths={[month]} />);

    await openBreakdownAndAddOcioEvent(40);

    const ocioRow = within(ocioCategoryRow());
    expect(ocioRow.getByPlaceholderText("sin registrar")).toHaveValue(null);
  });
});
