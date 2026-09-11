import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { useParams } from "react-router"
import { BannerCard } from "@/components/BannerCard"
import { ExpenseList } from "@/components/expenses/ExpenseList"
import type { Expense } from "@/components/expenses/ExpenseListItem"
import { ExpenseTable } from "@/components/expenses/ExpenseTable"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import type { ExpenseFilters } from "@/lib/types"
import { useCategoriesStore } from "@/store/categories"
import { useDialogStore } from "@/store/dialog"
import { useExpensesStore } from "@/store/expenses"
import { useGroupsStore } from "@/store/groups"
import { useMembersStore } from "@/store/members"
import { useViewModeStore } from "@/store/viewMode"

function memberName(first: string, last: string | null, email: string) {
  return [first, last].filter(Boolean).join(" ") || email
}

export function ExpensesPage() {
  const { groupId } = useParams()

  const currentGroup = useGroupsStore((s) => s.currentGroup)
  const currency = currentGroup?.default_currency ?? "INR"

  const items = useExpensesStore((s) => s.items)
  const status = useExpensesStore((s) => s.status)
  const error = useExpensesStore((s) => s.error)
  const hasMore = useExpensesStore((s) => s.hasMore)
  const fetch = useExpensesStore((s) => s.fetch)
  const fetchMore = useExpensesStore((s) => s.fetchMore)
  const archive = useExpensesStore((s) => s.archive)
  const unarchive = useExpensesStore((s) => s.unarchive)
  const remove = useExpensesStore((s) => s.remove)

  const members = useMembersStore((s) => s.items)
  const membersStatus = useMembersStore((s) => s.status)
  const fetchMembers = useMembersStore((s) => s.fetch)

  const categories = useCategoriesStore((s) => s.items)
  const categoriesStatus = useCategoriesStore((s) => s.status)
  const fetchCategories = useCategoriesStore((s) => s.fetch)

  const [categoryId, setCategoryId] = useState("")
  const [paidBy, setPaidBy] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [includeArchived, setIncludeArchived] = useState(false)

  const filters: ExpenseFilters = {
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(paidBy ? { paid_by: paidBy } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(includeArchived ? { include_archived: true } : {}),
  }

  useEffect(() => {
    if (groupId && status === "idle") fetch(groupId, { filters })
    // Re-run when filters change below via applyFilters; initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, status, fetch])

  useEffect(() => {
    if (groupId && membersStatus === "idle") fetchMembers(groupId)
  }, [groupId, membersStatus, fetchMembers])

  useEffect(() => {
    if (groupId && categoriesStatus === "idle") fetchCategories(groupId)
  }, [groupId, categoriesStatus, fetchCategories])

  const mode = useViewModeStore((s) => s.mode)

  const paidByName = (expense: Expense) => {
    const m = members.find((m) => m.user_id === expense.paid_by)
    return m ? memberName(m.first_name, m.last_name, m.email) : "Unknown"
  }

  const applyFilters = () => {
    if (groupId) fetch(groupId, { filters, reset: true })
  }

  const handleNew = () => {
    if (!groupId) return
    useDialogStore.getState().open("expense", { groupId })
  }

  const handleEdit = (expense: Expense) => {
    if (!groupId) return
    useDialogStore.getState().open("expense", { groupId, expenseId: expense.id })
  }

  const handleDelete = (expense: Expense) => {
    if (!groupId) return
    useDialogStore.getState().open("confirm", {
      title: "Delete expense?",
      description: "This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete",
      onConfirm: () => remove(groupId, expense.id),
    })
  }

  const handleArchive = (expense: Expense) => {
    if (!groupId) return
    void archive(groupId, expense.id)
  }

  const handleUnarchive = (expense: Expense) => {
    if (!groupId) return
    void unarchive(groupId, expense.id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="All shared spending in this group."
        actions={
          <Button onClick={handleNew}>
            <Plus className="size-4" />
            New expense
          </Button>
        }
      />

      <div className="grid gap-3 rounded-2xl border p-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="grid gap-1.5">
          <Label>Category</Label>
          <Select
            value={categoryId === "" ? "all" : categoryId}
            onValueChange={(v) => setCategoryId(v === "all" ? "" : (v ?? ""))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Paid by</Label>
          <Select
            value={paidBy === "" ? "all" : paidBy}
            onValueChange={(v) => setPaidBy(v === "all" ? "" : (v ?? ""))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {memberName(m.first_name, m.last_name, m.email)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="expenses-from">From</Label>
          <DatePicker
            id="expenses-from"
            value={from}
            onChange={setFrom}
            placeholder="Start date"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="expenses-to">To</Label>
          <DatePicker
            id="expenses-to"
            value={to}
            onChange={setTo}
            placeholder="End date"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="expenses-archived">Show archived</Label>
          <span className="flex h-9 items-center">
            <Checkbox
              id="expenses-archived"
              checked={includeArchived}
              onCheckedChange={(v) => setIncludeArchived(v === true)}
            />
          </span>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            className="w-full"
            onClick={applyFilters}
            disabled={status === "loading"}
          >
            Apply
          </Button>
        </div>
      </div>

      {error && (
        <BannerCard
          variant="destructive"
          title="Failed to load expenses"
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
          title="No expenses yet"
          description="Add an expense to start tracking shared spending."
          action={
            <Button onClick={handleNew} size="sm">
              New expense
            </Button>
          }
        />
      )}

      {items.length > 0 &&
        (mode === "table" ? (
          <ExpenseTable
            expenses={items}
            paidByName={paidByName}
            currency={currency}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
          />
        ) : (
          <ExpenseList
            expenses={items}
            paidByName={paidByName}
            currency={currency}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
          />
        ))}

      {hasMore && items.length > 0 && groupId && (
        <Button
          variant="outline"
          onClick={() => fetchMore(groupId, filters)}
          disabled={status === "loading"}
        >
          Load more
        </Button>
      )}
    </div>
  )
}
