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

async function openBreakdown(): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /desglose/ }));
  return user;
}

function getByExactText(scope: ReturnType<typeof within>, expectedText: string): HTMLElement {
  return scope.getByText((_text: string, element: Element | null) => element?.textContent === expectedText);
}

async function addOcioEvent(user: ReturnType<typeof userEvent.setup>, amount: number): Promise<void> {
  const nameInput = screen.getByPlaceholderText("Nombre (ej. deuda puntual)");
  const eventRow = within(nameInput.closest(".evt-row") as HTMLElement);
  await user.type(nameInput, "Cine");
  await user.type(eventRow.getByPlaceholderText("Importe"), String(amount));
  await user.selectOptions(eventRow.getByRole("combobox"), "Ocio");
  await user.click(eventRow.getByRole("button", { name: "+ Añadir" }));
}

async function addOcioMovement(user: ReturnType<typeof userEvent.setup>, amount: number, note = "Cine"): Promise<void> {
  const ocioRow = within(ocioCategoryRow());
  await user.type(ocioRow.getByLabelText("Importe del nuevo movimiento de Ocio"), String(amount));
  await user.type(ocioRow.getByLabelText("Nota del nuevo movimiento de Ocio"), note);
  await user.click(ocioRow.getByRole("button", { name: "+ Movimiento" }));
}

describe("BudgetMonthlyBreakdown", () => {
  it("should increase Real for a category when an event is added, without touching Total presupuestado", async () => {
    const month = monthFactory.create(2026, 6);
    render(<StatefulBudgetMonthlyBreakdown initialMonths={[month]} />);

    const user = await openBreakdown();
    await addOcioEvent(user, 40);

    const ocioRow = within(ocioCategoryRow());
    expect(ocioRow.getByText((_text, element) => element?.textContent === `Total presupuestado: ${currencyFormatter.euroWithCents(SAMPLE_BUDGET.ocio)}`)).toBeInTheDocument();
    expect(ocioRow.getByText((_text, element) => element?.textContent === `+${currencyFormatter.euroWithCents(40)} vs plan`)).toBeInTheDocument();
  });

  it("should show the registered total as unregistered when a category has no movements yet", async () => {
    const month = monthFactory.create(2026, 6);
    render(<StatefulBudgetMonthlyBreakdown initialMonths={[month]} />);

    await openBreakdown();

    const ocioRow = within(ocioCategoryRow());
    expect(ocioRow.getByText("sin registrar")).toBeInTheDocument();
  });

  it("should list a newly added movement and reflect its amount as the registered total", async () => {
    const month = monthFactory.create(2026, 6);
    render(<StatefulBudgetMonthlyBreakdown initialMonths={[month]} />);

    const user = await openBreakdown();
    await addOcioMovement(user, 42.5);

    const ocioRow = within(ocioCategoryRow());
    expect(getByExactText(ocioRow, currencyFormatter.euroWithCents(42.5))).toBeInTheDocument();
    expect(ocioRow.getByDisplayValue("Cine")).toBeInTheDocument();
  });

  it("should sum every movement recorded for the same category into its registered total", async () => {
    const month = monthFactory.create(2026, 6);
    render(<StatefulBudgetMonthlyBreakdown initialMonths={[month]} />);

    const user = await openBreakdown();
    await addOcioMovement(user, 30, "Cine");
    await addOcioMovement(user, 20, "Palomitas");

    const ocioRow = within(ocioCategoryRow());
    expect(getByExactText(ocioRow, currencyFormatter.euroWithCents(50))).toBeInTheDocument();
  });

  it("should remove a movement and fall back to unregistered when it was the only one", async () => {
    const month = monthFactory.create(2026, 6);
    render(<StatefulBudgetMonthlyBreakdown initialMonths={[month]} />);

    const user = await openBreakdown();
    await addOcioMovement(user, 42.5);
    const ocioRow = within(ocioCategoryRow());
    await user.click(ocioRow.getByRole("button", { name: /Eliminar movimiento de Ocio/ }));

    expect(ocioRow.getByText("sin registrar")).toBeInTheDocument();
  });
});
