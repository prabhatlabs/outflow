import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatDateTime } from "@/lib/format"
import type { Category } from "@/lib/types"
import { Pencil, Trash2 } from "lucide-react"
import { CategoryVisual } from "./CategoryVisual"

export type { Category }

type Props = {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryListItem({ category, onEdit, onDelete }: Props) {
  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryVisual
            icon={category.icon}
            color={category.color}
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{category.name}</p>
            <p className="truncate text-sm text-muted-foreground">
              created {formatDateTime(category.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={() => onEdit(category)}>
            <Pencil />
            Edit
          </Button>
          <Button
            size="xs"
            variant="destructive"
            onClick={() => onDelete(category)}
          >
            <Trash2 />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
