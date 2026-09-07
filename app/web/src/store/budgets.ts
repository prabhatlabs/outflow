import { create } from "zustand"
import { api } from "@/lib/api"
import type {
  CreateBudgetInput,
  EditBudgetInput,
  GroupBudget,
  PersonalBudget,
} from "@/lib/types"

export type BudgetsStatus = "idle" | "loading" | "success" | "error"

const PAGE_LIMIT = 20

// ---- group budgets ----

type GroupBudgetsState = {
  items: GroupBudget[]
  status: BudgetsStatus
  error: string | null
  limit: number
  offset: number
  hasMore: boolean
  fetch: (groupId: string, opts?: { reset?: boolean }) => Promise<void>
  fetchMore: (groupId: string) => Promise<void>
  create: (groupId: string, input: CreateBudgetInput) => Promise<GroupBudget>
  edit: (
    groupId: string,
    id: string,
    patch: EditBudgetInput,
  ) => Promise<GroupBudget>
  remove: (groupId: string, id: string) => Promise<void>
  clear: () => void
}

export const useGroupBudgetsStore = create<GroupBudgetsState>((set, get) => ({
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

    set({ status: "loading", error: null })

    try {
      const items =
        (await api.get<GroupBudget[]>(
          `/groups/${groupId}/budgets?limit=${limit}&offset=${offset}`,
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
        error: err instanceof Error ? err.message : "Failed to fetch budgets",
      })
    }
  },

  fetchMore: async (groupId) => {
    const { hasMore, status } = get()
    if (!hasMore || status === "loading") return
    await get().fetch(groupId, { reset: false })
  },

  create: async (groupId, input) => {
    const budget = await api.post<GroupBudget>(
      `/groups/${groupId}/budgets`,
      input,
    )
    const { items } = get()
    set({ items: [budget, ...items], offset: items.length + 1 })
    return budget
  },

  edit: async (groupId, id, patch) => {
    const budget = await api.patch<GroupBudget>(
      `/groups/${groupId}/budgets/${id}`,
      patch,
    )
    set({ items: get().items.map((b) => (b.id === id ? budget : b)) })
    return budget
  },

  remove: async (groupId, id) => {
    await api.del(`/groups/${groupId}/budgets/${id}`)
    const { items } = get()
    set({ items: items.filter((b) => b.id !== id), offset: Math.max(0, items.length - 1) })
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

// ---- personal budgets ----

type PersonalBudgetsState = {
  items: PersonalBudget[]
  status: BudgetsStatus
  error: string | null
  limit: number
  offset: number
  hasMore: boolean
  fetch: (opts?: { reset?: boolean }) => Promise<void>
  fetchMore: () => Promise<void>
  create: (input: CreateBudgetInput) => Promise<PersonalBudget>
  edit: (id: string, patch: EditBudgetInput) => Promise<PersonalBudget>
  remove: (id: string) => Promise<void>
  clear: () => void
}

export const usePersonalBudgetsStore = create<PersonalBudgetsState>(
  (set, get) => ({
    items: [],
    status: "idle",
    error: null,
    limit: PAGE_LIMIT,
    offset: 0,
    hasMore: true,

    fetch: async (opts) => {
      const reset = opts?.reset ?? true
      const { limit } = get()
      const offset = reset ? 0 : get().offset

      set({ status: "loading", error: null })

      try {
        const items =
          (await api.get<PersonalBudget[]>(
            `/personal-budgets?limit=${limit}&offset=${offset}`,
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
          error:
            err instanceof Error ? err.message : "Failed to fetch budgets",
        })
      }
    },

    fetchMore: async () => {
      const { hasMore, status } = get()
      if (!hasMore || status === "loading") return
      await get().fetch({ reset: false })
    },

    create: async (input) => {
      const budget = await api.post<PersonalBudget>("/personal-budgets", input)
      const { items } = get()
      set({ items: [budget, ...items], offset: items.length + 1 })
      return budget
    },

    edit: async (id, patch) => {
      const budget = await api.patch<PersonalBudget>(
        `/personal-budgets/${id}`,
        patch,
      )
      set({ items: get().items.map((b) => (b.id === id ? budget : b)) })
      return budget
    },

    remove: async (id) => {
      await api.del(`/personal-budgets/${id}`)
      const { items } = get()
      set({ items: items.filter((b) => b.id !== id), offset: Math.max(0, items.length - 1) })
    },

    clear: () =>
      set({
        items: [],
        status: "idle",
        error: null,
        offset: 0,
        hasMore: true,
      }),
  }),
)
