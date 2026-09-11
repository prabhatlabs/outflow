import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDialogStore } from "@/store/dialog"
import { useGroupInvitationsStore } from "@/store/invitations"
import type { DialogPayloadMap } from "./types"

export function InviteMemberDialog({
  id,
  payload,
}: {
  id: string
  payload?: DialogPayloadMap["inviteMember"]
}) {
  const groupId = payload?.groupId ?? ""
  const close = useDialogStore((s) => s.close)
  const create = useGroupInvitationsStore((s) => s.create)

  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!groupId) {
      setFormError("Missing group")
      return
    }
    if (email.trim().length === 0) {
      setFormError("Email is required")
      return
    }

    setPending(true)
    setFormError(null)
    try {
      await create(groupId, email.trim())
      close(id)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to send invitation",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Invite member</DialogTitle>
        <DialogDescription>
          Send an invitation to join this group.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            autoFocus
          />
        </div>
      </div>

      <DialogFooter>
        <div className="flex flex-1 flex-col gap-2">
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => close(id)} disabled={pending}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={email.trim().length === 0 || pending}
            >
              {pending ? "Sending..." : "Invite"}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </>
  )
}
