import { Link } from "react-router"
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
import type { Group } from "@/lib/types"

type Props = {
  groups: Group[]
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return value.slice(0, 10)
}

export function GroupTable({ groups }: Props) {
  return (
    <div className="rounded-4xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell>
                <div className="min-w-0 max-w-55">
                  <p className="truncate font-medium">{group.name}</p>
                  {group.description && (
                    <p className="truncate text-xs text-muted-foreground">{group.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{group.type}</Badge>
              </TableCell>
              <TableCell>{group.default_currency}</TableCell>
              <TableCell>{formatDate(group.created_at)}</TableCell>
              <TableCell>
                {group.is_archived ? (
                  <Badge variant="destructive">archived</Badge>
                ) : (
                  <Badge variant="outline">active</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline">
                  <Link to={`/${group.id}/overview`}>Open</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
