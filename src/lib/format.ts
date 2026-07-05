export const formatEuro = (amount: number): string =>
  (amount ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const formatEuroWithCents = (amount: number): string =>
  (amount ?? 0).toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatPercent = (value: number): string => `${(value ?? 0).toFixed(1)}%`;

export const generateId = (): string => Math.random().toString(36).slice(2, 9);
