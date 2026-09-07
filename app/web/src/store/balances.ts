import { create } from "zustand"
import { api } from "@/lib/api"
import type { BalanceRow } from "@/lib/types"

export type BalancesStatus = "idle" | "loading" | "success" | "error"

type BalancesState = {
  items: BalanceRow[]
  status: BalancesStatus
  error: string | null
  fetch: (groupId: string) => Promise<void>
  clear: () => void
}

export const useBalancesStore = create<BalancesState>((set) => ({
  items: [],
  status: "idle",
  error: null,

  fetch: async (groupId) => {
    set({ status: "loading", error: null })
    try {
      const items = (await api.get<BalanceRow[]>(`/groups/${groupId}/balances`)) ?? []
      set({ items, status: "success" })
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to fetch balances",
      })
    }
  },

  clear: () => set({ items: [], status: "idle", error: null }),
}))
