import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ExpenseWithSplits } from "@/lib/types"
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react"

export type Expense = ExpenseWithSplits

type Props = {
  expense: Expense
  paidByName: string
  currency: string
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onArchive: (expense: Expense) => void
  onUnarchive: (expense: Expense) => void
}

export function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount)
}

export function formatDate(value: string) {
  return value.slice(0, 10)
}

export function ExpenseListItem({
  expense,
  paidByName,
  currency,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
}: Props) {
  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {expense.description || "Expense"}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {formatAmount(expense.amount, currency)} · paid by {paidByName} ·{" "}
            {formatDate(expense.expense_date)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{expense.split_type}</Badge>
            <Badge variant="outline">{expense.splits.length} split(s)</Badge>
            {expense.is_archived && (
              <Badge variant="destructive">archived</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => onEdit(expense)}>
            <Pencil />
            Edit
          </Button>
          {expense.is_archived ? (
            <Button
              size="xs"
              variant="outline"
              onClick={() => onUnarchive(expense)}
            >
              <ArchiveRestore />
              Unarchive
            </Button>
          ) : (
            <Button
              size="xs"
              variant="outline"
              onClick={() => onArchive(expense)}
            >
              <Archive />
              Archive
            </Button>
          )}
          <Button
            size="xs"
            variant="destructive"
            onClick={() => onDelete(expense)}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
