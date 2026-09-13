import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CategoryVisual } from "@/components/categories/CategoryVisual"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Category } from "@/lib/types"
import { Archive, ArchiveRestore, Eye, Pencil, Trash2 } from "lucide-react"
import { formatAmount } from "@/lib/format"
import { type Expense } from "./ExpenseListItem"
import { formatDate } from "@/lib/format"

type Props = {
  expenses: Expense[]
  paidByName: (expense: Expense) => string
  currency: string
  categoryOf: (expense: Expense) => Category | null
  onView: (expense: Expense) => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onArchive: (expense: Expense) => void
  onUnarchive: (expense: Expense) => void
}

export function ExpenseTable({
  expenses,
  paidByName,
  currency,
  categoryOf,
  onView,
  onEdit,
  onDelete,
  onArchive,
  onUnarchive,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Paid by</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Split</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const category = categoryOf(expense);
          return (
            <TableRow key={expense.id}>
              <TableCell className="truncate font-medium min-w-0 max-w-55">
                <span className="flex items-center gap-2">
                  {expense.description || "Expense"}
                  {expense.is_archived && (
                    <Badge variant="destructive">archived</Badge>
                  )}
                </span>
              </TableCell>
              <TableCell>
                {category ? (
                  <span className="flex items-center gap-1.5">
                    <CategoryVisual
                      icon={category.icon}
                      color={category.color}
                      className="size-4 [&_svg]:size-3"
                    />
                    {category.name}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{formatAmount(expense.amount, currency)}</TableCell>
              <TableCell>{paidByName(expense)}</TableCell>
              <TableCell>{formatDate(expense.expense_date)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{expense.split_type}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onView(expense)}
                  >
                    <Eye />
                    View
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onEdit(expense)}
                  >
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
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
