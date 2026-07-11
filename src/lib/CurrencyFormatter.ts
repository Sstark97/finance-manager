export class CurrencyFormatter {
  euro(amount: number): string {
    return this.safe(amount).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  }

  euroWithCents(amount: number): string {
    return this.safe(amount).toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  percent(value: number): string {
    return `${this.safe(value).toFixed(1)}%`;
  }

  private safe(value: number): number {
    return Number.isFinite(value) ? value : 0;
  }
}

export const currencyFormatter = new CurrencyFormatter();
