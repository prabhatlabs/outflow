import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type {
  CreateSettlementInput,
  GroupMemberWithUser,
  PaymentMethod,
} from "@/lib/types"
import { useAuthStore } from "@/store/auth"
import { useBalancesStore } from "@/store/balances"
import { useDialogStore } from "@/store/dialog"
import { useExpensesStore } from "@/store/expenses"
import { useMembersStore } from "@/store/members"
import { useSettlementsStore } from "@/store/settlements"
import type { DialogPayloadMap } from "./types"

const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "upi",
  "bank_transfer",
  "card",
  "other",
]

const NO_MEMBER_VALUE = "__none__"

function today() {
  return new Date().toISOString().slice(0, 10)
}

function memberName(m: GroupMemberWithUser) {
  return [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email
}

export function SettlementDialog({
  id,
  payload,
}: {
  id: string
  payload?: DialogPayloadMap["settlement"]
}) {
  const groupId = payload?.groupId ?? ""
  const close = useDialogStore((s) => s.close)
  const user = useAuthStore((s) => s.user)

  const create = useSettlementsStore((s) => s.create)

  const members = useMembersStore((s) => s.items)
  const membersStatus = useMembersStore((s) => s.status)
  const fetchMembers = useMembersStore((s) => s.fetch)

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "active"),
    [members],
  )

  useEffect(() => {
    if (groupId && membersStatus === "idle") void fetchMembers(groupId)
  }, [groupId, membersStatus, fetchMembers])

  const [fromUser, setFromUser] = useState(payload?.fromUserId ?? "")
  const [toUser, setToUser] = useState(payload?.toUserId ?? "")
  const [amount, setAmount] = useState(
    payload?.amount !== undefined ? String(payload.amount) : "",
  )
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [date, setDate] = useState(today())
  const [note, setNote] = useState("")
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Default sender: the current user when possible, otherwise the first member
  useEffect(() => {
    if (fromUser !== "" || activeMembers.length === 0) return
    if (user && activeMembers.some((m) => m.user_id === user.id)) {
      setFromUser(user.id)
    } else {
      setFromUser(activeMembers[0].user_id)
    }
  }, [fromUser, user, activeMembers])

  const handleSubmit = async () => {
    if (!groupId) {
      setFormError("Missing group")
      return
    }
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be a positive number")
      return
    }
    if (!fromUser || !toUser) {
      setFormError("Select both members")
      return
    }
    if (fromUser === toUser) {
      setFormError("Sender and receiver must be different")
      return
    }

    const body: CreateSettlementInput = {
      from_user_id: fromUser,
      to_user_id: toUser,
      amount: parsedAmount,
      payment_method: method,
    }
    if (note.trim()) body.note = note.trim()
    if (date) body.settlement_date = date

    setPending(true)
    setFormError(null)
    try {
      await create(groupId, body)
      useBalancesStore.getState().clear()
      useExpensesStore.getState().clear()
      close(id)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save settlement",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>New settlement</DialogTitle>
        <DialogDescription>
          Record a payment between two members.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="settlement-from">From</Label>
            <Select
              value={fromUser === "" ? NO_MEMBER_VALUE : fromUser}
              onValueChange={(v) =>
                setFromUser(v === NO_MEMBER_VALUE ? "" : (v ?? ""))
              }
            >
              <SelectTrigger id="settlement-from" className="w-full">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MEMBER_VALUE}>
                  Select member
                </SelectItem>
                {activeMembers.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {memberName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="settlement-to">To</Label>
            <Select
              value={toUser === "" ? NO_MEMBER_VALUE : toUser}
              onValueChange={(v) =>
                setToUser(v === NO_MEMBER_VALUE ? "" : (v ?? ""))
              }
            >
              <SelectTrigger id="settlement-to" className="w-full">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MEMBER_VALUE}>Select member</SelectItem>
                {activeMembers.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {memberName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="settlement-amount">Amount</Label>
            <Input
              id="settlement-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="settlement-date">Date</Label>
            <DatePicker id="settlement-date" value={date} onChange={setDate} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="settlement-method">Payment method</Label>
          <Select
            value={method}
            onValueChange={(v) => setMethod(v as PaymentMethod)}
          >
            <SelectTrigger id="settlement-method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="settlement-note">Note</Label>
          <Textarea
            id="settlement-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
          />
        </div>
      </div>

      <DialogFooter>
        <div className="flex flex-1 flex-col gap-2">
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => close(id)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? "Saving..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </>
  )
}
