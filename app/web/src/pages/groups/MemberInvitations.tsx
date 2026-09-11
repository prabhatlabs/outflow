import { Plus, Trash2 } from "lucide-react"
import { useEffect } from "react"
import { useParams } from "react-router"
import { BannerCard } from "@/components/BannerCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import type { Invitation } from "@/lib/types"
import { useDialogStore } from "@/store/dialog"
import { canManage, useGroupsStore } from "@/store/groups"
import { useGroupInvitationsStore } from "@/store/invitations"

function formatDate(value: string) {
  return value.slice(0, 10)
}

export function MemberInvitationsPage() {
  const { groupId } = useParams()

  const currentGroup = useGroupsStore((s) => s.currentGroup)
  const manage = canManage(currentGroup)

  const items = useGroupInvitationsStore((s) => s.items)
  const status = useGroupInvitationsStore((s) => s.status)
  const error = useGroupInvitationsStore((s) => s.error)
  const hasMore = useGroupInvitationsStore((s) => s.hasMore)
  const fetch = useGroupInvitationsStore((s) => s.fetch)
  const fetchMore = useGroupInvitationsStore((s) => s.fetchMore)
  const cancel = useGroupInvitationsStore((s) => s.cancel)

  useEffect(() => {
    if (groupId && status === "idle") fetch(groupId)
  }, [groupId, status, fetch])

  const handleCancel = (invitation: Invitation) => {
    if (!groupId) return
    useDialogStore.getState().open("confirm", {
      title: "Cancel invitation?",
      description: `Cancel the invitation sent to ${invitation.email}?`,
      destructive: true,
      confirmLabel: "Cancel invitation",
      onConfirm: () => cancel(groupId, invitation.id),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        description="Pending invitations for this group."
        actions={
          manage && (
            <Button
              onClick={() =>
                groupId &&
                useDialogStore.getState().open("inviteMember", { groupId })
              }
            >
              <Plus className="size-4" />
              Invite members
            </Button>
          )
        }
      />

      {error && (
        <BannerCard
          variant="destructive"
          title="Failed to load invitations"
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
          title="No pending invitations"
          description="Invite people by email to join this group."
          action={
            manage && (
              <Button
                onClick={() =>
                  groupId &&
                  useDialogStore.getState().open("inviteMember", { groupId })
                }
                size="sm"
              >
                Invite members
              </Button>
            )
          }
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-3">
          {items.map((invitation) => (
            <Card className="py-3" key={invitation.id}>
              <CardContent className="flex items-start justify-between gap-3 px-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{invitation.email}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    expires {formatDate(invitation.expires_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{invitation.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() => handleCancel(invitation)}
                  >
                    <Trash2 />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
