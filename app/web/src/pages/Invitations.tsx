import { useEffect } from "react"
import { useNavigate } from "react-router"
import { Badge } from "@/components/ui/badge"
import { BannerCard } from "@/components/BannerCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import { useDialogStore } from "@/store/dialog"
import { useGroupsStore } from "@/store/groups"
import { useMyInvitationsStore } from "@/store/invitations"

export default function Invitations() {
  const items = useMyInvitationsStore((s) => s.items)
  const status = useMyInvitationsStore((s) => s.status)
  const error = useMyInvitationsStore((s) => s.error)
  const hasMore = useMyInvitationsStore((s) => s.hasMore)
  const fetch = useMyInvitationsStore((s) => s.fetch)
  const fetchMore = useMyInvitationsStore((s) => s.fetchMore)
  const accept = useMyInvitationsStore((s) => s.accept)
  const reject = useMyInvitationsStore((s) => s.reject)

  const navigate = useNavigate()

  useEffect(() => {
    if (status === "idle") fetch()
  }, [status, fetch])

  // support /invitations?token= — auto-trigger accept once if token present
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token")
    if (token) {
      accept(token)
        .then((group) => {
          useGroupsStore.getState().fetchGroups()
          navigate(`/${group.id}/overview`)
        })
        .catch(() => {})
    }
  }, [accept, navigate])

  return (
    <div className="space-y-6">
      <PageHeader title="My invitations" description="Groups you have been invited to." />

      {error && (
        <BannerCard variant="destructive" title="Failed to load invitations" description={error} />
      )}

      {status === "loading" && items.length === 0 && (
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      )}

      {status !== "loading" && items.length === 0 && (
        <BannerCard title="No pending invitations" description="Invites will appear here when someone adds you to a group." />
      )}

      <div className="grid gap-3">
        {items.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{inv.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{inv.status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    expires {inv.expires_at?.slice(0, 10) ?? "—"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    useDialogStore.getState().open("confirm", {
                      title: "Reject invitation?",
                      description: `Reject the invitation for ${inv.email}?`,
                      onConfirm: () => reject(inv.id),
                    })
                  }
                >
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasMore && items.length > 0 && (
        <Button variant="outline" onClick={() => fetchMore()} disabled={status === "loading"}>
          Load more
        </Button>
      )}

      <p className="text-sm text-muted-foreground">
        Accept invitations from the email link — they open here automatically when `?token=` is present.
      </p>
    </div>
  )
}
