import { Navigate, Outlet, useLocation } from "react-router"
import { useAuthStore } from "@/store/auth"

function RequireAuth() {
  const { user, status } = useAuthStore()
  const location = useLocation()

  if (status === "idle" || status === "loading") return null

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default RequireAuth