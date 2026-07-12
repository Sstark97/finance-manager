// @vitest-environment jsdom
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DebtsSection } from "@/features/goals/components/DebtsSection";
import type { Debt } from "@/shared/domain/types";
import { currencyFormatter } from "@/lib/CurrencyFormatter";

const SAMPLE_DEBT: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };

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

  it("should not call setDebts when removing a debt from the draft until Guardar cambios is pressed", async () => {
    const { setDebtsSpy } = renderDebtsSection();
    await openSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(screen.queryByRole("textbox", { name: "Nombre" })).not.toBeInTheDocument();
    expect(setDebtsSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(setDebtsSpy).toHaveBeenCalledTimes(1);
    expect(setDebtsSpy).toHaveBeenCalledWith([]);
  });
});
