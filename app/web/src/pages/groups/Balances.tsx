import { BannerCard } from "@/components/BannerCard"
import PageHeader from "@/components/PageHeader"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useBalancesStore } from "@/store/balances"
import { useGroupsStore } from "@/store/groups"
import { cn } from "cn"
import { HandCoins } from "lucide-react"
import { useEffect } from "react"
import { Link, useParams } from "react-router"

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount)
}

export function BalancesPage() {
  const { groupId } = useParams()

  const currentGroup = useGroupsStore((s) => s.currentGroup)
  const items = useBalancesStore((s) => s.items)
  const status = useBalancesStore((s) => s.status)
  const error = useBalancesStore((s) => s.error)
  const fetch = useBalancesStore((s) => s.fetch)

  useEffect(() => {
    if (groupId && status === "idle") fetch(groupId)
  }, [groupId, status, fetch])

  const currency = currentGroup?.default_currency ?? "INR"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Balances"
        description="Who paid, who owes, and where the group stands."
        actions={
          <Link
            to={`/${groupId}/settlements/new`}
            className={buttonVariants()}
          >
            <HandCoins className="size-4" />
            Settle up
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
          title="No balances yet"
          description="Balances appear once the group has expenses or settlements."
        />
      )}

      {items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Owed</TableHead>
              <TableHead>Settled</TableHead>
              <TableHead>Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.user_id}>
                <TableCell className="truncate font-medium min-w-0 max-w-55">
                  {[row.first_name, row.last_name].filter(Boolean).join(" ")}
                </TableCell>
                <TableCell>{formatAmount(row.paid, currency)}</TableCell>
                <TableCell>{formatAmount(row.owed, currency)}</TableCell>
                <TableCell>{formatAmount(row.settled, currency)}</TableCell>
                <TableCell
                  className={cn(
                    "font-medium",
                    row.net > 0 && "text-emerald-600",
                    row.net < 0 && "text-destructive",
                  )}
                >
                  {formatAmount(row.net, currency)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
