import type { LucideIcon } from "lucide-react"
import { CATEGORY_ICONS } from "./category-icons"

export function CategoryIcon({
  name,
  className,
}: {
  name?: string | null
  className?: string
}) {
  if (!name) return null
  const Icon = (CATEGORY_ICONS as Record<string, LucideIcon | undefined>)[name]
  if (!Icon) return null
  return <Icon className={className} aria-hidden="true" />
}
