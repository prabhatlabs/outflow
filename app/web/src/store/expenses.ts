import { create } from "zustand"
import { api } from "@/lib/api"
import type {
  CreateExpenseInput,
  EditExpenseInput,
  ExpenseFilters,
  ExpenseWithSplits,
} from "@/lib/types"

export type ExpensesStatus = "idle" | "loading" | "success" | "error"

const PAGE_LIMIT = 20

function buildQS(
  filters: ExpenseFilters | undefined,
  limit: number,
  offset: number,
) {
  const p = new URLSearchParams()
  p.set("limit", String(limit))
  p.set("offset", String(offset))
  if (filters?.category_id) p.set("category_id", filters.category_id)
  if (filters?.paid_by) p.set("paid_by", filters.paid_by)
  if (filters?.from) p.set("from", filters.from)
  if (filters?.to) p.set("to", filters.to)
  if (filters?.include_archived) p.set("include_archived", "true")
  return p.toString()
}

type ExpensesState = {
  items: ExpenseWithSplits[]
  status: ExpensesStatus
  error: string | null
  limit: number
  offset: number
  hasMore: boolean
  fetch: (
    groupId: string,
    opts?: { filters?: ExpenseFilters; reset?: boolean },
  ) => Promise<void>
  fetchMore: (groupId: string, filters?: ExpenseFilters) => Promise<void>
  fetchOne: (groupId: string, id: string) => Promise<ExpenseWithSplits>
  create: (
    groupId: string,
    input: CreateExpenseInput,
  ) => Promise<ExpenseWithSplits>
  edit: (
    groupId: string,
    id: string,
    patch: EditExpenseInput,
  ) => Promise<ExpenseWithSplits>
  archive: (groupId: string, id: string) => Promise<ExpenseWithSplits>
  unarchive: (groupId: string, id: string) => Promise<ExpenseWithSplits>
  remove: (groupId: string, id: string) => Promise<void>
  clear: () => void
}

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  items: [],
  status: "idle",
  error: null,
  limit: PAGE_LIMIT,
  offset: 0,
  hasMore: true,

  fetch: async (groupId, opts) => {
    const reset = opts?.reset ?? true
    const { limit } = get()
    const offset = reset ? 0 : get().offset
    const qs = buildQS(opts?.filters, limit, offset)

    set({ status: "loading", error: null })

    try {
      const items =
        (await api.get<ExpenseWithSplits[]>(
          `/groups/${groupId}/expenses?${qs}`,
        )) ?? []

      if (reset) {
        set({
          items,
          offset: items.length,
          hasMore: items.length === limit,
          status: "success",
        })
      } else {
        const prev = get().items
        const merged = [...prev, ...items]
        set({
          items: merged,
          offset: merged.length,
          hasMore: items.length === limit,
          status: "success",
        })
      }
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to fetch expenses",
      })
    }
  },

  fetchMore: async (groupId, filters) => {
    const { hasMore, status } = get()
    if (!hasMore || status === "loading") return
    await get().fetch(groupId, { filters, reset: false })
  },

  fetchOne: async (groupId, id) => {
    const expense = await api.get<ExpenseWithSplits>(
      `/groups/${groupId}/expenses/${id}`,
    )
    const { items } = get()
    const idx = items.findIndex((e) => e.id === id)
    if (idx >= 0) set({ items: items.map((e) => (e.id === id ? expense : e)) })
    else set({ items: [expense, ...items], offset: items.length + 1 })
    return expense
  },

  create: async (groupId, input) => {
    const expense = await api.post<ExpenseWithSplits>(
      `/groups/${groupId}/expenses`,
      input,
    )
    const { items } = get()
    set({ items: [expense, ...items], offset: items.length + 1 })
    return expense
  },

  edit: async (groupId, id, patch) => {
    const expense = await api.patch<ExpenseWithSplits>(
      `/groups/${groupId}/expenses/${id}`,
      patch,
    )
    set({ items: get().items.map((e) => (e.id === id ? expense : e)) })
    return expense
  },

  archive: async (groupId, id) => {
    const expense = await api.post<ExpenseWithSplits>(
      `/groups/${groupId}/expenses/${id}/archive`,
    )
    set({ items: get().items.map((e) => (e.id === id ? expense : e)) })
    return expense
  },

  unarchive: async (groupId, id) => {
    const expense = await api.post<ExpenseWithSplits>(
      `/groups/${groupId}/expenses/${id}/unarchive`,
    )
    set({ items: get().items.map((e) => (e.id === id ? expense : e)) })
    return expense
  },

  remove: async (groupId, id) => {
    await api.del(`/groups/${groupId}/expenses/${id}`)
    const { items } = get()
    set({ items: items.filter((e) => e.id !== id), offset: Math.max(0, items.length - 1) })
  },

  clear: () =>
    set({
      items: [],
      status: "idle",
      error: null,
      offset: 0,
      hasMore: true,
    }),
}))
