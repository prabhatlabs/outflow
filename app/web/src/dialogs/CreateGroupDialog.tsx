import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { GroupType } from "@/lib/types"
import { useDialogStore } from "@/store/dialog"
import { useGroupsStore } from "@/store/groups"
import type { DialogPayloadMap } from "./types"

const GROUP_TYPES: GroupType[] = [
  "household",
  "trip",
  "roommates",
  "couple",
  "project",
  "other",
]

export function CreateGroupDialog({
  id,
  payload,
}: {
  id: string
  payload?: DialogPayloadMap["createGroup"]
}) {
  const close = useDialogStore((s) => s.close)
  const createGroup = useGroupsStore((s) => s.createGroup)
  const [name, setName] = useState(payload?.defaultName ?? "")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<GroupType>("household")
  const [currency, setCurrency] = useState("USD")
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleCreate = async () => {
    setPending(true)
    setFormError(null)
    try {
      await createGroup({
        name: name.trim(),
        description: description.trim(),
        type,
        default_currency: currency.trim() || "USD",
      })
      close(id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create group")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create group</DialogTitle>
        <DialogDescription>
          Groups share expenses, balances and settlements.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Name</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc"
            autoFocus
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium">Description</span>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group for?"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as GroupType)}
              className="h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring"
            >
              {GROUP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Currency</span>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="USD"
              maxLength={3}
            />
          </label>
        </div>
      </div>

      <DialogFooter>
        <div className="flex flex-1 flex-col gap-2">
          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => close(id)} disabled={pending}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={name.trim().length === 0 || pending}
            >
              {pending ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </>
  )
}
