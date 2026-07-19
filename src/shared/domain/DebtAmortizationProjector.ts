import { DebtLedger } from "@/shared/domain/DebtLedger";
import type { Debt } from "@/shared/domain/types";

export interface DebtAmortizationPoint {
  monthIndex: number;
  date: Date;
  totalRemaining: number;
}

export interface DebtAmortizationProjection {
  points: DebtAmortizationPoint[];
  debtFreeMonth: number | null;
}

export const DEFAULT_PROJECTION_HORIZON_MONTHS = 360;

export class DebtAmortizationProjector {
  project(debts: Debt[], referenceDate: Date, horizonMonths: number = DEFAULT_PROJECTION_HORIZON_MONTHS): DebtAmortizationProjection {
    const activeDebts = new DebtLedger(debts).active();
    if (activeDebts.length === 0) return { points: [], debtFreeMonth: null };

    const points: DebtAmortizationPoint[] = [];
    let debtFreeMonth: number | null = null;

    for (let monthIndex = 0; monthIndex <= horizonMonths; monthIndex++) {
      const totalRemaining = activeDebts.reduce((total, debt) => total + this.remainingBalanceAt(debt, monthIndex), 0);
      points.push({ monthIndex, date: this.addMonths(referenceDate, monthIndex), totalRemaining });
      if (totalRemaining <= 0) {
        debtFreeMonth = monthIndex;
        break;
      }
    }

    return { points, debtFreeMonth };
  }

  private remainingBalanceAt(debt: Debt, monthIndex: number): number {
    if (debt.installment <= 0) return debt.balance;
    return Math.max(0, debt.balance - debt.installment * monthIndex);
  }

  private addMonths(referenceDate: Date, monthsToAdd: number): Date {
    return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + monthsToAdd, 1);
  }
}

export const debtAmortizationProjector = new DebtAmortizationProjector();
