import { create } from "zustand"

export type ViewMode = "card" | "table"

const STORAGE_KEY = "outflow:viewMode"

function load(): ViewMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === "table" || raw === "card" ? raw : "card"
  } catch {
    return "card"
  }
}

type ViewModeState = {
  mode: ViewMode
  setMode: (mode: ViewMode) => void
}

export const useViewModeStore = create<ViewModeState>((set) => ({
  mode: load(),
  setMode: (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // ignore
    }
    set({ mode })
  },
}))
