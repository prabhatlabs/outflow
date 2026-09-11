import { useState } from "react"
import { useParams } from "react-router"
import { BannerCard } from "@/components/BannerCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import PageHeader from "@/components/PageHeader"
import type { GroupType } from "@/lib/types"
import { useDialogStore } from "@/store/dialog"
import { isOwner, useGroupsStore } from "@/store/groups"

const GROUP_TYPES: GroupType[] = [
  "household",
  "trip",
  "roommates",
  "couple",
  "project",
  "other",
]

const SELECT_CLASS =
  "h-9 w-full rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring"

export function SettingsPage() {
  const { groupId } = useParams()

  const currentGroup = useGroupsStore((s) => s.currentGroup)
  const editGroup = useGroupsStore((s) => s.editGroup)
  const archiveGroup = useGroupsStore((s) => s.archiveGroup)
  const unarchiveGroup = useGroupsStore((s) => s.unarchiveGroup)

  const [name, setName] = useState(currentGroup?.name ?? "")
  const [description, setDescription] = useState(currentGroup?.description ?? "")
  const [type, setType] = useState<GroupType>(currentGroup?.type ?? "household")
  const [currency, setCurrency] = useState(currentGroup?.default_currency ?? "INR")
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Snapshot initial values when the group loads (RequireGroup guarantees it).
  const group = currentGroup
  const owner = isOwner(group)

  const handleSave = async () => {
    if (!groupId || !group) return
    if (name.trim().length === 0) {
      setFormError("Group name cannot be empty")
      return
    }
    setPending(true)
    setFormError(null)
    setSaved(false)
    try {
      await editGroup(groupId, {
        name: name.trim(),
        description: description.trim(),
        type,
        default_currency: currency.trim() || "INR",
      })
      setSaved(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update group")
    } finally {
      setPending(false)
    }
  }

  const handleArchive = () => {
    if (!groupId) return
    useDialogStore.getState().open("confirm", {
      title: "Archive group?",
      description: "Archived groups are hidden from the main list.",
      confirmLabel: "Archive",
      onConfirm: () => {
        void archiveGroup(groupId)
      },
    })
  }

  const handleUnarchive = () => {
    if (!groupId) return
    useDialogStore.getState().open("confirm", {
      title: "Unarchive group?",
      description: "The group will be visible in the main list again.",
      confirmLabel: "Unarchive",
      onConfirm: () => {
        void unarchiveGroup(groupId)
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group settings"
        description="Edit details and manage the group."
        actions={
          group && (
            <Badge variant="secondary">your role: {group.member_role}</Badge>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="group-settings-name">Name</Label>
            <Input
              id="group-settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="group-settings-description">Description</Label>
            <Textarea
              id="group-settings-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as GroupType)}
                className={SELECT_CLASS}
              >
                {GROUP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="group-settings-currency">Currency</Label>
              <Input
                id="group-settings-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          {saved && <p className="text-sm text-emerald-600">Saved.</p>}
          <div>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archive</CardTitle>
        </CardHeader>
        <CardContent>
          {!owner ? (
            <BannerCard
              title="Owners only"
              description="Only group owners can archive or unarchive this group."
            />
          ) : group?.is_archived ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                This group is archived.
              </p>
              <Button variant="outline" onClick={handleUnarchive}>
                Unarchive
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Hide this group from the main list.
              </p>
              <Button variant="outline" onClick={handleArchive}>
                Archive
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
