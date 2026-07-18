import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { Budget, FixedExpenseItem, Month } from "@/features/budget/domain/types";
import { CATEGORIES } from "@/features/budget/domain/config";
import { monthlyBudgetCalculator } from "@/features/budget/domain/MonthlyBudgetCalculator";

export interface FinanceExportState {
  portfolio: Position[];
  debts: Debt[];
  baseBudget: Budget | null;
  fixedExpenseItems: FixedExpenseItem[];
  months: Month[];
}

export class FinanceDataExporter {
  toJson(state: FinanceExportState): string {
    return JSON.stringify(state, null, 2);
  }

  toCsv(state: FinanceExportState): string {
    return [
      this.portfolioSection(state.portfolio),
      this.debtsSection(state.debts),
      this.fixedExpensesSection(state.fixedExpenseItems),
      this.monthlyBudgetSection(state),
    ].join("\n\n");
  }

  private portfolioSection(portfolio: Position[]): string {
    const header = ["nombre", "ticker", "tipo", "grupo", "participaciones", "precio", "valor"];
    const rows = portfolio.map(position => [
      position.name,
      position.ticker,
      position.type,
      position.group,
      position.units,
      position.price,
      position.type === "efectivo" ? position.units : position.units * position.price,
    ]);
    return this.toCsvTable("Cartera", header, rows);
  }

  private debtsSection(debts: Debt[]): string {
    const header = ["nombre", "cuota_mensual", "saldo", "nota", "fecha_limite", "liquidada_el"];
    const rows = debts.map(debt => [debt.name, debt.installment, debt.balance, debt.note, debt.deadline ?? "", debt.settledAt ?? ""]);
    return this.toCsvTable("Deudas", header, rows);
  }

  private fixedExpensesSection(fixedExpenseItems: FixedExpenseItem[]): string {
    const header = ["nombre", "importe"];
    const rows = fixedExpenseItems.map(item => [item.name, item.amount]);
    return this.toCsvTable("Gastos fijos", header, rows);
  }

  private monthlyBudgetSection(state: FinanceExportState): string {
    const header = ["mes", "categoria", "presupuestado", "real"];
    const rows: Array<Array<string | number>> = [];
    if (state.baseBudget != null) {
      const baseBudget = state.baseBudget;
      state.months.forEach(month => {
        const result = monthlyBudgetCalculator.calculate(month, baseBudget);
        CATEGORIES.forEach(category => {
          rows.push([month.label, category.name, result.values[category.id], result.realized[category.id] ?? ""]);
        });
      });
    }
    return this.toCsvTable("Presupuesto mensual", header, rows);
  }

  private toCsvTable(title: string, header: string[], rows: Array<Array<string | number>>): string {
    const lines = [title, header.map(field => this.csvField(field)).join(",")];
    rows.forEach(row => lines.push(row.map(field => this.csvField(field)).join(",")));
    return lines.join("\n");
  }

  private csvField(value: string | number): string {
    const text = String(value);
    const needsQuoting = /[",\n]/.test(text);
    const escapedText = text.replace(/"/g, '""');
    return needsQuoting ? `"${escapedText}"` : escapedText;
  }
}

export const financeDataExporter = new FinanceDataExporter();
