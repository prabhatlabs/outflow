import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate, formatAmount, memberNameById } from "@/lib/format"
import type { GroupMemberWithUser, Settlement } from "@/lib/types"
import { ArrowRight, Undo2 } from "lucide-react"

export type { Settlement }

type Props = {
  settlement: Settlement
  members: GroupMemberWithUser[]
  currency: string
  onReverse: (settlement: Settlement) => void
}

export function SettlementListItem({ settlement, members, currency, onReverse }: Props) {
  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate font-medium">
            {memberNameById(members, settlement.from_user_id)}
            <ArrowRight className="size-3 shrink-0" />
            {memberNameById(members, settlement.to_user_id)}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            {formatAmount(settlement.amount, currency)} ·{" "}
            {formatDate(settlement.settlement_date)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{settlement.payment_method}</Badge>
            {settlement.note && <Badge variant="outline">{settlement.note}</Badge>}
          </div>
        </div>
        <Button size="xs" variant="outline" onClick={() => onReverse(settlement)}>
          <Undo2 />
          Reverse
        </Button>
      </CardContent>
    </Card>
  )
}
