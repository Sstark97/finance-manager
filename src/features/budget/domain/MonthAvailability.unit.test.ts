import { describe, expect, it } from "vitest";
import { monthAvailability } from "@/features/budget/domain/MonthAvailability";

describe("MonthAvailability", () => {
  describe("isAvailable", () => {
    it("should consider a past month available", () => {
      const pastMonth = new Date();
      pastMonth.setMonth(pastMonth.getMonth() - 1);

      expect(monthAvailability.isAvailable(pastMonth)).toBe(true);
    });

    it("should consider the current month available", () => {
      expect(monthAvailability.isAvailable(new Date())).toBe(true);
    });

    it("should consider a future month not available", () => {
      const futureMonth = new Date();
      futureMonth.setMonth(futureMonth.getMonth() + 1);

      expect(monthAvailability.isAvailable(futureMonth)).toBe(false);
    });
  });

  describe("keyOf", () => {
    it("should increase monotonically from one month to the next", () => {
      const january2026 = monthAvailability.keyOf(new Date(2026, 0, 1));
      const february2026 = monthAvailability.keyOf(new Date(2026, 1, 1));
      const january2027 = monthAvailability.keyOf(new Date(2027, 0, 1));

      expect(february2026).toBeGreaterThan(january2026);
      expect(january2027).toBeGreaterThan(february2026);
    });
  });
});
