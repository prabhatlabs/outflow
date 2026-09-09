import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import type { Budget } from "./BudgetListItem";

type Props = {
  budgets: Budget[];
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function BudgetTable({ budgets, onEdit, onDelete }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Amount</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Start</TableHead>
          <TableHead>End</TableHead>
          <TableHead>Alert</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {budgets.map((budget) => (
          <TableRow key={budget.id}>
            <TableCell className="font-medium">
              ₹ {String(budget.amount_limit)}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{budget.period}</Badge>
            </TableCell>
            <TableCell>{formatDate(budget.start_date)}</TableCell>
            <TableCell>{formatDate(budget.end_date)}</TableCell>
            <TableCell>{budget.alert_threshold}%</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onEdit(budget)}
                >
                  <Pencil />
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => onDelete(budget)}
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
  );
}
