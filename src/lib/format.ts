const safe = (value: number): number => (Number.isFinite(value) ? value : 0);

export const formatEuro = (amount: number): string =>
  safe(amount).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const formatEuroWithCents = (amount: number): string =>
  safe(amount).toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatPercent = (value: number): string => `${safe(value).toFixed(1)}%`;

export const generateId = (): string => Math.random().toString(36).slice(2, 9);
