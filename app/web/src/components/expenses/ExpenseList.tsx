import { ExpenseListItem, type Expense } from "./ExpenseListItem"

type Props = {
  expenses: Expense[]
  paidByName: (expense: Expense) => string
  currency: string
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onArchive: (expense: Expense) => void
  onUnarchive: (expense: Expense) => void
}

export function ExpenseList({
  expenses,
  paidByName,
  currency,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
}: Props) {
  return (
    <div className="grid gap-3">
      {expenses.map((expense) => (
        <ExpenseListItem
          key={expense.id}
          expense={expense}
          paidByName={paidByName(expense)}
          currency={currency}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
        />
      ))}
    </div>
  )
}
