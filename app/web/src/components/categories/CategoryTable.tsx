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
import { Pencil, Trash2 } from "lucide-react"
import type { Category } from "./CategoryListItem"

type Props = {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

export function CategoryTable({ categories, onEdit, onDelete }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Icon</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="truncate font-medium min-w-0 max-w-55">
              <span className="flex items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </span>
            </TableCell>
            <TableCell>
              {category.icon ? (
                <Badge variant="secondary">{category.icon}</Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{category.color}</Badge>
            </TableCell>
            <TableCell>{formatDate(category.created_at)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onEdit(category)}
                >
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
