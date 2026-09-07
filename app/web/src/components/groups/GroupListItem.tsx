import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Group } from "@/lib/types"

type Props = {
  group: Group
}

export function GroupListItem({ group }: Props) {
  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{group.name}</p>
          {group.description && (
            <p className="truncate text-sm text-muted-foreground">{group.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{group.type}</Badge>
            <Badge variant="outline">{group.default_currency}</Badge>
            {group.is_archived && <Badge variant="destructive">archived</Badge>}
          </div>
        </div>
        <Button size="sm" variant="outline">
          <Link to={`/${group.id}/overview`}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
