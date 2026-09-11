import { Plus } from "lucide-react"
import { useEffect } from "react"
import { useParams } from "react-router"
import { BannerCard } from "@/components/BannerCard"
import { CategoryList } from "@/components/categories/CategoryList"
import type { Category } from "@/components/categories/CategoryListItem"
import { CategoryTable } from "@/components/categories/CategoryTable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/PageHeader"
import { useCategoriesStore } from "@/store/categories"
import { useDialogStore } from "@/store/dialog"
import { useViewModeStore } from "@/store/viewMode"

export function CategoriesPage() {
  const { groupId } = useParams()

  const items = useCategoriesStore((s) => s.items)
  const status = useCategoriesStore((s) => s.status)
  const error = useCategoriesStore((s) => s.error)
  const hasMore = useCategoriesStore((s) => s.hasMore)
  const fetch = useCategoriesStore((s) => s.fetch)
  const fetchMore = useCategoriesStore((s) => s.fetchMore)
  const remove = useCategoriesStore((s) => s.remove)

  useEffect(() => {
    if (groupId && status === "idle") fetch(groupId)
  }, [groupId, status, fetch])

  const mode = useViewModeStore((s) => s.mode)

  const handleEdit = (category: Category) => {
    if (!groupId) return
    useDialogStore
      .getState()
      .open("category", { groupId, categoryId: category.id })
  }

  const handleDelete = (category: Category) => {
    if (!groupId) return
    useDialogStore.getState().open("confirm", {
      title: "Delete category?",
      description: "This cannot be undone.",
      destructive: true,
      confirmLabel: "Delete",
      onConfirm: () => remove(groupId, category.id),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Group-specific categories for organizing expenses."
        actions={
          <Button
            onClick={() =>
              groupId && useDialogStore.getState().open("category", { groupId })
            }
          >
            <Plus className="size-4" />
            New category
          </Button>
        }
      />

      {error && (
        <BannerCard
          variant="destructive"
          title="Failed to load categories"
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
          title="No categories yet"
          description="Create a category to organize group expenses."
          action={
            <Button
              onClick={() =>
                groupId &&
                useDialogStore.getState().open("category", { groupId })
              }
              size="sm"
            >
              New category
            </Button>
          }
        />
      )}

      {items.length > 0 &&
        (mode === "table" ? (
          <CategoryTable
            categories={items}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <CategoryList
            categories={items}
            onEdit={handleEdit}
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
