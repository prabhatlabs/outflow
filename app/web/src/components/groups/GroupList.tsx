import type { Group } from "@/lib/types"
import { GroupListItem } from "./GroupListItem"

type Props = {
  groups: Group[]
}

export function GroupList({ groups }: Props) {
  return (
    <div className="grid gap-3">
      {groups.map((group) => (
        <GroupListItem key={group.id} group={group} />
      ))}
    </div>
  )
}
