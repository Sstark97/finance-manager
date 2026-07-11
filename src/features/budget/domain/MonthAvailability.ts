export class MonthAvailability {
  keyOf(date: Date): number {
    return date.getFullYear() * 12 + date.getMonth();
  }

  isAvailable(date: Date): boolean {
    return this.keyOf(date) <= this.keyOf(new Date());
  }
}

export const monthAvailability = new MonthAvailability();
