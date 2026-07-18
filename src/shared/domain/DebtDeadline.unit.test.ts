import { describe, expect, it } from "vitest";
import { DebtDeadline } from "@/shared/domain/DebtDeadline";

const referenceDate = new Date("2026-07-18T10:00:00Z");

describe("DebtDeadline", () => {
  it("should count the days remaining until a future deadline", () => {
    const deadline = DebtDeadline.fromIsoDate("2026-08-02", referenceDate);

    expect(deadline.daysRemainingCount()).toBe(15);
    expect(deadline.label()).toBe("Vence en 15 días");
  });

  it("should treat a deadline falling today as due today, not overdue", () => {
    const deadline = DebtDeadline.fromIsoDate("2026-07-18", referenceDate);

    expect(deadline.daysRemainingCount()).toBe(0);
    expect(deadline.isOverdue()).toBe(false);
    expect(deadline.label()).toBe("Vence hoy");
  });

  it("should treat a deadline in the past as overdue", () => {
    const deadline = DebtDeadline.fromIsoDate("2026-07-10", referenceDate);

    expect(deadline.isOverdue()).toBe(true);
    expect(deadline.label()).toBe("Vencida hace 8 días");
  });

  it("should consider a deadline within 30 days as approaching", () => {
    const deadline = DebtDeadline.fromIsoDate("2026-08-10", referenceDate);

    expect(deadline.isApproaching()).toBe(true);
  });

  it("should not consider a deadline more than 30 days away as approaching", () => {
    const deadline = DebtDeadline.fromIsoDate("2026-09-01", referenceDate);

    expect(deadline.isApproaching()).toBe(false);
  });

  it("should not consider an overdue deadline as approaching", () => {
    const deadline = DebtDeadline.fromIsoDate("2026-07-01", referenceDate);

    expect(deadline.isApproaching()).toBe(false);
  });

  it("should use singular wording for exactly one day remaining or overdue", () => {
    const approachingDeadline = DebtDeadline.fromIsoDate("2026-07-19", referenceDate);
    const overdueDeadline = DebtDeadline.fromIsoDate("2026-07-17", referenceDate);

    expect(approachingDeadline.label()).toBe("Vence en 1 día");
    expect(overdueDeadline.label()).toBe("Vencida hace 1 día");
  });
});
