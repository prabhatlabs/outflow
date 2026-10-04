import { BannerCard } from "@/components/BannerCard"
import PageHeader from "@/components/PageHeader"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatAmount, formatDate, formatDayMonth, memberName } from "@/lib/format"
import type { OverviewPeriod } from "@/lib/types"
import { useGroupsStore } from "@/store/groups"
import { useEffect, useMemo } from "react"
import { Link, useParams } from "react-router"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

const PERIOD_OPTIONS: { value: OverviewPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
]

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

const chartConfig = {
  total: { label: "Spent", color: "var(--primary)" },
} as const

export function OverviewPage() {
  const { groupId } = useParams()
  const currentGroup = useGroupsStore((s) => s.currentGroup)
  const overview = useGroupsStore((s) => s.overview)
  const overviewStatus = useGroupsStore((s) => s.overviewStatus)
  const overviewError = useGroupsStore((s) => s.overviewError)
  const period = useGroupsStore((s) => s.overviewPeriod)
  const fetchOverview = useGroupsStore((s) => s.fetchOverview)

  useEffect(() => {
    if (!groupId) return
    fetchOverview(groupId, period)
  }, [groupId, fetchOverview])

  const currency = overview?.currency ?? currentGroup?.default_currency ?? "INR"
  const stats = overview?.stats
  const isLoading = overviewStatus === "loading" || overviewStatus === "idle"
  const hasData = overview != null && overviewStatus === "success"

  const netTotal = hasData ? overview.balances.reduce((sum, r) => sum + (Number(r.net) || 0), 0) : 0

  const chartData = useMemo(
    () =>
      (overview?.daily ?? []).map((d) => ({
        date: d.date,
        label: formatDayMonth(d.date),
        total: d.total,
        count: d.count,
      })),
    [overview?.daily],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={currentGroup?.name ?? "Overview"}
          description={currentGroup?.description ?? "Group summary at a glance."}
        />
        <div className="flex items-center gap-1.5 rounded-full border bg-card p-1 shadow-sm">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={period === opt.value ? "default" : "ghost"}
              className="rounded-full h-7 px-3 text-xs"
              aria-pressed={period === opt.value}
              disabled={isLoading}
              onClick={() => fetchOverview(groupId!, opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {overviewError && (
        <BannerCard variant="destructive" title="Failed to load overview" description={overviewError} />
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total spent</CardTitle>
            {hasData && (
              <CardDescription>
                {formatDate(overview.from_date)} → {formatDate(overview.to_date)} · {overview.timezone}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <p className="text-2xl font-semibold tracking-tight">{formatAmount(stats?.total_amount ?? 0, currency)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.expense_count ?? 0} expense{(stats?.expense_count ?? 0) === 1 ? "" : "s"} · avg {formatAmount(stats?.avg_amount ?? 0, currency)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Avg / day</CardTitle>
            <CardDescription>{period === "today" ? "Today" : period === "7d" ? "Last 7 days" : "Last 30 days"}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                <p className="text-2xl font-semibold tracking-tight">{formatAmount(stats?.avg_per_day ?? 0, currency)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.expense_count ?? 0} in {period === "today" ? "1 day" : period === "7d" ? "7 days" : "30 days"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Members</CardTitle>
            <CardDescription>Active in group</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <>
                <p className="text-2xl font-semibold tracking-tight">{stats?.member_count ?? 0}</p>
                <Link to={`/${groupId}/members`} className={buttonVariants({ variant: "link", className: "pl-0 pr-0 h-auto py-0 text-xs" })}>
                  View members
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Net balance · overall</CardTitle>
            <CardDescription>Across all time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <p className="text-2xl font-semibold tracking-tight">{formatAmount(netTotal, currency)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {stats?.settlement_count ?? 0} settlement{(stats?.settlement_count ?? 0) === 1 ? "" : "s"}
                    {hasData && stats!.settlement_amount > 0 ? ` · ${formatAmount(stats!.settlement_amount, currency)}` : ""}
                  </span>
                  <Link to={`/${groupId}/balances`} className={buttonVariants({ variant: "link", className: "pl-0 pr-0 h-auto py-0 text-xs" })}>
                    View balances
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily trend */}
      <Card>
        <CardHeader>
          <CardTitle>Spending trend</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading…"
              : hasData
                ? `${overview.period === "today" ? "Today" : overview.period === "7d" ? "Last 7 days" : "Last 30 days"} · ${formatDate(overview.from_date)} → ${formatDate(overview.to_date)}`
                : "Daily totals"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : chartData.length === 0 ? (
            <BannerCard title="No data for this period" description="Expenses will appear here once added." />
          ) : (
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={period === "30d" ? 3 : 0} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}`} width={36} />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={
                    <ChartTooltipContent
                      labelKey="label"
                      formatter={(value) => formatAmount(Number(value), currency)}
                    />
                  }
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
          {hasData && overview.daily.some((d) => d.count > 0) === false && (
            <p className="text-xs text-muted-foreground mt-3">No expenses in this period — chart shows zeros for each day.</p>
          )}
        </CardContent>
      </Card>

      {/* Distributions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
            <CardDescription>Amount distribution in this period</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : !hasData || overview.by_category.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categorized spending in this period.</p>
            ) : (
              overview.by_category.map((row) => (
                <div key={row.category_id ?? "uncategorized"} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                      <span className="truncate text-sm font-medium">{row.category_name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">· {row.count} expense{row.count === 1 ? "" : "s"}</span>
                    </div>
                    <span className="text-sm font-medium shrink-0">{formatAmount(row.total, currency)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, row.percentage)}%`, background: row.color }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{pct(row.percentage)} of period</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>By member · paid</CardTitle>
              <CardDescription>Who paid what in this period</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !hasData || overview.by_member_paid.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments in this period.</p>
              ) : (
                overview.by_member_paid.map((m) => (
                  <div key={m.user_id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">
                        {memberName({ first_name: m.first_name, last_name: m.last_name })}
                      </span>
                      <span className="text-sm font-medium shrink-0">{formatAmount(m.total, currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, m.percentage)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.count} expense{m.count === 1 ? "" : "s"} · {pct(m.percentage)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By member · owed</CardTitle>
              <CardDescription>Share of the period (from splits)</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !hasData || overview.by_member_owed.length === 0 ? (
                <p className="text-sm text-muted-foreground">No splits in this period.</p>
              ) : (
                overview.by_member_owed.map((m) => (
                  <div key={m.user_id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">
                        {memberName({ first_name: m.first_name, last_name: m.last_name })}
                      </span>
                      <span className="text-sm font-medium shrink-0">{formatAmount(m.total_owed, currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-foreground/70 rounded-full" style={{ width: `${Math.min(100, m.percentage)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{pct(m.percentage)} of period owed</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent expenses · {period === "today" ? "today" : period === "7d" ? "last 7 days" : "last 30 days"}</CardTitle>
            <CardDescription>Up to 10 most recent in this period</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {isLoading && <Skeleton className="h-16 w-full" />}
            {!isLoading && hasData && overview.recent_expenses.length === 0 && (
              <BannerCard
                title="No expenses in this period"
                description="Add an expense to start tracking shared spending."
                action={
                  <Link to={`/${groupId}/expenses`} className={buttonVariants({ size: "sm" })}>
                    Go to expenses
                  </Link>
                }
              />
            )}
            {hasData &&
              overview.recent_expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{expense.description || "Expense"}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatDate(expense.expense_date)}</p>
                  </div>
                  <p className="shrink-0 font-medium">{formatAmount(expense.amount, currency)}</p>
                </div>
              ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 content-start">
          {hasData && overview.balances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Balances · overall</CardTitle>
                <CardDescription>Net per member (paid − owed − settled)</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {overview.balances.slice(0, 6).map((b) => {
                  const name = memberName({ first_name: b.first_name, last_name: b.last_name })
                  const netNum = b.net ?? 0
                  return (
                    <div key={String(b.user_id)} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{name}</span>
                      <span className={netNum >= 0 ? "text-emerald-600 dark:text-emerald-400 font-medium shrink-0" : "text-destructive font-medium shrink-0"}>
                        {formatAmount(netNum, currency)}
                      </span>
                    </div>
                  )
                })}
                {overview.balances.length > 6 && (
                  <Link to={`/${groupId}/balances`} className={buttonVariants({ variant: "link", className: "pl-0 pr-0" })}>
                    View all balances
                  </Link>
                )}
                <p className="text-xs text-muted-foreground">Paid / owed / settled are overall, not just this period.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
