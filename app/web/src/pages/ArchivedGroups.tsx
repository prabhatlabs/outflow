import { useEffect } from "react"
import { BannerCard } from "@/components/BannerCard"
import { GroupList } from "@/components/groups/GroupList"
import { GroupTable } from "@/components/groups/GroupTable"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import { useGroupsStore } from "@/store/groups"
import { useViewModeStore } from "@/store/viewMode"

export default function ArchivedGroups() {
  const groups = useGroupsStore((s) => s.groups)
  const status = useGroupsStore((s) => s.status)
  const error = useGroupsStore((s) => s.error)
  const fetchGroups = useGroupsStore((s) => s.fetchGroups)

  useEffect(() => {
    if (status === "idle") fetchGroups()
  }, [status, fetchGroups])

  const archived = groups.filter((g) => g.is_archived)
  const mode = useViewModeStore((s) => s.mode)

  return (
    <div className="space-y-6">
      <PageHeader title="Archived groups" description="Groups you have archived." />

      {error && <BannerCard variant="destructive" title="Failed to load groups" description={error} />}

      {status === "loading" && <Skeleton className="h-20 w-full rounded-2xl" />}

      {status !== "loading" && archived.length === 0 && (
        <BannerCard title="No archived groups" description="Archived groups will show up here." />
      )}

      {archived.length > 0 &&
        (mode === "table" ? <GroupTable groups={archived} /> : <GroupList groups={archived} />)}
    </div>
  )
}
