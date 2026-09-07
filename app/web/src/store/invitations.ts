import { create } from "zustand"
import { api } from "@/lib/api"
import type { Group, Invitation } from "@/lib/types"

export type InvitationsStatus = "idle" | "loading" | "success" | "error"

const PAGE_LIMIT = 20

// ---- group invitations (owner/admin view) ----

type GroupInvitationsState = {
  items: Invitation[]
  status: InvitationsStatus
  error: string | null
  limit: number
  offset: number
  hasMore: boolean
  fetch: (groupId: string, opts?: { reset?: boolean }) => Promise<void>
  fetchMore: (groupId: string) => Promise<void>
  create: (groupId: string, email: string) => Promise<Invitation>
  cancel: (groupId: string, invitationId: string) => Promise<void>
  clear: () => void
}

export const useGroupInvitationsStore = create<GroupInvitationsState>(
  (set, get) => ({
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
          (await api.get<Invitation[]>(
            `/groups/${groupId}/invitations?limit=${limit}&offset=${offset}`,
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
            err instanceof Error ? err.message : "Failed to fetch invitations",
        })
      }
    },

    fetchMore: async (groupId) => {
      const { hasMore, status } = get()
      if (!hasMore || status === "loading") return
      await get().fetch(groupId, { reset: false })
    },

    create: async (groupId, email) => {
      const invitation = await api.post<Invitation>(
        `/groups/${groupId}/invitations`,
        { email },
      )
      const { items } = get()
      set({ items: [invitation, ...items], offset: items.length + 1 })
      return invitation
    },

    cancel: async (groupId, invitationId) => {
      await api.del(`/groups/${groupId}/invitations/${invitationId}`)
      const { items } = get()
      set({
        items: items.filter((i) => i.id !== invitationId),
        offset: Math.max(0, items.length - 1),
      })
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

// ---- my pending invitations (current user) ----

type MyInvitationsState = {
  items: Invitation[]
  status: InvitationsStatus
  error: string | null
  limit: number
  offset: number
  hasMore: boolean
  fetch: (opts?: { reset?: boolean }) => Promise<void>
  fetchMore: () => Promise<void>
  accept: (token: string) => Promise<Group>
  reject: (id: string) => Promise<void>
  clear: () => void
}

export const useMyInvitationsStore = create<MyInvitationsState>((set, get) => ({
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
        (await api.get<Invitation[]>(
          `/invitations/pending?limit=${limit}&offset=${offset}`,
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
          err instanceof Error ? err.message : "Failed to fetch invitations",
      })
    }
  },

  fetchMore: async () => {
    const { hasMore, status } = get()
    if (!hasMore || status === "loading") return
    await get().fetch({ reset: false })
  },

  accept: async (token) => {
    const group = await api.post<Group>("/invitations/accept", { token })
    const { items } = get()
    set({ items: items.filter((i) => i.token_hash !== token), offset: Math.max(0, items.length - 1) })
    return group
  },

  reject: async (id) => {
    await api.post("/invitations/reject", { id })
    const { items } = get()
    set({ items: items.filter((i) => i.id !== id), offset: Math.max(0, items.length - 1) })
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
