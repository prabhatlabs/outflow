import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Shield, Trash2, User } from "lucide-react"
import type { Member } from "./MemberListItem"

type Props = {
  members: Member[]
  canManage: boolean
  onChangeRole: (member: Member) => void
  onRemove: (member: Member) => void
}

export function MemberTable({
  members,
  canManage,
  onChangeRole,
  onRemove,
}: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const name = [member.first_name, member.last_name]
            .filter(Boolean)
            .join(" ")
          const initial = (member.first_name || member.email)
            .slice(0, 1)
            .toUpperCase()
          const manageable = canManage && member.role !== "owner"
          return (
            <TableRow key={member.id}>
              <TableCell className="min-w-0 max-w-55">
                <span className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarImage
                      src={member.avatar_url ?? undefined}
                      alt={name}
                    />
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {name || member.email}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      {member.email}
                    </span>
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{member.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{member.status}</Badge>
              </TableCell>
              <TableCell>
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
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
