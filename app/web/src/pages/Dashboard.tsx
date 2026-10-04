import { BannerCard } from "@/components/BannerCard"
import PageHeader from "@/components/PageHeader"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatAmount, formatDate, formatDayMonth } from "@/lib/format"
import type { OverviewPeriod } from "@/lib/types"
import { useDashboardStore } from "@/store/dashboard"
import { useEffect, useMemo } from "react"
import { Link } from "react-router"
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
  total: { label: "Involved", color: "var(--primary)" },
} as const

export default function Dashboard() {
  const dashboard = useDashboardStore((s) => s.dashboard)
  const status = useDashboardStore((s) => s.status)
  const period = useDashboardStore((s) => s.period)
  const error = useDashboardStore((s) => s.error)
  const fetchDashboard = useDashboardStore((s) => s.fetchDashboard)

  useEffect(() => {
    fetchDashboard(period)
  }, [fetchDashboard])

  const isLoading = status === "loading" || status === "idle"
  const hasData = dashboard != null && status === "success"
  const stats = dashboard?.stats
  const currency = dashboard?.currency ?? "INR"

  const chartData = useMemo(
    () =>
      (dashboard?.daily ?? []).map((d) => ({
        date: d.date,
        label: formatDayMonth(d.date),
        total: d.total,
        count: d.count,
      })),
    [dashboard?.daily],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Dashboard"
          description={hasData ? `${formatDate(dashboard.from_date)} → ${formatDate(dashboard.to_date)} · ${dashboard.timezone}` : "At a glance across your groups and budgets."}
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
              onClick={() => fetchDashboard(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <BannerCard variant="destructive" title="Failed to load dashboard" description={error} />
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">You paid</CardTitle>
            <CardDescription>{period === "today" ? "Today" : period === "7d" ? "Last 7 days" : "Last 30 days"}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <p className="text-2xl font-semibold tracking-tight">{formatAmount(stats?.total_paid ?? 0, currency)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.expense_count ?? 0} expense{(stats?.expense_count ?? 0) === 1 ? "" : "s"} in period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">You owe</CardTitle>
            <CardDescription>Your share of splits</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <p className="text-2xl font-semibold tracking-tight">{formatAmount(stats?.total_owed ?? 0, currency)}</p>
                <p className="text-xs text-muted-foreground mt-1">Across active groups</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Net</CardTitle>
            <CardDescription>Paid − owed · period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <p className={`text-2xl font-semibold tracking-tight ${(stats?.net ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  {formatAmount(stats?.net ?? 0, currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.settlement_count ?? 0} settlement{(stats?.settlement_count ?? 0) === 1 ? "" : "s"}
                  {hasData && stats!.settlement_amount > 0 ? ` · ${formatAmount(stats!.settlement_amount, currency)}` : ""}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Active groups</CardTitle>
            <CardDescription>Avg {formatAmount(stats?.avg_per_day ?? 0, currency)}/day</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <>
                <p className="text-2xl font-semibold tracking-tight">{stats?.active_group_count ?? 0}</p>
                <div className="flex gap-2 mt-1">
                  <Link to="/groups" className={buttonVariants({ variant: "link", className: "pl-0 pr-0 h-auto py-0 text-xs" })}>
                    View groups
                  </Link>
                  <Link to="/invitations" className={buttonVariants({ variant: "link", className: "pl-0 pr-0 h-auto py-0 text-xs" })}>
                    Invitations · {dashboard?.pending_invitations.count ?? 0}
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
          <CardTitle>Daily trend · your involved expenses</CardTitle>
          <CardDescription>
            {isLoading ? "Loading…" : hasData ? `${period === "today" ? "Today" : period === "7d" ? "Last 7 days" : "Last 30 days"} · ${formatDate(dashboard.from_date)} → ${formatDate(dashboard.to_date)}` : "Daily totals"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : chartData.length === 0 ? (
            <BannerCard title="No data for this period" description="Expenses where you paid or owe will appear here." />
          ) : (
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={period === "30d" ? 3 : 0} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}`} width={36} />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)" }}
                  content={<ChartTooltipContent labelKey="label" formatter={(value) => formatAmount(Number(value), currency)} />}
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
          {hasData && dashboard.daily.some((d) => d.count > 0) === false && (
            <p className="text-xs text-muted-foreground mt-3">No involved expenses in this period — chart shows zeros for each day.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_3fr]">
        <div className="grid gap-4 content-start">
          <Card>
            <CardHeader>
              <CardTitle>By group</CardTitle>
              <CardDescription>Where your spending landed · {period === "today" ? "today" : period}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !hasData || dashboard.by_group.length === 0 ? (
                <p className="text-sm text-muted-foreground">No group spending in this period.</p>
              ) : (
                dashboard.by_group.map((row) => (
                  <div key={row.group_id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <Link to={`/${row.group_id}/overview`} className="truncate text-sm font-medium hover:underline min-w-0">
                        {row.group_name}
                      </Link>
                      <span className="text-sm font-medium shrink-0">{formatAmount(row.total, row.currency || currency)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, row.percentage)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {row.count} expense{row.count === 1 ? "" : "s"} · {pct(row.percentage)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {hasData && dashboard.balances_summary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Balances · overall</CardTitle>
                <CardDescription>Net per active group (paid − owed − settled)</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                {dashboard.balances_summary.slice(0, 8).map((b) => (
                  <div key={b.group_id} className="flex items-center justify-between gap-3 text-sm">
                    <Link to={`/${b.group_id}/balances`} className="truncate font-medium hover:underline">
                      {b.group_name}
                    </Link>
                    <span className={b.net >= 0 ? "text-emerald-600 dark:text-emerald-400 font-medium shrink-0" : "text-destructive font-medium shrink-0"}>
                      {formatAmount(b.net, currency)}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Paid / owed / settled are overall, not just this period.</p>
              </CardContent>
            </Card>
          )}

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Pending invitations</CardTitle>
              <CardDescription>{dashboard?.pending_invitations.count ?? 0} pending</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : !hasData || dashboard.pending_invitations.preview.length === 0 ? (
                <p className="text-xs text-muted-foreground">No pending invites.</p>
              ) : (
                dashboard.pending_invitations.preview.map((inv) => (
                  <div key={inv.id} className="text-xs truncate">
                    <span className="font-medium">{inv.email}</span>
                    <span className="text-muted-foreground"> · {formatDate(inv.created_at)}</span>
                  </div>
                ))
              )}
              <Link to="/invitations" className={buttonVariants({ variant: "link", className: "pl-0 pr-0 h-auto py-0 text-xs" })}>
                View invitations
              </Link>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Personal budgets</CardTitle>
              <CardDescription>{dashboard?.personal_budgets.count ?? 0} total</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : !hasData || dashboard.personal_budgets.preview.length === 0 ? (
                <p className="text-xs text-muted-foreground">No budgets yet.</p>
              ) : (
                dashboard.personal_budgets.preview.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium capitalize">{b.period}</span>
                    <span className="shrink-0">{formatAmount(b.amount_limit, currency)}</span>
                  </div>
                ))
              )}
              <Link to="/personal-budgets" className={buttonVariants({ variant: "link", className: "pl-0 pr-0 h-auto py-0 text-xs" })}>
                View budgets
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 content-start">
          <Card>
            <CardHeader>
              <CardTitle>By category</CardTitle>
              <CardDescription>Across all active groups</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 h-110 overflow-y-auto">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : !hasData || dashboard.by_category.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categorized spending in this period.</p>
              ) : (
                <>
                  {dashboard.by_category.map((row) => (
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
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, row.percentage)}%`, background: row.color }} />
                      </div>
                      <p className="text-xs text-muted-foreground">{pct(row.percentage)} of period</p>
                    </div>
                  ))}
                  {dashboard.by_currency.length > 1 && (
                    <div className="border-t pt-3 mt-1 grid gap-2">
                      <p className="text-xs font-medium text-muted-foreground">By currency · mixed in period</p>
                      {dashboard.by_currency.map((row) => (
                        <div key={row.currency} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{row.currency}</span>
                          <span className="text-muted-foreground text-xs">
                            {row.count} · {pct(row.percentage)} · {formatAmount(row.total, row.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent · your involved expenses</CardTitle>
              <CardDescription>Up to 10 in this period · {period === "today" ? "today" : period}</CardDescription>
              {hasData && (
                <CardAction>
                  <Badge variant="secondary">{stats?.expense_count ?? 0} total</Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="grid gap-3">
              {isLoading && <Skeleton className="h-16 w-full" />}
              {!isLoading && hasData && dashboard.recent_expenses.length === 0 && (
                <p className="text-sm text-muted-foreground">No involved expenses in this period.</p>
              )}
              {hasData &&
                dashboard.recent_expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.description || "Expense"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.group_name} · {formatDate(e.expense_date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium">{formatAmount(e.amount, currency)}</p>
                      <Badge variant="outline" className="text-[10px] h-5 mt-0.5">
                        {e.group_name}
                      </Badge>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
