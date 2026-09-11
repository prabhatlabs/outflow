import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useDialogStore } from "@/store/dialog"
import { BudgetDialog } from "./BudgetDialog"
import { CategoryDialog } from "./CategoryDialog"
import { ConfirmDialog } from "./ConfirmDialog"
import { CreateGroupDialog } from "./CreateGroupDialog"
import { EditProfileDialog } from "./EditProfileDialog"
import { ExpenseDialog } from "./ExpenseDialog"
import { GroupBudgetDialog } from "./GroupBudgetDialog"
import { InviteMemberDialog } from "./InviteMemberDialog"
import { SettlementDialog } from "./SettlementDialog"
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
            {d.type === "budget" && (
              <BudgetDialog
                id={d.id}
                payload={d.payload as DialogPayloadMap["budget"]}
              />
            )}
            {d.type === "editProfile" && <EditProfileDialog id={d.id} />}
            {d.type === "expense" && (
              <ExpenseDialog
                id={d.id}
                payload={d.payload as DialogPayloadMap["expense"]}
              />
            )}
            {d.type === "settlement" && (
              <SettlementDialog
                id={d.id}
                payload={d.payload as DialogPayloadMap["settlement"]}
              />
            )}
            {d.type === "category" && (
              <CategoryDialog
                id={d.id}
                payload={d.payload as DialogPayloadMap["category"]}
              />
            )}
            {d.type === "inviteMember" && (
              <InviteMemberDialog
                id={d.id}
                payload={d.payload as DialogPayloadMap["inviteMember"]}
              />
            )}
            {d.type === "groupBudget" && (
              <GroupBudgetDialog
                id={d.id}
                payload={d.payload as DialogPayloadMap["groupBudget"]}
              />
            )}
          </DialogContent>
        </Dialog>
      ))}
    </>
  )
}
