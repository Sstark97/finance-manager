export interface Debt {
  id: string;
  name: string;
  installment: number;
  balance: number;
  note: string;
  isLongTerm: boolean;
  deadline?: string;
  settledAt?: string;
}
