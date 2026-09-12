import { cn } from "cn"
import { CategoryColor } from "./CategoryColor"
import { CategoryIcon } from "./CategoryIcon"

export function CategoryVisual({
  icon,
  color,
  className,
}: {
  icon?: string | null
  color?: string | null
  className?: string
}) {
  if (icon && color) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-white",
          className,
        )}
        style={{ backgroundColor: color }}
      >
        <CategoryIcon name={icon} className="size-4" />
      </span>
    )
  }
  if (color) return <CategoryColor value={color} className={className} />
  if (icon) return <CategoryIcon name={icon} className={className} />
  return null
}
