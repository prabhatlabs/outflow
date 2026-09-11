import { CategoryListItem, type Category } from "./CategoryListItem"

type Props = {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryList({ categories, onEdit, onDelete }: Props) {
  return (
    <div className="grid gap-3">
      {categories.map((category) => (
        <CategoryListItem
          key={category.id}
          category={category}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
