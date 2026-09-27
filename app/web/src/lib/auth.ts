import { useAuthStore } from "@/store/auth"

export async function logoutAndNavigate(navigate: (to: string) => void) {
  await useAuthStore.getState().logout()
  navigate("/login")
}
