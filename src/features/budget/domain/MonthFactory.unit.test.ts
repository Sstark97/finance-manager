import { describe, expect, it } from "vitest";
import { monthFactory } from "@/features/budget/domain/MonthFactory";
import { monthAvailability } from "@/features/budget/domain/MonthAvailability";

describe("MonthFactory", () => {
  describe("create", () => {
    it("should produce the date and label matching the given year and month index", () => {
      const month = monthFactory.create(2026, 6);

      expect(month.date).toEqual(new Date(2026, 6, 1));
      expect(month.label).toBe(new Date(2026, 6, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", ""));
    });

    it("should default overrides, events, actual and netIncomeOverride to empty state", () => {
      const month = monthFactory.create(2026, 6);

      expect(month.overrides).toEqual({});
      expect(month.events).toEqual([]);
      expect(month.actual).toEqual({});
      expect(month.netIncomeOverride).toBeNull();
    });

    it("should keep the given overrides and events", () => {
      const events = [{ id: "e1", name: "Extra", amount: 50, category: "ingreso" as const }];

      const month = monthFactory.create(2026, 6, { inversion: 250 }, events);

      expect(month.overrides).toEqual({ inversion: 250 });
      expect(month.events).toEqual(events);
    });
  });

  describe("createCurrent", () => {
    it("should produce the date and label matching today's year and month", () => {
      const today = new Date();

      const month = monthFactory.createCurrent();

      expect(month.date).toEqual(new Date(today.getFullYear(), today.getMonth(), 1));
      expect(month.label).toBe(new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" }).replace(".", ""));
    });

    it("should be available since it is the current month", () => {
      const month = monthFactory.createCurrent();

      expect(monthAvailability.isAvailable(month.date)).toBe(true);
    });
  });
});
