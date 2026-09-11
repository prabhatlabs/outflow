import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { GroupMemberWithUser, Settlement } from "@/lib/types"
import { ArrowRight, Trash2 } from "lucide-react"

export type { Settlement }

type Props = {
  settlement: Settlement
  members: GroupMemberWithUser[]
  currency: string
  onDelete: (settlement: Settlement) => void
}

function memberName(members: GroupMemberWithUser[], userId: string) {
  const member = members.find((m) => m.user_id === userId)
  if (member) return [member.first_name, member.last_name].filter(Boolean).join(" ")
  return userId.slice(0, 8)
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount)
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

export function SettlementListItem({
  settlement,
  members,
  currency,
  onDelete,
}: Props) {
  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate font-medium">
            {memberName(members, settlement.from_user_id)}
            <ArrowRight className="size-3 shrink-0" />
            {memberName(members, settlement.to_user_id)}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {formatAmount(settlement.amount, currency)} ·{" "}
            {formatDate(settlement.settlement_date)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{settlement.payment_method}</Badge>
            {settlement.note && (
              <Badge variant="outline">{settlement.note}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="destructive"
            onClick={() => onDelete(settlement)}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
