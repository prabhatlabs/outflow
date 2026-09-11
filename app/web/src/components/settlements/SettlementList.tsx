import type { GroupMemberWithUser } from "@/lib/types"
import { SettlementListItem, type Settlement } from "./SettlementListItem"

type Props = {
  settlements: Settlement[]
  members: GroupMemberWithUser[]
  currency: string
  onDelete: (settlement: Settlement) => void
}

export function SettlementList({
  settlements,
  members,
  currency,
  onDelete,
}: Props) {
  return (
    <div className="grid gap-3">
      {settlements.map((settlement) => (
        <SettlementListItem
          key={settlement.id}
          settlement={settlement}
          members={members}
          currency={currency}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
