// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FinanceAppShell, type FinanceAppShellProps } from "@/app/FinanceAppShell";
import { browserFileDownloader } from "@/shared/infrastructure/BrowserFileDownloader";

vi.mock("@/app/actions/savePortfolio", () => ({ savePortfolio: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/actions/saveDebts", () => ({ saveDebts: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/actions/saveBudget", () => ({ saveBudget: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/actions/saveGoalsSettings", () => ({ saveGoalsSettings: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/actions/saveWealthTargets", () => ({ saveWealthTargets: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/app/actions/authSession", () => ({ signOutAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/shared/infrastructure/BrowserFileDownloader", () => ({ browserFileDownloader: { download: vi.fn() } }));

const BASE_PROPS: FinanceAppShellProps = {
  currentUserEmail: "owner@example.com",
  initialPortfolio: [],
  initialDebts: [],
  initialBaseBudget: null,
  initialFixedExpenseItems: [],
  initialMonths: [],
  initialGoalsSettings: null,
  initialWealthTargets: null,
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false } as Response));
  vi.clearAllMocks();
});

describe("FinanceAppShell", () => {
  it("should offer a dedicated Deudas tab alongside Resumen, Patrimonio, Presupuesto and Metas", () => {
    render(<FinanceAppShell {...BASE_PROPS} />);

    expect(screen.getByRole("tab", { name: "Deudas" })).toBeInTheDocument();
  });

  it("should open on the Resumen tab showing the net worth dashboard by default", () => {
    render(<FinanceAppShell {...BASE_PROPS} />);

    expect(screen.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Resumen financiero" })).toBeInTheDocument();
    expect(screen.getByText("Patrimonio neto")).toBeInTheDocument();
  });

  it("should render the debts section and update the heading once the Deudas tab is selected", async () => {
    const debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "", isLongTerm: false };
    const user = userEvent.setup();
    render(<FinanceAppShell {...BASE_PROPS} initialDebts={[debt]} />);

    await user.click(screen.getByRole("tab", { name: "Deudas" }));

    expect(screen.getByRole("heading", { name: "Deudas" })).toBeInTheDocument();
    expect(screen.getByText("Deudas y patrimonio neto")).toBeInTheDocument();
  });

  it("should mark the active tab as selected for assistive technology", async () => {
    const user = userEvent.setup();
    render(<FinanceAppShell {...BASE_PROPS} />);

    expect(screen.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Presupuesto" }));

    expect(screen.getByRole("tab", { name: "Presupuesto" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "false");
  });

  it("should expose the tab content inside a single main landmark", () => {
    render(<FinanceAppShell {...BASE_PROPS} />);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("should keep the settings menu closed until the Ajustes button is pressed", () => {
    render(<FinanceAppShell {...BASE_PROPS} />);

    expect(screen.getByRole("button", { name: "Ajustes" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should open the settings menu with export and sign-out actions when Ajustes is pressed", async () => {
    const user = userEvent.setup();
    render(<FinanceAppShell {...BASE_PROPS} />);

    await user.click(screen.getByRole("button", { name: "Ajustes" }));

    expect(screen.getByRole("button", { name: "Ajustes" })).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("menu", { name: "Ajustes" });
    expect(within(menu).getByRole("menuitem", { name: "Exportar JSON" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Exportar CSV" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("should download a JSON file with the current app state when Exportar JSON is pressed", async () => {
    const user = userEvent.setup();
    render(<FinanceAppShell {...BASE_PROPS} />);

    await user.click(screen.getByRole("button", { name: "Ajustes" }));
    await user.click(screen.getByRole("menuitem", { name: "Exportar JSON" }));

    expect(browserFileDownloader.download).toHaveBeenCalledWith("finanzas.json", expect.any(String), "application/json");
  });

  it("should download a CSV file with the current app state when Exportar CSV is pressed", async () => {
    const user = userEvent.setup();
    render(<FinanceAppShell {...BASE_PROPS} />);

    await user.click(screen.getByRole("button", { name: "Ajustes" }));
    await user.click(screen.getByRole("menuitem", { name: "Exportar CSV" }));

    expect(browserFileDownloader.download).toHaveBeenCalledWith("finanzas.csv", expect.any(String), "text/csv");
  });

  it("should close the settings menu after selecting an export action", async () => {
    const user = userEvent.setup();
    render(<FinanceAppShell {...BASE_PROPS} />);

    await user.click(screen.getByRole("button", { name: "Ajustes" }));
    await user.click(screen.getByRole("menuitem", { name: "Exportar JSON" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
