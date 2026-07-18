import { describe, expect, it } from "vitest";
import { DebtLedger } from "@/shared/domain/DebtLedger";
import type { Debt } from "@/shared/domain/types";

const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso" };
const settledKindle: Debt = { id: "kindle", name: "Kindle", installment: 44, balance: 132, note: "Liquida en septiembre", settledAt: "2026-06-01" };

describe("DebtLedger", () => {
  it("should treat a debt without settledAt as active", () => {
    const ledger = new DebtLedger([carLoan]);

    expect(ledger.active()).toEqual([carLoan]);
    expect(ledger.settled()).toEqual([]);
  });

  it("should treat a debt with settledAt as settled", () => {
    const ledger = new DebtLedger([settledKindle]);

    expect(ledger.active()).toEqual([]);
    expect(ledger.settled()).toEqual([settledKindle]);
  });

  it("should partition a mixed list into active and settled debts", () => {
    const ledger = new DebtLedger([carLoan, settledKindle]);

    expect(ledger.active()).toEqual([carLoan]);
    expect(ledger.settled()).toEqual([settledKindle]);
  });

  it("should sum only the active balances when computing the total", () => {
    const ledger = new DebtLedger([carLoan, settledKindle]);

    expect(ledger.totalActiveBalance()).toBe(carLoan.balance);
  });

  it("should return zero as the total active balance for an empty ledger", () => {
    const ledger = new DebtLedger([]);

    expect(ledger.totalActiveBalance()).toBe(0);
  });

  it("should sum only the settled balances when computing the settled total", () => {
    const ledger = new DebtLedger([carLoan, settledKindle]);

    expect(ledger.totalSettledBalance()).toBe(settledKindle.balance);
  });

  it("should return zero as the total settled balance for an empty ledger", () => {
    const ledger = new DebtLedger([]);

    expect(ledger.totalSettledBalance()).toBe(0);
  });

  it("should stamp a settlement date on the matching debt without changing its balance", () => {
    const ledger = new DebtLedger([carLoan]);

    const settledLedger = ledger.settle(carLoan.id, "2026-07-18");

    expect(settledLedger.all()).toEqual([{ ...carLoan, settledAt: "2026-07-18" }]);
    expect(settledLedger.active()).toEqual([]);
    expect(settledLedger.settled()).toEqual([{ ...carLoan, settledAt: "2026-07-18" }]);
  });

  it("should leave other debts untouched when settling one of them", () => {
    const anotherDebt: Debt = { id: "kindle-2", name: "Kindle 2", installment: 20, balance: 60, note: "" };
    const ledger = new DebtLedger([carLoan, anotherDebt]);

    const settledLedger = ledger.settle(carLoan.id, "2026-07-18");

    expect(settledLedger.all()).toEqual([{ ...carLoan, settledAt: "2026-07-18" }, anotherDebt]);
  });

  it("should permanently remove a debt when discarding it", () => {
    const ledger = new DebtLedger([carLoan, settledKindle]);

    const ledgerAfterDiscard = ledger.discard(carLoan.id);

    expect(ledgerAfterDiscard.all()).toEqual([settledKindle]);
  });

  it("should discard a settled debt just as well as an active one", () => {
    const ledger = new DebtLedger([carLoan, settledKindle]);

    const ledgerAfterDiscard = ledger.discard(settledKindle.id);

    expect(ledgerAfterDiscard.all()).toEqual([carLoan]);
  });

  it("should not mutate the original ledger when settling or discarding", () => {
    const ledger = new DebtLedger([carLoan]);

    ledger.settle(carLoan.id, "2026-07-18");
    ledger.discard(carLoan.id);

    expect(ledger.all()).toEqual([carLoan]);
  });
});
