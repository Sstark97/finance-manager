export interface Debt {
  id: string;
  name: string;
  installment: number;
  balance: number;
  note: string;
  deadline?: string;
  settledAt?: string;
}
