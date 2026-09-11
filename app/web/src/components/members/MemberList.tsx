import { MemberListItem, type Member } from "./MemberListItem"

type Props = {
  members: Member[]
  canManage: boolean
  onChangeRole: (member: Member) => void
  onRemove: (member: Member) => void
}

export function MemberList({
  members,
  canManage,
  onChangeRole,
  onRemove,
}: Props) {
  return (
    <div className="grid gap-3">
      {members.map((member) => (
        <MemberListItem
          key={member.id}
          member={member}
          canManage={canManage}
          onChangeRole={onChangeRole}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
