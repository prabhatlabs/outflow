import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDialogStore } from "@/store/dialog"
import type { DialogPayloadMap } from "./types"

export function ConfirmDialog({
  id,
  payload,
}: {
  id: string
  payload: DialogPayloadMap["confirm"]
}) {
  const close = useDialogStore((s) => s.close)
  const [pending, setPending] = useState(false)

  const handleConfirm = async () => {
    try {
      setPending(true)
      await payload.onConfirm()
      close(id)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{payload.title}</DialogTitle>
        {payload.description && (
          <DialogDescription>{payload.description}</DialogDescription>
        )}
      </DialogHeader>

      <DialogFooter>
        <Button
          variant="ghost"
          onClick={() => close(id)}
          disabled={pending}
        >
          {payload.cancelLabel ?? "Cancel"}
        </Button>
        <Button
          variant={payload.destructive === false ? "default" : "destructive"}
          onClick={handleConfirm}
          disabled={pending}
        >
          {payload.confirmLabel ?? "Confirm"}
        </Button>
      </DialogFooter>
    </>
  )
}
