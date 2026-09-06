import { useEffect } from "react"
import { useAuthStore } from "@/store/auth"

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    if (status === "idle") {
      useAuthStore.getState().loadUser()
    }
  }, [status])

  if (status === "idle" || status === "loading") return null

  return <>{children}</>
}

export default AuthBootstrap