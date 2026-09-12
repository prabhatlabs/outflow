import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Category } from "@/lib/types"
import { Pencil, Trash2 } from "lucide-react"
import { CategoryIcon } from "./CategoryIcon"

export type { Category }

type Props = {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

export function CategoryListItem({ category, onEdit, onDelete }: Props) {
  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <p className="truncate font-medium">{category.name}</p>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            created {formatDate(category.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {category.icon && (
              <Badge variant="secondary">
                <span style={{ color: category.color }}>
                  <CategoryIcon name={category.icon} className="size-3" />
                </span>
                {category.icon}
              </Badge>
            )}
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
