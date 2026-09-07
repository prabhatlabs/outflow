import { create } from "zustand"
import { api } from "@/lib/api"
import type { GroupMemberWithUser } from "@/lib/types"

export type MembersStatus = "idle" | "loading" | "success" | "error"

const PAGE_LIMIT = 20

type MembersState = {
  items: GroupMemberWithUser[]
  status: MembersStatus
  error: string | null
  limit: number
  offset: number
  hasMore: boolean
  fetch: (groupId: string, opts?: { reset?: boolean }) => Promise<void>
  fetchMore: (groupId: string) => Promise<void>
  updateRole: (
    groupId: string,
    memberId: string,
    role: "admin" | "member",
  ) => Promise<GroupMemberWithUser>
  remove: (groupId: string, memberId: string) => Promise<void>
  leave: (groupId: string) => Promise<void>
  clear: () => void
}

export const useMembersStore = create<MembersState>((set, get) => ({
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
        (await api.get<GroupMemberWithUser[]>(
          `/groups/${groupId}/members?limit=${limit}&offset=${offset}`,
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
        error: err instanceof Error ? err.message : "Failed to fetch members",
      })
    }
  },

  fetchMore: async (groupId) => {
    const { hasMore, status } = get()
    if (!hasMore || status === "loading") return
    await get().fetch(groupId, { reset: false })
  },

  updateRole: async (groupId, memberId, role) => {
    const member = await api.patch<GroupMemberWithUser>(
      `/groups/${groupId}/members/${memberId}/role`,
      { role },
    )
    set({ items: get().items.map((m) => (m.id === memberId ? { ...m, ...member } : m)) })
    return member
  },

  remove: async (groupId, memberId) => {
    await api.del(`/groups/${groupId}/members/${memberId}`)
    const { items } = get()
    set({ items: items.filter((m) => m.id !== memberId), offset: Math.max(0, items.length - 1) })
  },

  leave: async (groupId) => {
    await api.post(`/groups/${groupId}/members/leave`)
    set({ items: [], offset: 0, hasMore: true, status: "idle" })
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
