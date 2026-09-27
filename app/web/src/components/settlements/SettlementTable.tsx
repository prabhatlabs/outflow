import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatAmount, memberNameById } from "@/lib/format"
import type { GroupMemberWithUser } from "@/lib/types"
import { Trash2 } from "lucide-react"
import type { Settlement } from "./SettlementListItem"

type Props = {
  settlements: Settlement[]
  members: GroupMemberWithUser[]
  currency: string
  onDelete: (settlement: Settlement) => void
}

export function SettlementTable({
  settlements,
  members,
  currency,
  onDelete,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {settlements.map((settlement) => (
          <TableRow key={settlement.id}>
            <TableCell className="truncate font-medium min-w-0 max-w-40">
              {memberNameById(members, settlement.from_user_id)}
            </TableCell>
            <TableCell className="truncate min-w-0 max-w-40">
              {memberNameById(members, settlement.to_user_id)}
            </TableCell>
            <TableCell>
              {formatAmount(settlement.amount, currency)}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{settlement.payment_method}</Badge>
            </TableCell>
            <TableCell>{formatDate(settlement.settlement_date)}</TableCell>
            <TableCell>
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
