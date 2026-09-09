import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  const editGroup = useGroupsStore((s) => s.editGroup)
  const groups = useGroupsStore((s) => s.groups)

  const existing = useMemo(
    () => (payload?.groupId ? (groups.find((g) => g.id === payload.groupId) ?? null) : null),
    [groups, payload?.groupId],
  )
  const isEdit = existing !== null

  const [name, setName] = useState(existing?.name ?? payload?.defaultName ?? "")
  const [description, setDescription] = useState(existing?.description ?? "")
  const [type, setType] = useState<GroupType>(existing?.type ?? "household")
  const [currency, setCurrency] = useState(existing?.default_currency ?? "USD")
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setPending(true)
    setFormError(null)
    try {
      if (isEdit && existing) {
        await editGroup(existing.id, {
          name: name.trim(),
          description: description.trim(),
          type,
          default_currency: currency.trim() || "USD",
        })
      } else {
        await createGroup({
          name: name.trim(),
          description: description.trim(),
          type,
          default_currency: currency.trim() || "USD",
        })
      }
      close(id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : isEdit ? "Failed to update group" : "Failed to create group")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit group" : "Create group"}</DialogTitle>
        <DialogDescription>
          {isEdit ? "Update the group." : "Groups share expenses, balances and settlements."}
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
          <Textarea
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
              onClick={handleSubmit}
              disabled={name.trim().length === 0 || pending}
            >
              {pending ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </>
  )
}
