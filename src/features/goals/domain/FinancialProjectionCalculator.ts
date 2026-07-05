export interface FinancialProjectionParams {
  initial: number;
  contribution: number;
  annualReturn: number;
  target: number;
  maxMonths?: number;
}

export interface FinancialProjectionResult {
  months: number | null;
  finalCapital: number;
}

export class FinancialProjectionCalculator {
  project({ initial, contribution, annualReturn, target, maxMonths = 900 }: FinancialProjectionParams): FinancialProjectionResult {
    const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
    let capital = initial;
    for (let monthIndex = 1; monthIndex <= maxMonths; monthIndex++) {
      capital = capital * (1 + monthlyReturn) + contribution;
      if (capital >= target) return { months: monthIndex, finalCapital: capital };
    }
    return { months: null, finalCapital: capital };
  }
}

export const financialProjectionCalculator = new FinancialProjectionCalculator();
