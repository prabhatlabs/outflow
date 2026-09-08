import { create } from "zustand"
import { api } from "@/lib/api"
import type { Group, GroupType } from "@/lib/types"

export type GroupsStatus = "idle" | "loading" | "success" | "error"

export type CreateGroupInput = {
  name: string
  description?: string
  avatar_url?: string
  type?: GroupType
  default_currency?: string
}

export type EditGroupInput = {
  name?: string
  description?: string
  avatar_url?: string
  type?: GroupType
  default_currency?: string
}

type GroupsState = {
  groups: Group[]
  currentGroup: Group | null
  status: GroupsStatus
  error: string | null
  fetchGroups: () => Promise<void>
  fetchGroupById: (id: string) => Promise<Group>
  createGroup: (input: CreateGroupInput) => Promise<Group>
  editGroup: (id: string, patch: EditGroupInput) => Promise<Group>
  archiveGroup: (id: string) => Promise<Group>
  unarchiveGroup: (id: string) => Promise<Group>
  setGroups: (groups: Group[]) => void
  setCurrentGroup: (group: Group | null) => void
  setCurrentGroupById: (id: string) => void
  clearGroups: () => void
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  currentGroup: null,
  status: "idle",
  error: null,

  fetchGroups: async () => {
    set({ status: "loading", error: null })
    try {
      const groups = (await api.get<Group[]>("/groups/all")) ?? []
      const { currentGroup } = get()
      const nextCurrent =
        currentGroup !== null
          ? (groups.find((g) => g.id === currentGroup.id) ?? null)
          : (groups[0] ?? null)
      set({ groups, currentGroup: nextCurrent, status: "success" })
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to fetch groups",
      })
    }
  },

  setGroups: (groups) => {
    const { currentGroup } = get()
    const nextCurrent =
      currentGroup !== null
        ? (groups.find((g) => g.id === currentGroup.id) ?? null)
        : (groups[0] ?? null)
    set({ groups, currentGroup: nextCurrent })
  },

  fetchGroupById: async (id) => {
    try {
      const group = await api.get<Group>(`/groups/${id}`)
      const { groups, currentGroup } = get()
      const exists = groups.some((g) => g.id === group.id)
      set({
        groups: exists
          ? groups.map((g) => (g.id === group.id ? group : g))
          : [group, ...groups],
        currentGroup: currentGroup?.id === group.id ? group : currentGroup,
        error: null,
      })
      return group
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch group"
      set({ error: message })
      throw err
    }
  },

  createGroup: async (input) => {
    try {
      const group = await api.post<Group>("/groups/create", {
        name: input.name,
        description: input.description ?? "",
        avatar_url: input.avatar_url ?? "",
        type: input.type ?? "household",
        default_currency: input.default_currency ?? "INR",
      })
      const { groups } = get()
      set({ groups: [group, ...groups], currentGroup: group, error: null })
      return group
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create group"
      set({ error: message })
      throw err
    }
  },

  editGroup: async (id, patch) => {
    try {
      const group = await api.patch<Group>(`/groups/${id}`, patch)
      const { groups, currentGroup } = get()
      set({
        groups: groups.map((g) => (g.id === group.id ? group : g)),
        currentGroup: currentGroup?.id === group.id ? group : currentGroup,
        error: null,
      })
      return group
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update group"
      set({ error: message })
      throw err
    }
  },

  archiveGroup: async (id) => {
    try {
      const group = await api.patch<Group>(`/groups/${id}/archive`)
      const { groups, currentGroup } = get()
      const nextGroups = groups.map((g) => (g.id === group.id ? group : g))
      const nextCurrent =
        currentGroup?.id === group.id
          ? (nextGroups.find((g) => !g.is_archived) ?? null)
          : currentGroup
      set({ groups: nextGroups, currentGroup: nextCurrent, error: null })
      return group
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to archive group"
      set({ error: message })
      throw err
    }
  },

  unarchiveGroup: async (id) => {
    try {
      const group = await api.patch<Group>(`/groups/${id}/unarchive`)
      const { groups, currentGroup } = get()
      const nextGroups = groups.map((g) => (g.id === group.id ? group : g))
      const nextCurrent =
        currentGroup?.id === group.id
          ? (nextGroups.find((g) => g.is_archived) ?? null)
          : currentGroup
      set({ groups: nextGroups, currentGroup: nextCurrent, error: null })
      return group
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unarchive group"
      set({ error: message })
      throw err
    }
  },

  setCurrentGroup: (group) => set({ currentGroup: group }),

  setCurrentGroupById: (id) => {
    const group = get().groups.find((g) => g.id === id) ?? null
    set({ currentGroup: group })
  },

  clearGroups: () =>
    set({ groups: [], currentGroup: null, status: "idle", error: null }),
}))
