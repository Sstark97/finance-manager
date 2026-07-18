const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const APPROACHING_THRESHOLD_DAYS = 30;

export class DebtDeadline {
  private constructor(private readonly daysRemaining: number) {}

  static fromIsoDate(deadlineIsoDate: string, referenceDate: Date): DebtDeadline {
    const startOfReferenceDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const deadlineDate = new Date(deadlineIsoDate);
    const startOfDeadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
    const daysRemaining = Math.round((startOfDeadlineDay.getTime() - startOfReferenceDay.getTime()) / MILLISECONDS_PER_DAY);
    return new DebtDeadline(daysRemaining);
  }

  daysRemainingCount(): number {
    return this.daysRemaining;
  }

  isOverdue(): boolean {
    return this.daysRemaining < 0;
  }

  isApproaching(): boolean {
    return this.daysRemaining >= 0 && this.daysRemaining <= APPROACHING_THRESHOLD_DAYS;
  }

  label(): string {
    if (this.isOverdue()) return `Vencida hace ${Math.abs(this.daysRemaining)} día${Math.abs(this.daysRemaining) === 1 ? "" : "s"}`;
    if (this.daysRemaining === 0) return "Vence hoy";
    return `Vence en ${this.daysRemaining} día${this.daysRemaining === 1 ? "" : "s"}`;
  }
}
