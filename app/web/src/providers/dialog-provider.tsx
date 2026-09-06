import type { ReactNode } from "react"
import { DialogHost } from "@/dialogs/DialogHost"

export function DialogProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DialogHost />
    </>
  )
}
