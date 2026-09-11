import { Mail, UserPlus } from "lucide-react"
import { useEffect } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { BannerCard } from "@/components/BannerCard"
import { MemberList } from "@/components/members/MemberList"
import type { Member } from "@/components/members/MemberListItem"
import { MemberTable } from "@/components/members/MemberTable"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import { useAuthStore } from "@/store/auth"
import { useDialogStore } from "@/store/dialog"
import { canManage, useGroupsStore } from "@/store/groups"
import { useMembersStore } from "@/store/members"
import { useViewModeStore } from "@/store/viewMode"

export function MembersPage() {
  const { groupId } = useParams()
  const navigate = useNavigate()

  const currentGroup = useGroupsStore((s) => s.currentGroup)
  const user = useAuthStore((s) => s.user)

  const items = useMembersStore((s) => s.items)
  const status = useMembersStore((s) => s.status)
  const error = useMembersStore((s) => s.error)
  const hasMore = useMembersStore((s) => s.hasMore)
  const fetch = useMembersStore((s) => s.fetch)
  const fetchMore = useMembersStore((s) => s.fetchMore)
  const updateRole = useMembersStore((s) => s.updateRole)
  const remove = useMembersStore((s) => s.remove)
  const leave = useMembersStore((s) => s.leave)

  useEffect(() => {
    if (groupId && status === "idle") fetch(groupId)
  }, [groupId, status, fetch])

  const mode = useViewModeStore((s) => s.mode)
  const manage = canManage(currentGroup)

  const handleChangeRole = (member: Member) => {
    if (!groupId || member.role === "owner") return
    const role = member.role === "admin" ? "member" : "admin"
    useDialogStore.getState().open("confirm", {
      title: `Make ${member.first_name} ${role}?`,
      description:
        role === "admin"
          ? "Admins can edit the group and manage members."
          : "Members can add and share expenses.",
      confirmLabel: "Change role",
      onConfirm: () => {
        void updateRole(groupId, member.id, role)
      },
    })
  }

  const handleRemove = (member: Member) => {
    if (!groupId) return
    useDialogStore.getState().open("confirm", {
      title: `Remove ${member.first_name}?`,
      description: "This cannot be undone.",
      destructive: true,
      confirmLabel: "Remove",
      onConfirm: () => remove(groupId, member.id),
    })
  }

  const handleLeave = () => {
    if (!groupId || !user) return
    useDialogStore.getState().open("confirm", {
      title: "Leave group?",
      description: "You will lose access to this group.",
      destructive: true,
      confirmLabel: "Leave",
      onConfirm: async () => {
        await leave(groupId)
        navigate("/")
      },
    })
  }

  const handleInvite = () => {
    if (!groupId) return
    useDialogStore.getState().open("inviteMember", { groupId })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="People in this group and their roles."
        actions={
          <>
            {manage && (
              <Button onClick={handleInvite}>
                <UserPlus className="size-4" />
                Invite members
              </Button>
            )}
            <Link
              to={`/${groupId}/members/invitations`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Mail className="size-4" />
              Invitations
            </Link>
            {user && (
              <Button variant="destructive" onClick={handleLeave}>
                Leave group
              </Button>
            )}
          </>
        }
      />

      {error && (
        <BannerCard
          variant="destructive"
          title="Failed to load members"
          description={error}
        />
      )}

      {status === "loading" && items.length === 0 && (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {status !== "loading" && items.length === 0 && (
        <BannerCard
          title="No members yet"
          description="Invite people to start sharing expenses."
          action={
            manage && (
              <Button onClick={handleInvite} size="sm">
                Invite members
              </Button>
            )
          }
        />
      )}

      {items.length > 0 &&
        (mode === "table" ? (
          <MemberTable
            members={items}
            canManage={manage}
            onChangeRole={handleChangeRole}
            onRemove={handleRemove}
          />
        ) : (
          <MemberList
            members={items}
            canManage={manage}
            onChangeRole={handleChangeRole}
            onRemove={handleRemove}
          />
        ))}

      {hasMore && items.length > 0 && groupId && (
        <Button
          variant="outline"
          onClick={() => fetchMore(groupId)}
          disabled={status === "loading"}
        >
          Load more
        </Button>
      )}
    </div>
  )
}
