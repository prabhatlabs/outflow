import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GroupBudget, PersonalBudget } from "@/lib/types";
import { Pencil, Trash2 } from "lucide-react";

export type Budget = GroupBudget | PersonalBudget;

type Props = {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function BudgetListItem({ budget, onEdit, onDelete }: Props) {
  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            ₹ {String(budget.amount_limit)}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {formatDate(budget.start_date)} → {formatDate(budget.end_date)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{budget.period}</Badge>
            <Badge variant="outline">alert at {budget.alert_threshold}%</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => onEdit(budget)}>
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
      </CardContent>
    </Card>
  );
}
