import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatAmount, formatDate } from "@/lib/format"
import type { Category, Expense } from "@/lib/types"
import { Archive, ArchiveRestore, Eye, Pencil, Trash2 } from "lucide-react"
import { CategoryVisual } from "@/components/categories/CategoryVisual"

export type { Expense }

type Props = {
  expense: Expense
  paidByName: string
  currency: string
  categoryOf: (expense: Expense) => Category | null
  onView: (expense: Expense) => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onArchive: (expense: Expense) => void
  onUnarchive: (expense: Expense) => void
}

export function ExpenseListItem({
  expense,
  paidByName,
  currency,
  categoryOf,
  onView,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
}: Props) {
  const category = categoryOf(expense);
  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="min-w-0">
          <span className="flex items-center gap-2 truncate font-medium">
            {category && (
              <CategoryVisual
                icon={category.icon}
                color={category.color}
                className="size-5 shrink-0 [&_svg]:size-3"
              />
            )}
            {expense.description || "Expense"}
          </span>
          <p className="truncate text-sm text-muted-foreground">
            {formatAmount(expense.amount, currency)} · paid by {paidByName} ·{" "}
            {formatDate(expense.expense_date)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{expense.split_type}</Badge>
            <Badge variant="outline">{expense.splits_count} split(s)</Badge>
            {expense.is_archived && (
              <Badge variant="destructive">archived</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => onView(expense)}>
            <Eye />
            View
          </Button>
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
