// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DebtsSection } from "@/features/debts/components/DebtsSection";
import type { Debt } from "@/shared/domain/types";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import { saveDebts } from "@/app/actions/saveDebts";

vi.mock("@/app/actions/saveDebts", () => ({ saveDebts: vi.fn().mockResolvedValue(undefined) }));

const SAMPLE_DEBT: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso", isLongTerm: false };
const SETTLED_DEBT: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquidada", isLongTerm: false, settledAt: "2026-06-01" };

beforeEach(() => {
  vi.clearAllMocks();
});

function renderDebtsSection(initialDebts: Debt[] = [SAMPLE_DEBT]) {
  return render(<DebtsSection initialDebts={initialDebts} portfolioTotal={10000} />);
}

async function toggleSection(): Promise<void> {
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
  it("should show the active debts detail immediately since the section starts expanded", () => {
    renderDebtsSection();

    expect(screen.getByText(SAMPLE_DEBT.name)).toBeInTheDocument();
  });

  it("should hide the debts detail once the section header is collapsed", async () => {
    renderDebtsSection();

    await toggleSection();

    expect(screen.queryByText(SAMPLE_DEBT.name)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(SAMPLE_DEBT.name)).not.toBeInTheDocument();
  });

  it("should show a read-only view with no debt inputs or destructive buttons by default", () => {
    renderDebtsSection();

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
    await enterEditMode();

    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Saldo pendiente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("should keep the draft edit unsaved until Guardar cambios is pressed", async () => {
    renderDebtsSection();
    await enterEditMode();

    const user = userEvent.setup();
    const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
    await user.clear(balanceInput);
    await user.type(balanceInput, "5000");
    expect(balanceInput).toHaveValue(5000);

    await user.click(screen.getByRole("button", { name: "Descartar" }));

    const debtRow = screen.getByText(SAMPLE_DEBT.name).parentElement!.parentElement as HTMLElement;
    expect(within(debtRow).getByText((_text, element) => element?.textContent === currencyFormatter.euro(SAMPLE_DEBT.balance))).toBeInTheDocument();
  });

  it("should apply the draft to the read-only view exactly once Guardar cambios is pressed, and disable it without changes", async () => {
    renderDebtsSection();
    await enterEditMode();

    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    const user = userEvent.setup();
    const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
    await user.clear(balanceInput);
    await user.type(balanceInput, "5000");

    const saveButton = screen.getByRole("button", { name: "Guardar cambios" });
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    const debtRow = screen.getByText(SAMPLE_DEBT.name).parentElement!.parentElement as HTMLElement;
    expect(within(debtRow).getByText((_text, element) => element?.textContent === currencyFormatter.euro(5000))).toBeInTheDocument();
  });

  it("should show a saved confirmation after Guardar cambios, even though edit mode closes", async () => {
    renderDebtsSection();
    await enterEditMode();

    const user = userEvent.setup();
    const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
    await user.clear(balanceInput);
    await user.type(balanceInput, "5000");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByRole("button", { name: "Editar deudas" })).toBeInTheDocument();
    expect(screen.getByText("Guardado ✓")).toBeInTheDocument();
  });

  it("should revert the draft without persisting the change when Descartar is pressed", async () => {
    renderDebtsSection();
    await enterEditMode();

    const user = userEvent.setup();
    const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
    await user.clear(balanceInput);
    await user.type(balanceInput, "5000");

    await user.click(screen.getByRole("button", { name: "Descartar" }));
    await enterEditMode();

    expect(screen.getByRole("spinbutton", { name: "Saldo pendiente" })).toHaveValue(SAMPLE_DEBT.balance);
  });

  it("should not add the debt to the read-only list until Guardar cambios is pressed", async () => {
    renderDebtsSection([]);
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "+ Añadir deuda" }));

    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue("Nueva deuda");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByText("Nueva deuda")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Nombre" })).not.toBeInTheDocument();
  });

  it("should move a settled debt out of the active draft and into the history as soon as Liquidar is pressed", async () => {
    renderDebtsSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Liquidar" }));

    expect(screen.queryByRole("textbox", { name: "Nombre" })).not.toBeInTheDocument();

    await openHistory();
    expect(screen.getByText(SAMPLE_DEBT.name)).toBeInTheDocument();
  });

  it("should persist the settlement date only once Guardar cambios is pressed", async () => {
    renderDebtsSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Liquidar" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await openHistory();
    expect(screen.getByText(/Liquidada el/)).toBeInTheDocument();
  });

  it("should exclude settled debts from the total debt shown", () => {
    renderDebtsSection([SAMPLE_DEBT, SETTLED_DEBT]);

    const totalDebtLabel = screen.getByText("Deuda total:");
    const totalDebtRow = totalDebtLabel.parentElement as HTMLElement;
    const expectedBalanceText = currencyFormatter.euro(SAMPLE_DEBT.balance);
    expect(within(totalDebtRow).getByText((_text, element) => element?.textContent === expectedBalanceText)).toBeInTheDocument();
  });

  it("should keep the settled-debts history collapsed by default, even when settled debts exist", () => {
    renderDebtsSection([SAMPLE_DEBT, SETTLED_DEBT]);

    expect(screen.queryByText(SETTLED_DEBT.name)).not.toBeInTheDocument();
  });

  it("should reveal the settled-debts history once its own toggle is opened, and hide it again when toggled off", async () => {
    renderDebtsSection([SAMPLE_DEBT, SETTLED_DEBT]);

    await openHistory();
    expect(screen.getByText(SETTLED_DEBT.name)).toBeInTheDocument();

    await openHistory();
    expect(screen.queryByText(SETTLED_DEBT.name)).not.toBeInTheDocument();
  });

  it("should show an empty-state message in the history when no debt has been settled yet", async () => {
    renderDebtsSection([SAMPLE_DEBT]);
    await openHistory();

    expect(screen.getByText("Aún no has liquidado deudas.")).toBeInTheDocument();
  });

  it("should require a confirmation step before removing an active debt", async () => {
    renderDebtsSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(screen.getByText("¿Seguro?")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInTheDocument();
  });

  it("should cancel the pending deletion without removing the debt when Cancelar is pressed", async () => {
    renderDebtsSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("¿Seguro?")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nombre" })).toBeInTheDocument();
  });

  it("should remove the debt from the list only after the deletion is confirmed with Sí and saved", async () => {
    renderDebtsSection();
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Sí" }));

    expect(screen.queryByRole("textbox", { name: "Nombre" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.queryByText(SAMPLE_DEBT.name)).not.toBeInTheDocument();
    expect(screen.getByText("Aún no has añadido deudas.")).toBeInTheDocument();
  });

  it("should allow permanently deleting an already settled debt from the history, with the same two-step confirmation", async () => {
    renderDebtsSection([SETTLED_DEBT]);
    await enterEditMode();
    await openHistory();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(screen.getByText("¿Seguro?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sí" }));
    expect(screen.queryByText(SETTLED_DEBT.name)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(screen.getByText("Aún no has liquidado deudas.")).toBeInTheDocument();
  });

  it("should show a deadline badge next to an active debt that has a deadline", () => {
    const debtDueSoon: Debt = { ...SAMPLE_DEBT, deadline: "2999-01-15" };
    renderDebtsSection([debtDueSoon]);

    expect(screen.getByRole("status")).toHaveTextContent(/Vence en \d+ días/);
  });

  it("should not show a deadline badge for an active debt without a deadline", () => {
    renderDebtsSection([SAMPLE_DEBT]);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should list the debt with the closest deadline first", () => {
    const debtDueSoon: Debt = { id: "urgente", name: "Urgente", installment: 10, balance: 100, note: "", isLongTerm: false, deadline: "2999-01-01" };
    const debtDueLater: Debt = { id: "lejana", name: "Lejana", installment: 10, balance: 100, note: "", isLongTerm: false, deadline: "2999-12-01" };
    renderDebtsSection([debtDueLater, debtDueSoon]);

    const debtNames = screen.getAllByText(/Urgente|Lejana/).map(element => element.textContent);
    expect(debtNames).toEqual(["Urgente", "Lejana"]);
  });

  it("should show a long-term badge next to an active debt marked as long term", () => {
    const mortgage: Debt = { ...SAMPLE_DEBT, isLongTerm: true };
    renderDebtsSection([mortgage]);

    expect(screen.getByText("Largo plazo")).toBeInTheDocument();
  });

  it("should not show a long-term badge for an active debt not marked as long term", () => {
    renderDebtsSection([SAMPLE_DEBT]);

    expect(screen.queryByText("Largo plazo")).not.toBeInTheDocument();
  });

  it("should expose an unpressed long-term toggle for a debt not marked as long term while editing", async () => {
    renderDebtsSection([SAMPLE_DEBT]);
    await enterEditMode();

    expect(screen.getByRole("button", { name: "Largo plazo" })).toHaveAttribute("aria-pressed", "false");
  });

  it("should mark a debt as long term once its toggle is pressed and saved", async () => {
    renderDebtsSection([SAMPLE_DEBT]);
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Largo plazo" }));

    expect(screen.getByRole("button", { name: "Largo plazo" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByText("Largo plazo")).toBeInTheDocument();
  });

  it("should default a newly added debt to not long term", async () => {
    renderDebtsSection([]);
    await enterEditMode();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "+ Añadir deuda" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByText("Nueva deuda")).toBeInTheDocument();
    expect(screen.queryByText("Largo plazo")).not.toBeInTheDocument();
  });

  it("should expose a date input to set a debt's deadline while editing", async () => {
    renderDebtsSection();
    await enterEditMode();

    const deadlineInput = screen.getByLabelText("Fecha límite") as HTMLInputElement;
    expect(deadlineInput).toHaveAttribute("type", "date");
    expect(deadlineInput.value).toBe("");
  });

  it("should persist the deadline entered in edit mode once saved", async () => {
    renderDebtsSection();
    await enterEditMode();

    const user = userEvent.setup();
    const deadlineInput = screen.getByLabelText("Fecha límite");
    await user.type(deadlineInput, "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should announce the debts section as expanded by default, and collapsed once toggled", async () => {
    renderDebtsSection();

    expect(screen.getByRole("button", { name: /Deudas y patrimonio neto/ })).toHaveAttribute("aria-expanded", "true");

    await toggleSection();

    expect(screen.getByRole("button", { name: /Deudas y patrimonio neto/ })).toHaveAttribute("aria-expanded", "false");
  });

  describe("debt amortization projection", () => {
    it("should show the projection chart for the active debts in the section", () => {
      renderDebtsSection([SAMPLE_DEBT]);

      expect(screen.getByText("Proyección · amortización de deuda")).toBeInTheDocument();
      expect(screen.getByText(/Libre de deudas en ~/)).toBeInTheDocument();
    });

    it("should show the projection empty state when there are no active debts left", () => {
      renderDebtsSection([SETTLED_DEBT]);

      expect(screen.getByText("Sin deudas activas que proyectar.")).toBeInTheDocument();
    });
  });

  describe("autosave", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should persist the saved draft once the debounce window elapses", async () => {
      renderDebtsSection();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(screen.getByRole("button", { name: "Editar deudas" }));
      const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
      await user.clear(balanceInput);
      await user.type(balanceInput, "5000");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      expect(saveDebts).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(800);

      expect(saveDebts).toHaveBeenCalledWith([{ ...SAMPLE_DEBT, balance: 5000 }]);
    });

    it("should flush a pending debts save synchronously when the section unmounts before the debounce fires", async () => {
      const { unmount } = renderDebtsSection();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(screen.getByRole("button", { name: "Editar deudas" }));
      const balanceInput = screen.getByRole("spinbutton", { name: "Saldo pendiente" });
      await user.clear(balanceInput);
      await user.type(balanceInput, "5000");
      await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

      unmount();

      expect(saveDebts).toHaveBeenCalledWith([{ ...SAMPLE_DEBT, balance: 5000 }]);
    });
  });
});
