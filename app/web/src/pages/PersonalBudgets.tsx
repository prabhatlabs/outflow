import { Plus } from "lucide-react"
import { useEffect } from "react"
import { BannerCard } from "@/components/BannerCard"
import { BudgetList } from "@/components/budgets/BudgetList"
import type { Budget } from "@/components/budgets/BudgetListItem"
import { BudgetTable } from "@/components/budgets/BudgetTable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import { useDialogStore } from "@/store/dialog"
import { usePersonalBudgetsStore } from "@/store/budgets"
import { useViewModeStore } from "@/store/viewMode"

export default function PersonalBudgets() {
  const items = usePersonalBudgetsStore((s) => s.items)
  const status = usePersonalBudgetsStore((s) => s.status)
  const error = usePersonalBudgetsStore((s) => s.error)
  const hasMore = usePersonalBudgetsStore((s) => s.hasMore)
  const fetch = usePersonalBudgetsStore((s) => s.fetch)
  const fetchMore = usePersonalBudgetsStore((s) => s.fetchMore)
  const remove = usePersonalBudgetsStore((s) => s.remove)

  useEffect(() => {
    if (status === "idle") fetch()
  }, [status, fetch])

  const mode = useViewModeStore((s) => s.mode)

  const handleEdit = (budget: Budget) => {
    useDialogStore.getState().open("budget", { budgetId: budget.id })
  }

  const handleDelete = (budget: Budget) => {
    useDialogStore.getState().open("confirm", {
      title: "Delete budget?",
      description: "This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete",
      onConfirm: () => remove(budget.id),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal budgets"
        description="Limits for your own spending across groups."
        actions={
          <Button onClick={() => useDialogStore.getState().open("budget")}>
            <Plus className="size-4" />
            New budget
          </Button>
        }
      />

      {error && (
        <BannerCard variant="destructive" title="Failed to load budgets" description={error} />
      )}

      {status === "loading" && items.length === 0 && (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {status !== "loading" && items.length === 0 && (
        <BannerCard
          title="No budgets yet"
          description="Create a personal budget to track your spending."
          action={
            <Button onClick={() => useDialogStore.getState().open("budget")} size="sm">
              New budget
            </Button>
          }
        />
      )}

      {items.length > 0 &&
        (mode === "table" ? (
          <BudgetTable budgets={items} onEdit={handleEdit} onDelete={handleDelete} />
        ) : (
          <BudgetList budgets={items} onEdit={handleEdit} onDelete={handleDelete} />
        ))}

      {hasMore && items.length > 0 && (
        <Button variant="outline" onClick={() => fetchMore()} disabled={status === "loading"}>
          Load more
        </Button>
      )}
    </div>
  )
}
