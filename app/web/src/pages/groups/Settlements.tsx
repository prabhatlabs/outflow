import { HandCoins } from "lucide-react"
import { useEffect } from "react"
import { Link, useParams } from "react-router"
import { BannerCard } from "@/components/BannerCard"
import { SettlementList } from "@/components/settlements/SettlementList"
import type { Settlement } from "@/components/settlements/SettlementListItem"
import { SettlementTable } from "@/components/settlements/SettlementTable"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import { useDialogStore } from "@/store/dialog"
import { useGroupsStore } from "@/store/groups"
import { useMembersStore } from "@/store/members"
import { useSettlementsStore } from "@/store/settlements"
import { useViewModeStore } from "@/store/viewMode"

export function SettlementsPage() {
  const { groupId } = useParams()

  const currentGroup = useGroupsStore((s) => s.currentGroup)

  const items = useSettlementsStore((s) => s.items)
  const status = useSettlementsStore((s) => s.status)
  const error = useSettlementsStore((s) => s.error)
  const hasMore = useSettlementsStore((s) => s.hasMore)
  const fetch = useSettlementsStore((s) => s.fetch)
  const fetchMore = useSettlementsStore((s) => s.fetchMore)
  const remove = useSettlementsStore((s) => s.remove)

  const members = useMembersStore((s) => s.items)
  const membersStatus = useMembersStore((s) => s.status)
  const fetchMembers = useMembersStore((s) => s.fetch)

  useEffect(() => {
    if (groupId && status === "idle") fetch(groupId)
  }, [groupId, status, fetch])

  useEffect(() => {
    if (groupId && membersStatus === "idle") fetchMembers(groupId)
  }, [groupId, membersStatus, fetchMembers])

  const mode = useViewModeStore((s) => s.mode)
  const currency = currentGroup?.default_currency ?? "INR"

  const handleDelete = (settlement: Settlement) => {
    if (!groupId) return
    useDialogStore.getState().open("confirm", {
      title: "Delete settlement?",
      description: "This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete",
      onConfirm: () => remove(groupId, settlement.id),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlements"
        description="Payments between members that settle group balances."
        actions={
          <Link
            to={`/${groupId}/settlements/new`}
            className={buttonVariants()}
          >
            <HandCoins className="size-4" />
            Settle up
          </Link>
        }
      />

      {error && (
        <BannerCard
          variant="destructive"
          title="Failed to load settlements"
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
          title="No settlements yet"
          description="Settle up to record a payment between members."
          action={
            <Link
              to={`/${groupId}/settlements/new`}
              className={buttonVariants({ size: "sm" })}
            >
              Settle up
            </Link>
          }
        />
      )}

      {items.length > 0 &&
        (mode === "table" ? (
          <SettlementTable
            settlements={items}
            members={members}
            currency={currency}
            onDelete={handleDelete}
          />
        ) : (
          <SettlementList
            settlements={items}
            members={members}
            currency={currency}
            onDelete={handleDelete}
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
