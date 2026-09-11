import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCategoriesStore } from "@/store/categories"
import { useDialogStore } from "@/store/dialog"
import type { DialogPayloadMap } from "./types"

export function CategoryDialog({
  id,
  payload,
}: {
  id: string
  payload?: DialogPayloadMap["category"]
}) {
  const groupId = payload?.groupId ?? ""
  const close = useDialogStore((s) => s.close)
  const create = useCategoriesStore((s) => s.create)
  const edit = useCategoriesStore((s) => s.edit)
  const items = useCategoriesStore((s) => s.items)

  const existing = useMemo(
    () =>
      payload?.categoryId
        ? (items.find((c) => c.id === payload.categoryId) ?? null)
        : null,
    [items, payload?.categoryId],
  )
  const isEdit = existing !== null

  const [name, setName] = useState(existing?.name ?? "")
  const [color, setColor] = useState(existing?.color ?? "#3b82f6")
  const [icon, setIcon] = useState(existing?.icon ?? "")
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!groupId) {
      setFormError("Missing group")
      return
    }
    if (name.trim().length === 0) {
      setFormError("Name is required")
      return
    }

    setPending(true)
    setFormError(null)
    try {
      if (isEdit && existing) {
        await edit(groupId, existing.id, {
          name: name.trim(),
          color,
          icon: icon.trim() || undefined,
        })
      } else {
        await create(groupId, {
          name: name.trim(),
          color,
          icon: icon.trim() || undefined,
        })
      }
      close(id)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save category",
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the category."
            : "Categories help organize group expenses."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="category-name">Name</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Food"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="category-color">Color</Label>
            <Input
              id="category-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="category-icon">Icon</Label>
            <Input
              id="category-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Optional, e.g. an emoji"
            />
          </div>
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
