import { BannerCard } from "@/components/BannerCard"
import PageHeader from "@/components/PageHeader"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useBalancesStore } from "@/store/balances"
import { useExpensesStore } from "@/store/expenses"
import { useGroupsStore } from "@/store/groups"
import { useMembersStore } from "@/store/members"
import { useEffect } from "react"
import { Link, useParams } from "react-router"

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount)
}

export function OverviewPage() {
  const { groupId } = useParams()

  // Title/description derive from the groups store's current group
  const currentGroup = useGroupsStore((s) => s.currentGroup)

  const balances = useBalancesStore((s) => s.items)
  const balancesStatus = useBalancesStore((s) => s.status)
  const balancesError = useBalancesStore((s) => s.error)
  const fetchBalances = useBalancesStore((s) => s.fetch)

  const expenses = useExpensesStore((s) => s.items)
  const expensesStatus = useExpensesStore((s) => s.status)
  const expensesError = useExpensesStore((s) => s.error)
  const fetchExpenses = useExpensesStore((s) => s.fetch)

  const members = useMembersStore((s) => s.items)
  const membersStatus = useMembersStore((s) => s.status)
  const fetchMembers = useMembersStore((s) => s.fetch)

  useEffect(() => {
    if (groupId && balancesStatus === "idle") fetchBalances(groupId)
  }, [groupId, balancesStatus, fetchBalances])

  useEffect(() => {
    if (groupId && expensesStatus === "idle") fetchExpenses(groupId)
  }, [groupId, expensesStatus, fetchExpenses])

  useEffect(() => {
    if (groupId && membersStatus === "idle") fetchMembers(groupId)
  }, [groupId, membersStatus, fetchMembers])

  const currency = currentGroup?.default_currency ?? "INR"
  const netTotal = balances.reduce((sum, row) => sum + row.net, 0)
  const recentExpenses = expenses.slice(0, 5)
  const error = balancesError ?? expensesError

  return (
    <div className="space-y-6">
      <PageHeader
        title={currentGroup?.name ?? "Overview"}
        description={currentGroup?.description ?? "Group summary at a glance."}
      />

      {error && (
        <BannerCard
          variant="destructive"
          title="Failed to load overview"
          description={error}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm md:text-base text-muted-foreground">
              Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {membersStatus === "loading" ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl md:text-4xl font-semibold">{members.length}</p>
            )}
            <Link
              to={`/${groupId}/members`}
              className={buttonVariants({ variant: "link", className: "pl-0 pr-0" })}
            >
              View members
            </Link>
          </CardContent>
        </Card>

        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm md:text-base text-muted-foreground">
              Net balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balancesStatus === "loading" ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-2xl md:text-4xl font-semibold">
                {formatAmount(netTotal, currency)}
              </p>
            )}
            <Link
              to={`/${groupId}/balances`}
              className={buttonVariants({ variant: "link", className: "pl-0 pr-0" })}
            >
              View balances
            </Link>
          </CardContent>
        </Card>

        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm md:text-base text-muted-foreground">
              Recent expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expensesStatus === "loading" ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl md:text-4xl font-semibold">{recentExpenses.length}</p>
            )}
            <Link
              to={`/${groupId}/expenses`}
              className={buttonVariants({ variant: "link", className: "pl-0 pr-0" })}
            >
              View expenses
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent expenses</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {expensesStatus === "loading" && <Skeleton className="h-16 w-full" />}
          {expensesStatus !== "loading" && recentExpenses.length === 0 && (
            <BannerCard
              title="No expenses yet"
              description="Add an expense to start tracking shared spending."
              action={
                <Link
                  to={`/${groupId}/expenses`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Go to expenses
                </Link>
              }
            />
          )}
          {recentExpenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {expense.description || "Expense"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {expense.expense_date.slice(0, 10)}
                </p>
              </div>
              <p className="shrink-0 font-medium">
                {formatAmount(expense.amount, currency)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
