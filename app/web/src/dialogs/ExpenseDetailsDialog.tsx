import { CategoryVisual } from "@/components/categories/CategoryVisual";
// formatAmount/formatDate live with the list item so the detail dialog
// always formats amounts and dates exactly like the list.
import {
  formatAmount,
  formatDate,
} from "@/components/expenses/ExpenseListItem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ExpenseSplit,
  ExpenseWithSplits,
  GroupMemberWithUser,
} from "@/lib/types";
import { useCategoriesStore } from "@/store/categories";
import { useDialogStore } from "@/store/dialog";
import { useExpensesStore } from "@/store/expenses";
import { useGroupsStore } from "@/store/groups";
import { useMembersStore } from "@/store/members";
import { useEffect, useState } from "react";
import type { DialogPayloadMap } from "./types";

function memberName(m: GroupMemberWithUser | undefined, fallback: string) {
  if (!m) return fallback;
  return [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email;
}

function splitExtra(split: ExpenseSplit) {
  if (split.percentage != null) return `${split.percentage}%`;
  if (split.shares != null)
    return `${split.shares} share${split.shares === 1 ? "" : "s"}`;
  return null;
}

export function ExpenseDetailsDialog({
  id,
  payload,
}: {
  id: string;
  payload?: DialogPayloadMap["expenseDetails"];
}) {
  const groupId = payload?.groupId ?? "";
  const expenseId = payload?.expenseId ?? "";
  const close = useDialogStore((s) => s.close);

  const fetchOne = useExpensesStore((s) => s.fetchOne);
  const currency =
    useGroupsStore((s) => s.currentGroup)?.default_currency ?? "INR";

  const members = useMembersStore((s) => s.items);
  const membersStatus = useMembersStore((s) => s.status);
  const fetchMembers = useMembersStore((s) => s.fetch);

  const categories = useCategoriesStore((s) => s.items);
  const categoriesStatus = useCategoriesStore((s) => s.status);
  const fetchCategories = useCategoriesStore((s) => s.fetch);

  const [detail, setDetail] = useState<ExpenseWithSplits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    if (membersStatus === "idle") void fetchMembers(groupId);
    if (categoriesStatus === "idle") void fetchCategories(groupId);
  }, [groupId, membersStatus, categoriesStatus, fetchMembers, fetchCategories]);

  useEffect(() => {
    if (!groupId || !expenseId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchOne(groupId, expenseId).then(
      (expense) => {
        if (!cancelled) {
          setDetail(expense);
          setLoading(false);
        }
      },
      (err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load expense",
          );
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [groupId, expenseId, fetchOne]);

  const category = detail?.category_id
    ? (categories.find((c) => c.id === detail.category_id) ?? null)
    : null;
  const paidBy = detail
    ? members.find((m) => m.user_id === detail.paid_by)
    : undefined;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{detail?.description || "Expense details"}</DialogTitle>
        <DialogDescription>
          Full breakdown of this expense and its splits.
        </DialogDescription>
      </DialogHeader>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading expense...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : detail ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{detail.split_type}</Badge>
            <Badge variant="outline">
              {detail.splits?.length ?? detail.splits_count} split(s)
            </Badge>
            {detail.is_archived && (
              <Badge variant="destructive">archived</Badge>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-medium">
                {formatAmount(detail.amount, currency)}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">
                {formatDate(detail.expense_date)}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Paid by</dt>
              <dd className="font-medium">
                {memberName(paidBy, "Unknown")}
              </dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">Category</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                {category ? (
                  <>
                    <CategoryVisual
                      icon={category.icon}
                      color={category.color}
                      className="size-5 [&_svg]:size-3"
                    />
                    {category.name}
                  </>
                ) : (
                  "No category"
                )}
              </dd>
            </div>
          </dl>

          {detail.note && (
            <div className="grid gap-0.5 text-sm">
              <span className="text-muted-foreground">Note</span>
              <p>{detail.note}</p>
            </div>
          )}

          <div className="grid gap-2">
            <p className="text-sm font-medium">Splits</p>
            {(detail.splits ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No splits.</p>
            ) : (
              <ul className="grid gap-1.5">
                {(detail.splits ?? []).map((s) => {
                  const extra = splitExtra(s);
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-2xl bg-input/50 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {memberName(
                          members.find((m) => m.user_id === s.user_id),
                          "Unknown",
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                        {extra && <span className="text-xs">{extra}</span>}
                        <span className="font-medium text-foreground">
                          {formatAmount(s.amount_owed, currency)}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Expense not found.</p>
      )}

      <DialogFooter>
        <Button variant="ghost" onClick={() => close(id)}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}
