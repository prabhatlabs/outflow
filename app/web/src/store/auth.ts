import { create } from "zustand"
import { api, ApiError } from "@/lib/api"
import type { User } from "@/lib/types"

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"

export type UpdateProfileInput = {
  first_name?: string
  last_name?: string | null
  avatar_url?: string | null
  timezone?: string
}

type AuthState = {
  user: User | null
  status: AuthStatus
  loadUser: () => Promise<void>
  refresh: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (patch: UpdateProfileInput) => Promise<User>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",

  loadUser: async () => {
    set({ status: "loading" })

    const fetchUser = async () => {
      const user = await api.get<User>("/auth/me")
      set({ user, status: "authenticated" })
      return true
    }

    try {
      if (await fetchUser()) return
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        try {
          await get().refresh()
          if (await fetchUser()) return
        } catch {
          // refresh failed -> treat as logged out
        }
      }
    }

    set({ user: null, status: "unauthenticated" })
  },

  refresh: async () => {
    await api.post<null>("/auth/refresh")
  },

  logout: async () => {
    try {
      await api.post<null>("/auth/logout")
    } finally {
      set({ user: null, status: "unauthenticated" })
    }
  },

  updateProfile: async (patch) => {
    const user = await api.patch<User>("/auth/me", patch)
    set({ user })
    return user
  },

  setUser: (user) => set({ user }),
}))