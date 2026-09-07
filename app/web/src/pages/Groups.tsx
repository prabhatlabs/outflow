import { Plus } from "lucide-react"
import { useEffect } from "react"
import { BannerCard } from "@/components/BannerCard"
import { Button } from "@/components/ui/button"
import { GroupList } from "@/components/groups/GroupList"
import { GroupTable } from "@/components/groups/GroupTable"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import { useDialogStore } from "@/store/dialog"
import { useGroupsStore } from "@/store/groups"
import { useViewModeStore } from "@/store/viewMode"

export default function Groups() {
  const groups = useGroupsStore((s) => s.groups)
  const status = useGroupsStore((s) => s.status)
  const error = useGroupsStore((s) => s.error)
  const fetchGroups = useGroupsStore((s) => s.fetchGroups)

  useEffect(() => {
    if (status === "idle") fetchGroups()
  }, [status, fetchGroups])

  const active = groups.filter((g) => !g.is_archived)
  const mode = useViewModeStore((s) => s.mode)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Groups"
        description="Create or open a group."
        actions={
          <Button onClick={() => useDialogStore.getState().open("createGroup")}>
            <Plus className="size-4" />
            New group
          </Button>
        }
      />

      {error && (
        <BannerCard variant="destructive" title="Failed to load groups" description={error} />
      )}

      {status === "loading" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {status !== "loading" && active.length === 0 && (
        <BannerCard
          title="No groups yet"
          description="Create a group to get started."
          action={
            <Button onClick={() => useDialogStore.getState().open("createGroup")} size="sm">
              New group
            </Button>
          }
        />
      )}

      {active.length > 0 &&
        (mode === "table" ? <GroupTable groups={active} /> : <GroupList groups={active} />)}
    </div>
  )
}
