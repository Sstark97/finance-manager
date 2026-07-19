// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalsTab, type GoalsTabProps } from "@/features/goals/components/GoalsTab";
import type { GoalsSettings } from "@/features/goals/application/GoalsSettings";
import type { WealthTargets } from "@/features/wealth/domain/WealthTargets";
import { WEALTH_TARGETS_INITIAL } from "@/features/wealth/data/wealthTargets";
import { currencyFormatter } from "@/lib/CurrencyFormatter";
import { saveGoalsSettings } from "@/app/actions/saveGoalsSettings";

vi.mock("@/app/actions/saveGoalsSettings", () => ({ saveGoalsSettings: vi.fn().mockResolvedValue(undefined) }));

const SAMPLE_SETTINGS: GoalsSettings = {
  currentSalary: 27000, fiContribution: 293, fiReturn: 0.07, btcSavings: 0,
  btcConditions: { disposable: true, dcaActive: true },
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderGoalsTab(overrides: Partial<Pick<GoalsTabProps, "initialSettings" | "wealthTargets">> = {}) {
  return render(
    <GoalsTab
      portfolio={[]}
      initialSettings={overrides.initialSettings ?? null}
      wealthTargets={overrides.wealthTargets ?? null}
    />,
  );
}

describe("GoalsTab", () => {
  it("should render the explicit onboarding form when goals settings have not been configured yet", () => {
    renderGoalsTab({ initialSettings: null });

    expect(screen.getByText("Configura tus metas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear mi configuración de metas" })).toBeInTheDocument();
  });

  it("should replace the onboarding form with the goals workspace once the onboarding form is explicitly confirmed", () => {
    renderGoalsTab({ initialSettings: null });

    fireEvent.click(screen.getByRole("button", { name: "Crear mi configuración de metas" }));

    expect(screen.queryByText("Configura tus metas")).not.toBeInTheDocument();
    expect(screen.getByText("Libertad financiera")).toBeInTheDocument();
  });

  it("should render the normal goals workspace when settings are already configured", () => {
    renderGoalsTab({ initialSettings: SAMPLE_SETTINGS });

    expect(screen.queryByText("Configura tus metas")).not.toBeInTheDocument();
    expect(screen.getByText("Libertad financiera")).toBeInTheDocument();
  });

  it("should not show a checkbox to count the car as an asset, since that concept no longer exists", () => {
    renderGoalsTab({ initialSettings: SAMPLE_SETTINGS });

    expect(screen.queryByText(/Contar el coche como activo/)).not.toBeInTheDocument();
  });

  it("should not show the hardcoded Apple Watch banner", () => {
    renderGoalsTab({ initialSettings: SAMPLE_SETTINGS });

    expect(screen.queryByText(/Liquidar Apple Watch/)).not.toBeInTheDocument();
  });

  it("should not render the debts section, since debts now live in their own tab", () => {
    renderGoalsTab({ initialSettings: SAMPLE_SETTINGS });

    expect(screen.queryByText("Deudas y patrimonio neto")).not.toBeInTheDocument();
  });

  it("should fall back to the default wealth targets for the emergency fund card when none are configured", () => {
    const { container } = renderGoalsTab({ initialSettings: SAMPLE_SETTINGS, wealthTargets: null });

    expect(container.textContent).toContain(`Objetivo 6 meses de gastos (${currencyFormatter.euro(WEALTH_TARGETS_INITIAL.emergencyFund)})`);
  });

  it("should read the configured emergency fund target instead of the default when one is provided", () => {
    const wealthTargets: WealthTargets = { ...WEALTH_TARGETS_INITIAL, emergencyFund: 9000 };

    const { container } = renderGoalsTab({ initialSettings: SAMPLE_SETTINGS, wealthTargets });

    expect(container.textContent).toContain(`Objetivo 6 meses de gastos (${currencyFormatter.euro(9000)})`);
  });

  describe("autosave", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should persist the edited goals settings once the debounce window elapses", async () => {
      renderGoalsTab({ initialSettings: SAMPLE_SETTINGS });

      fireEvent.change(screen.getByRole("spinbutton", { name: "Salario bruto anual actual" }), { target: { value: "31000" } });

      expect(saveGoalsSettings).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(800);

      expect(saveGoalsSettings).toHaveBeenCalledWith({ ...SAMPLE_SETTINGS, currentSalary: 31000 });
    });

    it("should flush a pending goals settings save synchronously when the tab unmounts before the debounce fires", () => {
      const { unmount } = renderGoalsTab({ initialSettings: SAMPLE_SETTINGS });

      fireEvent.change(screen.getByRole("spinbutton", { name: "Salario bruto anual actual" }), { target: { value: "31000" } });
      unmount();

      expect(saveGoalsSettings).toHaveBeenCalledWith({ ...SAMPLE_SETTINGS, currentSalary: 31000 });
    });
  });
});
