import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react"
import { formatAmount, formatDate, type Expense } from "./ExpenseListItem"

type Props = {
  expenses: Expense[]
  paidByName: (expense: Expense) => string
  currency: string
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onArchive: (expense: Expense) => void
  onUnarchive: (expense: Expense) => void
}

export function ExpenseTable({
  expenses,
  paidByName,
  currency,
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
          <TableHead>Amount</TableHead>
          <TableHead>Paid by</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Split</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => (
          <TableRow key={expense.id}>
            <TableCell className="truncate font-medium min-w-0 max-w-55">
              <span className="flex items-center gap-2">
                {expense.description || "Expense"}
                {expense.is_archived && (
                  <Badge variant="destructive">archived</Badge>
                )}
              </span>
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
        ))}
      </TableBody>
    </Table>
  )
}
