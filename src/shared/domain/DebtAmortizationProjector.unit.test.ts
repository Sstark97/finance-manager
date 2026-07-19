import { describe, expect, it } from "vitest";
import { DebtAmortizationProjector } from "@/shared/domain/DebtAmortizationProjector";
import type { Debt } from "@/shared/domain/types";

const referenceDate = new Date(2026, 6, 1);

const carLoan: Debt = { id: "coche", name: "Coche", installment: 1000, balance: 1000, note: "", isLongTerm: false };
const personalLoan: Debt = { id: "prestamo", name: "Préstamo", installment: 500, balance: 2000, note: "", isLongTerm: false };
const settledKindle: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "", isLongTerm: false, settledAt: "2026-06-01" };

describe("DebtAmortizationProjector", () => {
  it("should return an empty projection when there are no debts at all", () => {
    const projection = new DebtAmortizationProjector().project([], referenceDate);

    expect(projection).toEqual({ points: [], debtFreeMonth: null });
  });

  it("should return an empty projection when every debt is already settled", () => {
    const projection = new DebtAmortizationProjector().project([settledKindle], referenceDate);

    expect(projection).toEqual({ points: [], debtFreeMonth: null });
  });

  it("should return a single zero-balance point when the active debt total is already zero", () => {
    const paidOffDebt: Debt = { ...carLoan, balance: 0 };

    const projection = new DebtAmortizationProjector().project([paidOffDebt], referenceDate);

    expect(projection.points).toEqual([{ monthIndex: 0, date: referenceDate, totalRemaining: 0 }]);
    expect(projection.debtFreeMonth).toBe(0);
  });

  it("should amortize a single debt at its fixed installment until it reaches zero", () => {
    const twoMonthDebt: Debt = { ...carLoan, balance: 2000, installment: 1000 };

    const projection = new DebtAmortizationProjector().project([twoMonthDebt], referenceDate);

    expect(projection.debtFreeMonth).toBe(2);
    expect(projection.points.map((point) => point.totalRemaining)).toEqual([2000, 1000, 0]);
  });

  it("should stop emitting points as soon as the total reaches zero instead of padding the horizon", () => {
    const projection = new DebtAmortizationProjector().project([carLoan], referenceDate, 360);

    expect(projection.points).toHaveLength(2);
    expect(projection.debtFreeMonth).toBe(1);
  });

  it("should sum several active debts amortizing at different rates until the last one is paid off", () => {
    const projection = new DebtAmortizationProjector().project([carLoan, personalLoan], referenceDate);

    expect(projection.debtFreeMonth).toBe(4);
    expect(projection.points.map((point) => point.totalRemaining)).toEqual([3000, 1500, 1000, 500, 0]);
  });

  it("should exclude a settled debt from the projected total", () => {
    const projection = new DebtAmortizationProjector().project([carLoan, settledKindle], referenceDate);

    expect(projection.points.map((point) => point.totalRemaining)).toEqual([1000, 0]);
  });

  it("should keep a debt with a non-positive installment constant instead of dividing by zero", () => {
    const stuckDebt: Debt = { ...carLoan, installment: 0 };

    const projection = new DebtAmortizationProjector().project([stuckDebt], referenceDate, 5);

    expect(projection.points).toHaveLength(6);
    expect(projection.points.every((point) => point.totalRemaining === stuckDebt.balance)).toBe(true);
    expect(projection.debtFreeMonth).toBeNull();
  });

  it("should cut the projection at the maximum horizon when the total never reaches zero", () => {
    const slowDebt: Debt = { ...carLoan, balance: 100000, installment: 10 };

    const projection = new DebtAmortizationProjector().project([slowDebt], referenceDate, 10);

    expect(projection.points).toHaveLength(11);
    expect(projection.debtFreeMonth).toBeNull();
    expect(projection.points[10].totalRemaining).toBeGreaterThan(0);
  });

  it("should label each point with the calendar month it falls on, starting at the reference date", () => {
    const projection = new DebtAmortizationProjector().project([carLoan], referenceDate);

    expect(projection.points[0].date).toEqual(new Date(2026, 6, 1));
    expect(projection.points[1].date).toEqual(new Date(2026, 7, 1));
  });
});
