import { describe, expect, it, vi, beforeEach } from "vitest";
import { exportFinanceData } from "@/app/actions/exportFinanceData";
import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { BudgetSnapshot } from "@/features/budget/application/BudgetSnapshot";

const requireUserIdMock = vi.hoisted(() => vi.fn());
const loadPortfolioInvoke = vi.hoisted(() => vi.fn());
const loadDebtsInvoke = vi.hoisted(() => vi.fn());
const loadBudgetInvoke = vi.hoisted(() => vi.fn());

vi.mock("@/infrastructure/auth/CurrentUserProvider", () => ({
  currentUserProvider: { requireUserId: requireUserIdMock },
}));
vi.mock("@/lib/di/ContainerDI", () => ({
  container: {
    loadPortfolio: () => ({ invoke: loadPortfolioInvoke }),
    loadDebts: () => ({ invoke: loadDebtsInvoke }),
    loadBudget: () => ({ invoke: loadBudgetInvoke }),
  },
}));

const SAMPLE_PORTFOLIO: Position[] = [
  { id: "btc", name: "Bitcoin", ticker: "BTC-EUR", type: "cripto", units: 0.01, price: 50000, group: "btc", equityIndex: null },
];
const SAMPLE_DEBTS: Debt[] = [{ id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "", isLongTerm: false }];
const EMPTY_BUDGET: BudgetSnapshot = { baseBudget: null, fixedExpenseItems: [], months: [] };

beforeEach(() => {
  vi.clearAllMocks();
  requireUserIdMock.mockResolvedValue("user-1");
  loadPortfolioInvoke.mockResolvedValue(SAMPLE_PORTFOLIO);
  loadDebtsInvoke.mockResolvedValue(SAMPLE_DEBTS);
  loadBudgetInvoke.mockResolvedValue(EMPTY_BUDGET);
});

describe("exportFinanceData", () => {
  it("should load the portfolio, debts and budget slices through the current user id", async () => {
    await exportFinanceData();

    expect(loadPortfolioInvoke).toHaveBeenCalledWith("user-1");
    expect(loadDebtsInvoke).toHaveBeenCalledWith("user-1");
    expect(loadBudgetInvoke).toHaveBeenCalledWith("user-1");
  });

  it("should serialize the last saved portfolio and debts as JSON", async () => {
    const result = await exportFinanceData();

    const parsed = JSON.parse(result.json) as { portfolio: Position[]; debts: Debt[] };
    expect(parsed.portfolio).toEqual(SAMPLE_PORTFOLIO);
    expect(parsed.debts).toEqual(SAMPLE_DEBTS);
  });

  it("should serialize the last saved portfolio and debts as CSV sections", async () => {
    const result = await exportFinanceData();

    expect(result.csv).toContain("Cartera");
    expect(result.csv).toContain("Deudas");
    expect(result.csv).toContain("Bitcoin");
    expect(result.csv).toContain("Coche");
  });
});
