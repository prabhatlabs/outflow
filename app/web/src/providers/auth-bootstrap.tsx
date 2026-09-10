import { useEffect } from "react"
import { setAuthHandlers } from "@/lib/api"
import { useAuthStore } from "@/store/auth"

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    // Register handlers for the api client's 401 -> refresh -> retry
    // interceptor. Wired here (not in lib/api) to avoid a store/api
    // import cycle.
    setAuthHandlers({
      refresh: () => useAuthStore.getState().refresh(),
      onExpired: () =>
        useAuthStore.setState({ user: null, status: "unauthenticated" }),
    })
    return () => setAuthHandlers(null)
  }, [])

  useEffect(() => {
    if (status === "idle") {
      useAuthStore.getState().loadUser()
    }
  }, [status])

  if (status === "idle" || status === "loading") return null

  return <>{children}</>
}

export default AuthBootstrap