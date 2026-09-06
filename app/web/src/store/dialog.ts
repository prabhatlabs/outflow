import { create } from "zustand"
import type { DialogPayloadMap, DialogType, OpenDialog } from "@/dialogs/types"

type DialogState = {
  stack: OpenDialog[]
  open: <T extends DialogType>(type: T, payload?: DialogPayloadMap[T]) => string
  close: (id: string) => void
  closeTop: () => void
  closeAll: () => void
  closeType: (type: DialogType) => void
  isOpen: (type: DialogType) => boolean
}

export const useDialogStore = create<DialogState>((set, get) => ({
  stack: [],

  open: (type, payload) => {
    const id = crypto.randomUUID()
    set((s) => ({
      stack: [...s.stack, { id, type, payload } as OpenDialog],
    }))
    return id
  },

  close: (id) => set((s) => ({ stack: s.stack.filter((d) => d.id !== id) })),

  closeTop: () => set((s) => ({ stack: s.stack.slice(0, -1) })),

  closeAll: () => set({ stack: [] }),

  closeType: (type) =>
    set((s) => ({ stack: s.stack.filter((d) => d.type !== type) })),

  isOpen: (type) => get().stack.some((d) => d.type === type),
}))
