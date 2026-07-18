import type { CategoryId } from "@/features/budget/domain/types";

export interface BudgetMovement {
  id: string;
  categoryId: CategoryId;
  occurredAt: Date;
  amount: number;
  note: string;
}
