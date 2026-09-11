import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type {
  CreateExpenseInput,
  ExpenseSplitInput,
  GroupMemberWithUser,
  SplitType,
} from "@/lib/types"
import { useAuthStore } from "@/store/auth"
import { useBalancesStore } from "@/store/balances"
import { useCategoriesStore } from "@/store/categories"
import { useDialogStore } from "@/store/dialog"
import { useExpensesStore } from "@/store/expenses"
import { useMembersStore } from "@/store/members"
import type { DialogPayloadMap } from "./types"

const SPLIT_TYPES: SplitType[] = ["equal", "percentage", "exact", "shares"]

const SELECT_CLASS =
  "h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring"

function today() {
  return new Date().toISOString().slice(0, 10)
}

function memberName(m: GroupMemberWithUser) {
  return [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email
}

export function ExpenseDialog({
  id,
  payload,
}: {
  id: string
  payload?: DialogPayloadMap["expense"]
}) {
  const groupId = payload?.groupId ?? ""
  const close = useDialogStore((s) => s.close)
  const user = useAuthStore((s) => s.user)

  const create = useExpensesStore((s) => s.create)
  const edit = useExpensesStore((s) => s.edit)
  const expenses = useExpensesStore((s) => s.items)

  const members = useMembersStore((s) => s.items)
  const membersStatus = useMembersStore((s) => s.status)
  const fetchMembers = useMembersStore((s) => s.fetch)

  const categories = useCategoriesStore((s) => s.items)
  const categoriesStatus = useCategoriesStore((s) => s.status)
  const fetchCategories = useCategoriesStore((s) => s.fetch)

  const existing = useMemo(
    () =>
      payload?.expenseId
        ? (expenses.find((e) => e.id === payload.expenseId) ?? null)
        : null,
    [expenses, payload?.expenseId],
  )
  const isEdit = existing !== null

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "active"),
    [members],
  )

  useEffect(() => {
    if (!groupId) return
    if (membersStatus === "idle") void fetchMembers(groupId)
    if (categoriesStatus === "idle") void fetchCategories(groupId)
  }, [groupId, membersStatus, categoriesStatus, fetchMembers, fetchCategories])

  const [amount, setAmount] = useState(existing ? String(existing.amount) : "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [note, setNote] = useState(existing?.note ?? "")
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? "")
  const [expenseDate, setExpenseDate] = useState(
    existing?.expense_date?.slice(0, 10) ?? today(),
  )
  const [paidBy, setPaidBy] = useState(existing?.paid_by ?? "")
  const [splitType, setSplitType] = useState<SplitType>(
    existing?.split_type ?? "equal",
  )
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!existing) return {}
    const next: Record<string, string> = {}
    for (const s of existing.splits) {
      if (existing.split_type === "exact") next[s.user_id] = String(s.amount_owed)
      else if (existing.split_type === "percentage")
        next[s.user_id] = s.percentage == null ? "" : String(s.percentage)
      else if (existing.split_type === "shares")
        next[s.user_id] = s.shares == null ? "" : String(s.shares)
    }
    return next
  })
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (!existing || existing.split_type !== "equal") return {}
    const next: Record<string, boolean> = {}
    for (const s of existing.splits) next[s.user_id] = true
    return next
  })
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Default payer: the current user when they are a group member
  useEffect(() => {
    if (paidBy !== "") return
    if (user && activeMembers.some((m) => m.user_id === user.id)) {
      setPaidBy(user.id)
    }
  }, [paidBy, user, activeMembers])

  // Default equal-split selection: everyone included
  useEffect(() => {
    if (isEdit || splitType !== "equal") return
    setChecked((prev) => {
      if (Object.keys(prev).length > 0) return prev
      const next: Record<string, boolean> = {}
      for (const m of activeMembers) next[m.user_id] = true
      return next
    })
  }, [isEdit, splitType, activeMembers])

  const parsedAmount = Number(amount)
  const includedCount = activeMembers.filter((m) => checked[m.user_id]).length
  const valuesSum = activeMembers.reduce((sum, m) => {
    const v = Number(values[m.user_id] ?? "")
    return sum + (Number.isFinite(v) ? v : 0)
  }, 0)

  const helperText = useMemo(() => {
    if (splitType === "equal") {
      return `${includedCount} member${includedCount === 1 ? "" : "s"} included`
    }
    if (splitType === "exact") {
      const target = Number.isFinite(parsedAmount) ? parsedAmount : 0
      return `Sum: ${valuesSum.toFixed(2)} of ${target.toFixed(2)}`
    }
    if (splitType === "percentage") {
      return `Total: ${valuesSum}% (must equal 100%)`
    }
    return `Total shares: ${valuesSum}`
  }, [splitType, includedCount, valuesSum, parsedAmount])

  const buildSplits = (): ExpenseSplitInput[] => {
    if (splitType === "equal") {
      return activeMembers
        .filter((m) => checked[m.user_id])
        .map((m) => ({ user_id: m.user_id }))
    }
    return activeMembers
      .filter((m) => (values[m.user_id] ?? "").trim() !== "")
      .map((m) => {
        const v = Number(values[m.user_id])
        if (splitType === "exact") return { user_id: m.user_id, amount_owed: v }
        if (splitType === "percentage")
          return { user_id: m.user_id, percentage: v }
        return { user_id: m.user_id, shares: v }
      })
  }

  const handleSubmit = async () => {
    if (!groupId) {
      setFormError("Missing group")
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be a positive number")
      return
    }
    const splits = buildSplits()
    if (splits.length === 0) {
      setFormError("Add at least one member to the split")
      return
    }
    if (splitType === "percentage" && Math.abs(valuesSum - 100) > 0.01) {
      setFormError("Percentages must add up to 100%")
      return
    }
    if (splitType === "exact" && Math.abs(valuesSum - parsedAmount) > 0.01) {
      setFormError("Split amounts must add up to the expense amount")
      return
    }

    const body: CreateExpenseInput = {
      amount: parsedAmount,
      split_type: splitType,
      splits,
    }
    if (paidBy) body.paid_by = paidBy
    if (categoryId) body.category_id = categoryId
    if (description.trim()) body.description = description.trim()
    if (note.trim()) body.note = note.trim()
    if (expenseDate) body.expense_date = expenseDate

    setPending(true)
    setFormError(null)
    try {
      if (isEdit && existing) {
        await edit(groupId, existing.id, body)
      } else {
        await create(groupId, body)
      }
      useBalancesStore.getState().clear()
      close(id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save expense")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit expense" : "New expense"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update the expense." : "Add an expense and split it."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="expense-amount">Amount</Label>
            <Input
              id="expense-amount"
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
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="expense-description">Description</Label>
          <Input
            id="expense-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dinner, taxi, groceries..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="expense-paid-by">Paid by</Label>
            <select
              id="expense-paid-by"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Me (default)</option>
              {activeMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {memberName(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="expense-category">Category</Label>
            <select
              id="expense-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="expense-note">Note</Label>
          <Textarea
            id="expense-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="expense-split-type">Split</Label>
          <select
            id="expense-split-type"
            value={splitType}
            onChange={(e) => setSplitType(e.target.value as SplitType)}
            className={SELECT_CLASS}
          >
            {SPLIT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          {activeMembers.map((m) => (
            <div key={m.user_id} className="flex items-center gap-2">
              {splitType === "equal" ? (
                <input
                  type="checkbox"
                  checked={checked[m.user_id] ?? false}
                  onChange={(e) =>
                    setChecked((prev) => ({
                      ...prev,
                      [m.user_id]: e.target.checked,
                    }))
                  }
                  className="size-4 shrink-0"
                />
              ) : (
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={values[m.user_id] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [m.user_id]: e.target.value,
                    }))
                  }
                  placeholder={
                    splitType === "percentage"
                      ? "%"
                      : splitType === "shares"
                        ? "shares"
                        : "0.00"
                  }
                  className="w-28"
                />
              )}
              <span className="truncate text-sm">{memberName(m)}</span>
            </div>
          ))}
          {activeMembers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {membersStatus === "loading"
                ? "Loading members..."
                : "No active members"}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{helperText}</p>
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
