import { HandCoins } from "lucide-react"
import { useEffect } from "react"
import { Link, useParams } from "react-router"
import { BannerCard } from "@/components/BannerCard"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import type { BalanceRow } from "@/lib/types"
import { useBalancesStore } from "@/store/balances"
import { useDialogStore } from "@/store/dialog"
import { useGroupsStore } from "@/store/groups"
import { useMembersStore } from "@/store/members"

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount)
}

type Suggestion = {
  from: BalanceRow
  to: BalanceRow
  amount: number
}

// Greedy debt simplification: largest debtors pay largest creditors first.
function suggestSettlements(rows: BalanceRow[]): Suggestion[] {
  const debtors = rows
    .filter((r) => r.net < -0.005)
    .map((r) => ({ row: r, owed: -r.net }))
    .sort((a, b) => b.owed - a.owed)
  const creditors = rows
    .filter((r) => r.net > 0.005)
    .map((r) => ({ row: r, due: r.net }))
    .sort((a, b) => b.due - a.due)

  const out: Suggestion[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]
    const c = creditors[j]
    const amount = Math.min(d.owed, c.due)
    out.push({ from: d.row, to: c.row, amount })
    d.owed -= amount
    c.due -= amount
    if (d.owed <= 0.005) i++
    if (c.due <= 0.005) j++
  }
  return out
}

function memberName(row: BalanceRow) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ")
}

export function SettleUpPage() {
  const { groupId } = useParams()

  const currentGroup = useGroupsStore((s) => s.currentGroup)
  const currency = currentGroup?.default_currency ?? "INR"

  const items = useBalancesStore((s) => s.items)
  const status = useBalancesStore((s) => s.status)
  const error = useBalancesStore((s) => s.error)
  const fetch = useBalancesStore((s) => s.fetch)

  const membersStatus = useMembersStore((s) => s.status)
  const fetchMembers = useMembersStore((s) => s.fetch)

  useEffect(() => {
    if (groupId && status === "idle") fetch(groupId)
  }, [groupId, status, fetch])

  useEffect(() => {
    if (groupId && membersStatus === "idle") fetchMembers(groupId)
  }, [groupId, membersStatus, fetchMembers])

  const suggestions = suggestSettlements(items)

  const handleSettle = (s: Suggestion) => {
    if (!groupId) return
    useDialogStore.getState().open("settlement", {
      groupId,
      fromUserId: s.from.user_id,
      toUserId: s.to.user_id,
      amount: Math.round(s.amount * 100) / 100,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settle up"
        description="Suggested payments to clear everyone's debts."
        actions={
          <Link
            to={`/${groupId}/settlements`}
            className={buttonVariants({ variant: "outline" })}
          >
            Settlement history
          </Link>
        }
      />

      {error && (
        <BannerCard
          variant="destructive"
          title="Failed to load balances"
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
          title="Nothing to settle"
          description="Balances appear once the group has expenses."
        />
      )}

      {status !== "loading" && items.length > 0 && suggestions.length === 0 && (
        <BannerCard
          title="All settled up"
          description="Nobody owes anyone anything."
        />
      )}

      {suggestions.length > 0 && (
        <div className="grid gap-3">
          {suggestions.map((s, idx) => (
            <Card key={`${s.from.user_id}-${s.to.user_id}-${idx}`} className="py-3">
              <CardContent className="flex items-center justify-between gap-3 px-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {memberName(s.from)}{" "}
                    <span className="font-normal text-muted-foreground">
                      pays
                    </span>{" "}
                    {memberName(s.to)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatAmount(s.amount, currency)}
                  </p>
                </div>
                <Button size="sm" onClick={() => handleSettle(s)}>
                  <HandCoins className="size-4" />
                  Settle
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
