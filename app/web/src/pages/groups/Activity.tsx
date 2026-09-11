import { BannerCard } from "@/components/BannerCard"
import PageHeader from "@/components/PageHeader"

// Activity has no backend yet — coming later.
export function ActivityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Recent changes in this group."
      />
      <BannerCard
        title="Coming soon"
        description="The activity feed is not available yet."
      />
    </div>
  )
}
