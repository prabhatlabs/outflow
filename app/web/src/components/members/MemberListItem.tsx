import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { GroupMemberWithUser } from "@/lib/types"
import { Shield, Trash2, User } from "lucide-react"

export type Member = GroupMemberWithUser

type Props = {
  member: Member
  canManage: boolean
  onChangeRole: (member: Member) => void
  onRemove: (member: Member) => void
}

export function MemberListItem({
  member,
  canManage,
  onChangeRole,
  onRemove,
}: Props) {
  const name = [member.first_name, member.last_name].filter(Boolean).join(" ")
  const initial = (member.first_name || member.email).slice(0, 1).toUpperCase()
  const manageable = canManage && member.role !== "owner"

  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar>
            <AvatarImage src={member.avatar_url ?? undefined} alt={name} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{name || member.email}</p>
            <p className="truncate text-sm text-muted-foreground">
              {member.email}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{member.role}</Badge>
              <Badge variant="outline">{member.status}</Badge>
            </div>
          </div>
        </div>
        {manageable && (
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => onChangeRole(member)}
            >
              {member.role === "admin" ? <User /> : <Shield />}
              {member.role === "admin" ? "Make member" : "Make admin"}
            </Button>
            <Button
              size="xs"
              variant="destructive"
              onClick={() => onRemove(member)}
            >
              <Trash2 />
              Remove
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
