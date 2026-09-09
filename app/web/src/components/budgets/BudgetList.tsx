import { BudgetListItem, type Budget } from "./BudgetListItem";

type Props = {
  budgets: Budget[];
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
};

export function BudgetList({ budgets, onEdit, onDelete }: Props) {
  return (
    <div className="grid gap-3">
      {budgets.map((budget) => (
        <BudgetListItem
          key={budget.id}
          budget={budget}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
