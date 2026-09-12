import { cn } from "cn"

export function CategoryColor({
  value,
  className,
}: {
  value?: string | null
  className?: string
}) {
  if (!value) return null
  return (
    <span
      aria-hidden="true"
      className={cn("size-4 shrink-0 rounded-full", className)}
      style={{ backgroundColor: value }}
    />
  )
}
