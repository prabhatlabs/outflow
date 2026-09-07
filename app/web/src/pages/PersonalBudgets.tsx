import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { BannerCard } from "@/components/BannerCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import { useDialogStore } from "@/store/dialog"
import { usePersonalBudgetsStore } from "@/store/budgets"

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personal budgets"
        description="Limits for your own spending across groups."
        actions={
          <Button onClick={() => useDialogStore.getState().open("budget")}>New budget</Button>
        }
      />

      {error && (
        <BannerCard variant="destructive" title="Failed to load budgets" description={error} />
      )}

      {status === "loading" && items.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
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

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((b) => (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle>₹ {String(b.amount_limit)}</CardTitle>
                <Badge variant="secondary">{b.period}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {b.start_date?.slice(0, 10) ?? "—"} → {b.end_date?.slice(0, 10) ?? "—"} · at {b.alert_threshold}%
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => useDialogStore.getState().open("budget", { budgetId: b.id })}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    useDialogStore.getState().open("confirm", {
                      title: "Delete budget?",
                      description: "This cannot be undone.",
                      destructive: true,
                      confirmLabel: "Delete",
                      onConfirm: () => remove(b.id),
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && items.length > 0 && (
        <Button variant="outline" onClick={() => fetchMore()} disabled={status === "loading"}>
          Load more
        </Button>
      )}
    </div>
  )
}
