import { Plus } from "lucide-react"
import { useEffect } from "react"
import { useParams } from "react-router"
import { BannerCard } from "@/components/BannerCard"
import { BudgetList } from "@/components/budgets/BudgetList"
import type { Budget } from "@/components/budgets/BudgetListItem"
import { BudgetTable } from "@/components/budgets/BudgetTable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import { useGroupBudgetsStore } from "@/store/budgets"
import { useDialogStore } from "@/store/dialog"
import { useViewModeStore } from "@/store/viewMode"

export function BudgetsPage() {
  const { groupId } = useParams()

  const items = useGroupBudgetsStore((s) => s.items)
  const status = useGroupBudgetsStore((s) => s.status)
  const error = useGroupBudgetsStore((s) => s.error)
  const hasMore = useGroupBudgetsStore((s) => s.hasMore)
  const fetch = useGroupBudgetsStore((s) => s.fetch)
  const fetchMore = useGroupBudgetsStore((s) => s.fetchMore)
  const remove = useGroupBudgetsStore((s) => s.remove)

  useEffect(() => {
    if (groupId && status === "idle") fetch(groupId)
  }, [groupId, status, fetch])

  const mode = useViewModeStore((s) => s.mode)

  const handleNew = () => {
    if (!groupId) return
    useDialogStore.getState().open("groupBudget", { groupId })
  }

  const handleEdit = (budget: Budget) => {
    if (!groupId) return
    useDialogStore.getState().open("groupBudget", { groupId, budgetId: budget.id })
  }

  const handleDelete = (budget: Budget) => {
    if (!groupId) return
    useDialogStore.getState().open("confirm", {
      title: "Delete budget?",
      description: "This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete",
      onConfirm: () => remove(groupId, budget.id),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group budgets"
        description="Spending limits for this group."
        actions={
          <Button onClick={handleNew}>
            <Plus className="size-4" />
            New budget
          </Button>
        }
      />

      {error && (
        <BannerCard
          variant="destructive"
          title="Failed to load budgets"
          description={error}
        />
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
          description="Create a group budget to track shared spending."
          action={
            <Button onClick={handleNew} size="sm">
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

      {hasMore && items.length > 0 && groupId && (
        <Button
          variant="outline"
          onClick={() => fetchMore(groupId)}
          disabled={status === "loading"}
        >
          Load more
        </Button>
      )}
    </div>
  )
}
