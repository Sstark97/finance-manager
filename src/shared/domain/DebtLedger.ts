import { DebtDeadline } from "@/shared/domain/DebtDeadline";
import type { Debt } from "@/shared/domain/types";

export class DebtLedger {
  constructor(private readonly debts: Debt[]) {}

  all(): Debt[] {
    return this.debts;
  }

  active(): Debt[] {
    return this.debts.filter((debt) => debt.settledAt === undefined);
  }

  activeSortedByDeadlineUrgency(referenceDate: Date): Debt[] {
    const daysRemainingOf = (debt: Debt): number =>
      debt.deadline ? DebtDeadline.fromIsoDate(debt.deadline, referenceDate).daysRemainingCount() : Infinity;
    return [...this.active()].sort((firstDebt, secondDebt) => daysRemainingOf(firstDebt) - daysRemainingOf(secondDebt));
  }

  settled(): Debt[] {
    return this.debts.filter((debt) => debt.settledAt !== undefined);
  }

  totalActiveBalance(): number {
    return this.active().reduce((total, debt) => total + debt.balance, 0);
  }

  totalActiveShortTermBalance(): number {
    return this.active()
      .filter((debt) => !debt.isLongTerm)
      .reduce((total, debt) => total + debt.balance, 0);
  }

  totalActiveLongTermBalance(): number {
    return this.active()
      .filter((debt) => debt.isLongTerm)
      .reduce((total, debt) => total + debt.balance, 0);
  }

  totalSettledBalance(): number {
    return this.settled().reduce((total, debt) => total + debt.balance, 0);
  }

  settle(id: string, settledAt: string): DebtLedger {
    return new DebtLedger(
      this.debts.map((debt) => (debt.id === id ? { ...debt, settledAt } : debt)),
    );
  }

  discard(id: string): DebtLedger {
    return new DebtLedger(this.debts.filter((debt) => debt.id !== id));
  }
}
