// @vitest-environment jsdom
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DebtsSection } from "@/features/debts/components/DebtsSection";
import type { Debt } from "@/shared/domain/types";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

const SAMPLE_DEBT: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };
const SETTLED_DEBT: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquidada", settledAt: "2026-06-01" };

function StatefulDebtsSection({ initialDebts, onSetDebts }: { initialDebts: Debt[]; onSetDebts: (update: React.SetStateAction<Debt[]>) => void }): React.JSX.Element {
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const trackedSetDebts = (update: React.SetStateAction<Debt[]>): void => {
    onSetDebts(update);
    setDebts(update);
  };
  return <DebtsSection debts={debts} setDebts={trackedSetDebts} portfolioTotal={10000} />;
}

function renderDebtsSection(initialDebts: Debt[] = [SAMPLE_DEBT]) {
  const setDebtsSpy = vi.fn();
  const view = render(<StatefulDebtsSection initialDebts={initialDebts} onSetDebts={setDebtsSpy} />);
  return { setDebtsSpy, container: view.container };
}

async function openSection(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Deudas y patrimonio neto/ }));
}

async function enterEditMode(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Editar deudas" }));
}

async function openHistory(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Deudas liquidadas/ }));
}

describe("DebtsSection", () => {
  it("should keep the debts detail out of the document until the header is opened", () => {
    renderDebtsSection();

    expect(screen.queryByText(SAMPLE_DEBT.name)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(SAMPLE_DEBT.name)).not.toBeInTheDocument();
  });

  it("should show a read-only view with no debt inputs or destructive buttons by default once opened", async () => {
    renderDebtsSection();
    await openSection();

    const debtNameElement = screen.getByText(SAMPLE_DEBT.name);
    const debtRow = debtNameElement.parentElement!.parentElement as HTMLElement;
    const expectedBalanceText = currencyFormatter.euro(SAMPLE_DEBT.balance);
    expect(within(debtRow).getByText((_text, element) => element?.textContent === expectedBalanceText)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });

  it("should reveal the debt inputs once edit mode is explicitly entered", async () => {
    renderDebtsSection();
    await openSection();
    await enterEditMode();

    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Saldo pendiente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("should not call setDebts while editing a balance in the draft", async () => {
    const { setDebtsSpy } = renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
    await user.clear(balanceInput);
    await user.type(balanceInput, "5000");

    expect(balanceInput).toHaveValue(5000);
    expect(setDebtsSpy).not.toHaveBeenCalled();
  });

  it("should apply the draft to setDebts exactly once when Guardar cambios is pressed, and disable it without changes", async () => {
    const { setDebtsSpy } = renderDebtsSection();
    await openSection();
    await enterEditMode();

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    const user = userEvent.setup();
    const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
    await user.clear(balanceInput);
    await user.type(balanceInput, "5000");

    const saveButton = screen.getByRole("button", { name: "Guardar cambios" });
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    expect(setDebtsSpy).toHaveBeenCalledTimes(1);
    expect(setDebtsSpy).toHaveBeenCalledWith([{ ...SAMPLE_DEBT, balance: 5000 }]);
  });

  it("should show a saved confirmation after Guardar cambios, even though edit mode closes", async () => {
    renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
    await user.clear(balanceInput);
    await user.type(balanceInput, "5000");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByRole("button", { name: "Editar deudas" })).toBeInTheDocument();
    expect(screen.getByText("Guardado ✓")).toBeInTheDocument();
  });

  it("should revert the draft without calling setDebts when Descartar is pressed", async () => {
    const { setDebtsSpy } = renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
    await user.clear(balanceInput);
    await user.type(balanceInput, "5000");

    await user.click(screen.getByRole("button", { name: "Descartar" }));
    await enterEditMode();

    expect(screen.getByRole("spinbutton", { name: "Saldo pendiente" })).toHaveValue(SAMPLE_DEBT.balance);
    expect(setDebtsSpy).not.toHaveBeenCalled();
  });

  it("should not call setDebts when adding a debt to the draft until Guardar cambios is pressed", async () => {
    const { setDebtsSpy } = renderDebtsSection([]);
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "+ Añadir deuda" }));

    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("Nueva deuda");
    expect(setDebtsSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(setDebtsSpy).toHaveBeenCalledTimes(1);
    expect((setDebtsSpy.mock.calls[0][0] as Debt[])).toHaveLength(1);
  });

  it("should move a settled debt out of the active draft and into the history as soon as Liquidar is pressed", async () => {
    const { setDebtsSpy } = renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Liquidar" }));

    expect(screen.queryByRole("textbox", { name: "Nombre" })).not.toBeInTheDocument();
    expect(setDebtsSpy).not.toHaveBeenCalled();

    await openHistory();
    expect(screen.getByText(SAMPLE_DEBT.name)).toBeInTheDocument();
  });

  it("should persist the settlement date only once Guardar cambios is pressed", async () => {
    const { setDebtsSpy } = renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Liquidar" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(setDebtsSpy).toHaveBeenCalledTimes(1);
    expect(setDebtsSpy).toHaveBeenCalledWith([
      expect.objectContaining({ id: SAMPLE_DEBT.id, balance: SAMPLE_DEBT.balance, settledAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
    ]);
  });

  it("should exclude settled debts from the total debt shown once the section is open", async () => {
    renderDebtsSection([SAMPLE_DEBT, SETTLED_DEBT]);
    await openSection();

    const totalDebtLabel = screen.getByText("Deuda total:");
    const totalDebtRow = totalDebtLabel.parentElement as HTMLElement;
    const expectedBalanceText = currencyFormatter.euro(SAMPLE_DEBT.balance);
    expect(within(totalDebtRow).getByText((_text, element) => element?.textContent === expectedBalanceText)).toBeInTheDocument();
  });

  it("should keep the settled-debts history collapsed by default, even when settled debts exist", async () => {
    renderDebtsSection([SAMPLE_DEBT, SETTLED_DEBT]);
    await openSection();

    expect(screen.queryByText(SETTLED_DEBT.name)).not.toBeInTheDocument();
  });

  it("should reveal the settled-debts history once its own toggle is opened, and hide it again when toggled off", async () => {
    renderDebtsSection([SAMPLE_DEBT, SETTLED_DEBT]);
    await openSection();

    await openHistory();
    expect(screen.getByText(SETTLED_DEBT.name)).toBeInTheDocument();

    await openHistory();
    expect(screen.queryByText(SETTLED_DEBT.name)).not.toBeInTheDocument();
  });

  it("should show an empty-state message in the history when no debt has been settled yet", async () => {
    renderDebtsSection([SAMPLE_DEBT]);
    await openSection();
    await openHistory();

    expect(screen.getByText("Aún no has liquidado deudas.")).toBeInTheDocument();
  });

  it("should require a confirmation step before removing an active debt, and not call setDebts on the first click", async () => {
    const { setDebtsSpy } = renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(screen.getByText("¿Seguro?")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInTheDocument();
    expect(setDebtsSpy).not.toHaveBeenCalled();
  });

  it("should cancel the pending deletion without removing the debt when Cancelar is pressed", async () => {
    renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("¿Seguro?")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInTheDocument();
  });

  it("should remove the debt from the draft only after the deletion is confirmed with Sí", async () => {
    const { setDebtsSpy } = renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Sí" }));

    expect(screen.queryByRole("textbox", { name: "Nombre" })).not.toBeInTheDocument();
    expect(setDebtsSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(setDebtsSpy).toHaveBeenCalledTimes(1);
    expect(setDebtsSpy).toHaveBeenCalledWith([]);
  });

  it("should allow permanently deleting an already settled debt from the history, with the same two-step confirmation", async () => {
    const { setDebtsSpy } = renderDebtsSection([SETTLED_DEBT]);
    await openSection();
    await enterEditMode();
    await openHistory();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("¿Seguro?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sí" }));
    expect(screen.queryByText(SETTLED_DEBT.name)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(setDebtsSpy).toHaveBeenCalledWith([]);
  });

  it("should show a deadline badge next to an active debt that has a deadline", async () => {
    const debtDueSoon: Debt = { ...SAMPLE_DEBT, deadline: "2999-01-15" };
    renderDebtsSection([debtDueSoon]);
    await openSection();

    expect(screen.getByRole("status")).toHaveTextContent(/Vence en \d+ días/);
  });

  it("should not show a deadline badge for an active debt without a deadline", async () => {
    renderDebtsSection([SAMPLE_DEBT]);
    await openSection();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should list the debt with the closest deadline first", async () => {
    const debtDueSoon: Debt = { id: "urgente", name: "Urgente", installment: 10, balance: 100, note: "", deadline: "2999-01-01" };
    const debtDueLater: Debt = { id: "lejana", name: "Lejana", installment: 10, balance: 100, note: "", deadline: "2999-12-01" };
    renderDebtsSection([debtDueLater, debtDueSoon]);
    await openSection();

    const debtNames = screen.getAllByText(/Urgente|Lejana/).map(element => element.textContent);
    expect(debtNames).toEqual(["Urgente", "Lejana"]);
  });

  it("should expose a date input to set a debt's deadline while editing", async () => {
    renderDebtsSection();
    await openSection();
    await enterEditMode();

    const deadlineInput = screen.getByLabelText("Fecha límite") as HTMLInputElement;
    expect(deadlineInput).toHaveAttribute("type", "date");
    expect(deadlineInput.value).toBe("");
  });

  it("should persist the deadline entered in edit mode once saved", async () => {
    const { setDebtsSpy } = renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    const deadlineInput = screen.getByLabelText("Fecha límite");
    await user.type(deadlineInput, "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(setDebtsSpy).toHaveBeenCalledWith([{ ...SAMPLE_DEBT, deadline: "2026-12-01" }]);
  });

  it("should announce the collapsed and expanded state of the debts section for assistive technology", async () => {
    renderDebtsSection();

    expect(screen.getByRole("button", { name: /Deudas y patrimonio neto/ })).toHaveAttribute("aria-expanded", "false");

    await openSection();

    expect(screen.getByRole("button", { name: /Deudas y patrimonio neto/ })).toHaveAttribute("aria-expanded", "true");
  });
});
