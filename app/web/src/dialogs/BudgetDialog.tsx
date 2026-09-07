import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
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
import type { BudgetPeriod } from "@/lib/types"
import { useDialogStore } from "@/store/dialog"
import { usePersonalBudgetsStore } from "@/store/budgets"
import type { DialogPayloadMap } from "./types"

const PERIODS: BudgetPeriod[] = ["weekly", "monthly", "yearly", "custom"]

export function BudgetDialog({
  id,
  payload,
}: {
  id: string
  payload?: DialogPayloadMap["budget"]
}) {
  const close = useDialogStore((s) => s.close)
  const create = usePersonalBudgetsStore((s) => s.create)
  const edit = usePersonalBudgetsStore((s) => s.edit)
  const items = usePersonalBudgetsStore((s) => s.items)

  const existing = useMemo(
    () => (payload?.budgetId ? items.find((b) => b.id === payload.budgetId) ?? null : null),
    [items, payload?.budgetId],
  )
  const isEdit = existing !== null

  const [amount, setAmount] = useState(existing ? String(existing.amount_limit) : "")
  const [period, setPeriod] = useState<BudgetPeriod>(existing?.period ?? "monthly")
  const [startDate, setStartDate] = useState(existing?.start_date?.slice(0, 10) ?? "")
  const [endDate, setEndDate] = useState(existing?.end_date?.slice(0, 10) ?? "")
  const [threshold, setThreshold] = useState(
    existing ? String(existing.alert_threshold) : "75",
  )
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be a positive number")
      return
    }

    const payloadBody: Record<string, unknown> = {
      amount_limit: parsedAmount,
      period,
      alert_threshold: Number(threshold) || 75,
    }
    if (startDate) payloadBody.start_date = startDate
    if (endDate) payloadBody.end_date = endDate
    if (period === "custom" && !endDate) {
      setFormError("Custom period requires an end date")
      return
    }

    setPending(true)
    setFormError(null)
    try {
      if (isEdit && existing) {
        await edit(existing.id, payloadBody as never)
      } else {
        await create(payloadBody as never)
      }
      close(id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save budget")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit budget" : "New personal budget"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update the budget." : "Set a spending limit for a period."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="budget-amount">Amount</Label>
          <Input
            id="budget-amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Period</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as BudgetPeriod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="budget-threshold">Alert at %</Label>
            <Input
              id="budget-threshold"
              type="number"
              min={1}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="budget-start">Start date</Label>
            <Input
              id="budget-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="budget-end">End date</Label>
            <Input
              id="budget-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
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
              {pending ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </>
  )
}
