import { create } from "zustand"
import { api } from "@/lib/api"
import type {
  CreateSettlementInput,
  Settlement,
  SettlementWithSplits,
} from "@/lib/types"

export type SettlementsStatus = "idle" | "loading" | "success" | "error"

const PAGE_LIMIT = 20

type SettlementsState = {
  items: Settlement[]
  status: SettlementsStatus
  error: string | null
  limit: number
  offset: number
  hasMore: boolean
  fetch: (
    groupId: string,
    opts?: { user_id?: string; reset?: boolean },
  ) => Promise<void>
  fetchMore: (groupId: string, opts?: { user_id?: string }) => Promise<void>
  fetchOne: (groupId: string, id: string) => Promise<SettlementWithSplits>
  create: (
    groupId: string,
    input: CreateSettlementInput,
  ) => Promise<SettlementWithSplits>
  remove: (groupId: string, id: string) => Promise<void>
  clear: () => void
}

export const useSettlementsStore = create<SettlementsState>((set, get) => ({
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

    const qs = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    })
    if (opts?.user_id) qs.set("user_id", opts.user_id)

    set({ status: "loading", error: null })

    try {
      const items =
        (await api.get<Settlement[]>(
          `/groups/${groupId}/settlements?${qs.toString()}`,
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
          err instanceof Error ? err.message : "Failed to fetch settlements",
      })
    }
  },

  fetchMore: async (groupId, opts) => {
    const { hasMore, status } = get()
    if (!hasMore || status === "loading") return
    await get().fetch(groupId, { ...opts, reset: false })
  },

  fetchOne: async (groupId, id) => {
    const settlement = await api.get<SettlementWithSplits>(
      `/groups/${groupId}/settlements/${id}`,
    )
    return settlement
  },

  create: async (groupId, input) => {
    const settlement = await api.post<SettlementWithSplits>(
      `/groups/${groupId}/settlements`,
      input,
    )
    const { items } = get()
    set({ items: [settlement as unknown as Settlement, ...items], offset: items.length + 1 })
    return settlement
  },

  remove: async (groupId, id) => {
    await api.del(`/groups/${groupId}/settlements/${id}`)
    const { items } = get()
    set({ items: items.filter((s) => s.id !== id), offset: Math.max(0, items.length - 1) })
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
