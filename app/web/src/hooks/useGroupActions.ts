import type { Group } from "@/lib/types"
import { useDialogStore } from "@/store/dialog"
import { useGroupsStore } from "@/store/groups"

export function useGroupActions() {
  const archiveGroup = useGroupsStore((s) => s.archiveGroup)
  const unarchiveGroup = useGroupsStore((s) => s.unarchiveGroup)

  const handleEdit = (group: Group) => {
    useDialogStore.getState().open("createGroup", { groupId: group.id })
  }

  const handleArchive = (group: Group) => {
    useDialogStore.getState().open("confirm", {
      title: "Archive group?",
      description: `Archive "${group.name}"? You can restore it later from archived groups.`,
      confirmLabel: "Archive",
      onConfirm: () => {
        archiveGroup(group.id)
      },
    })
  }

  const handleUnarchive = (group: Group) => {
    useDialogStore.getState().open("confirm", {
      title: "Unarchive group?",
      description: `Unarchive "${group.name}"?`,
      confirmLabel: "Unarchive",
      onConfirm: () => {
        unarchiveGroup(group.id)
      },
    })
  }

  return { handleEdit, handleArchive, handleUnarchive }
}
