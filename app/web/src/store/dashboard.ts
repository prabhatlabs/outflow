import { create } from "zustand"
import { api } from "@/lib/api"
import type { DashboardOverview, OverviewPeriod } from "@/lib/types"

export type DashboardStatus = "idle" | "loading" | "success" | "error"

type DashboardState = {
  dashboard: DashboardOverview | null
  status: DashboardStatus
  period: OverviewPeriod
  error: string | null
  fetchDashboard: (period: OverviewPeriod) => Promise<void>
  clearDashboard: () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dashboard: null,
  status: "idle",
  period: "30d",
  error: null,

  fetchDashboard: async (period) => {
    set({ status: "loading", error: null, period })
    try {
      const dashboard = await api.get<DashboardOverview>(`/dashboard/overview?period=${period}`)
      set({ dashboard, status: "success" })
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to fetch dashboard",
      })
    }
  },

  clearDashboard: () => set({ dashboard: null, status: "idle", error: null }),
}))
