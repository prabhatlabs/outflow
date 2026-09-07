import { create } from "zustand"
import { api } from "@/lib/api"
import type { Category } from "@/lib/types"

export type CategoriesStatus = "idle" | "loading" | "success" | "error"

const PAGE_LIMIT = 20

export type CreateCategoryInput = {
  name: string
  icon?: string
  color: string
}

export type EditCategoryInput = Partial<CreateCategoryInput>

type CategoriesState = {
  items: Category[]
  status: CategoriesStatus
  error: string | null
  limit: number
  offset: number
  hasMore: boolean
  fetch: (groupId: string, opts?: { reset?: boolean }) => Promise<void>
  fetchMore: (groupId: string) => Promise<void>
  create: (groupId: string, input: CreateCategoryInput) => Promise<Category>
  edit: (
    groupId: string,
    id: string,
    patch: EditCategoryInput,
  ) => Promise<Category>
  remove: (groupId: string, id: string) => Promise<void>
  clear: () => void
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
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
        (await api.get<Category[]>(
          `/groups/${groupId}/categories?limit=${limit}&offset=${offset}`,
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
        error: err instanceof Error ? err.message : "Failed to fetch categories",
      })
    }
  },

  fetchMore: async (groupId) => {
    const { hasMore, status } = get()
    if (!hasMore || status === "loading") return
    await get().fetch(groupId, { reset: false })
  },

  create: async (groupId, input) => {
    const category = await api.post<Category>(
      `/groups/${groupId}/categories`,
      input,
    )
    const { items } = get()
    set({ items: [category, ...items], offset: items.length + 1 })
    return category
  },

  edit: async (groupId, id, patch) => {
    const category = await api.patch<Category>(
      `/groups/${groupId}/categories/${id}`,
      patch,
    )
    set({ items: get().items.map((c) => (c.id === id ? category : c)) })
    return category
  },

  remove: async (groupId, id) => {
    await api.del(`/groups/${groupId}/categories/${id}`)
    const { items } = get()
    set({ items: items.filter((c) => c.id !== id), offset: Math.max(0, items.length - 1) })
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
