import { describe, expect, it } from "vitest";
import { FinanceDataExporter, type FinanceExportState } from "@/shared/domain/FinanceDataExporter";
import type { Position } from "@/features/wealth/domain/types";
import type { Debt } from "@/shared/domain/types";
import type { Month } from "@/features/budget/domain/types";

const exporter = new FinanceDataExporter();

const cashPosition: Position = { id: "efectivo-1", name: "Cuenta", ticker: "", type: "efectivo", units: 500, price: 1, group: "liquidez", equityIndex: null };
const fundPosition: Position = { id: "fondo-1", name: "Fidelity World", ticker: "0P0000KSPA.F", type: "fondo", units: 10, price: 20, group: "rv", equityIndex: "world" };
const carLoan: Debt = { id: "coche", name: "Coche", installment: 173.28, balance: 8000, note: "En curso", isLongTerm: false, deadline: "2026-12-01" };

const emptyState: FinanceExportState = { portfolio: [], debts: [], baseBudget: null, fixedExpenseItems: [], months: [] };

describe("FinanceDataExporter", () => {
  describe("toJson", () => {
    it("should serialize the full export state as parseable, indented JSON", () => {
      const state: FinanceExportState = { ...emptyState, portfolio: [cashPosition], debts: [carLoan] };

      const json = exporter.toJson(state);

      expect(JSON.parse(json)).toEqual(state);
      expect(json).toContain("\n");
    });
  });

  describe("toCsv", () => {
    it("should render the portfolio value for a market position as units times price", () => {
      const csv = exporter.toCsv({ ...emptyState, portfolio: [fundPosition] });

      expect(csv).toContain("Fidelity World,0P0000KSPA.F,fondo,rv,10,20,200");
    });

    it("should render the portfolio value for a cash position as its raw units", () => {
      const csv = exporter.toCsv({ ...emptyState, portfolio: [cashPosition] });

      expect(csv).toContain("Cuenta,,efectivo,liquidez,500,1,500");
    });

    it("should include the debt deadline and leave the settlement date empty for an active debt", () => {
      const csv = exporter.toCsv({ ...emptyState, debts: [carLoan] });

      expect(csv).toContain("Coche,173.28,8000,En curso,2026-12-01,");
    });

    it("should quote a field that contains a comma to keep the CSV well formed", () => {
      const debtWithComma: Debt = { ...carLoan, note: "Cuota, revisar en enero" };

      const csv = exporter.toCsv({ ...emptyState, debts: [debtWithComma] });

      expect(csv).toContain('"Cuota, revisar en enero"');
    });

    it("should include one row per category for each registered month", () => {
      const month: Month = {
        id: "2026-07", date: new Date("2026-07-01"), label: "Julio 2026",
        overrides: {}, events: [],
        movements: [{ id: "movement-1", categoryId: "ocio", occurredAt: new Date("2026-07-10"), amount: 120, note: "" }],
        netIncomeOverride: null,
      };
      const state: FinanceExportState = {
        ...emptyState,
        baseBudget: { ingresoNeto: 2000, gastosFijos: 900, inversion: 400, fondoEmergencia: 200, ocio: 300, caprichos: 200 },
        months: [month],
      };

      const csv = exporter.toCsv(state);

      expect(csv).toContain("Julio 2026,Ocio,300,120");
    });

    it("should render an empty monthly budget section when no base budget has been configured yet", () => {
      const csv = exporter.toCsv(emptyState);

      expect(csv).toContain("Presupuesto mensual\nmes,categoria,presupuestado,real");
    });
  });
});
