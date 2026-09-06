import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useDialogStore } from "@/store/dialog"
import { ConfirmDialog } from "./ConfirmDialog"
import { CreateGroupDialog } from "./CreateGroupDialog"
import type { DialogPayloadMap } from "./types"

export function DialogHost() {
  const stack = useDialogStore((s) => s.stack)
  const close = useDialogStore((s) => s.close)

  return (
    <>
      {stack.map((d) => (
        <Dialog
          key={d.id}
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) close(d.id)
          }}
        >
          <DialogContent>
            {d.type === "createGroup" && (
              <CreateGroupDialog
                id={d.id}
                payload={d.payload as DialogPayloadMap["createGroup"]}
              />
            )}
            {d.type === "confirm" && (
              <ConfirmDialog
                id={d.id}
                payload={d.payload as DialogPayloadMap["confirm"]}
              />
            )}
          </DialogContent>
        </Dialog>
      ))}
    </>
  )
}
