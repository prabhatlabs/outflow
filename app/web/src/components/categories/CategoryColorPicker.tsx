import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, CircleX } from "lucide-react"
import { cn } from "cn"
import {
  CATEGORY_COLORS,
  CATEGORY_COLOR_NAMES,
  getCategoryColorName,
} from "./category-colors"
import { CategoryColor } from "./CategoryColor"

type Props = {
  value: string
  onChange: (color: string) => void
}

const tileClassName =
  "flex-col items-center justify-center gap-0 px-0 py-2 size-10 data-checked:bg-foreground/20 data-checked:text-foreground [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"

export function CategoryColorPicker({ value, onChange }: Props) {
  const isNone = value === ""
  const colorName = isNone ? null : getCategoryColorName(value)
  const isCustom = !isNone && colorName === null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          {isNone ? (
            <CircleX aria-hidden="true" />
          ) : (
            <CategoryColor value={value} />
          )}
          <span className="truncate">
            {isNone ? "None" : (colorName ?? value)}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-fit">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(String(next))}
          className="grid grid-cols-5 gap-1"
        >
          <DropdownMenuRadioItem
            value=""
            title="None"
            className={tileClassName}
          >
            <CircleX className="size-5" />
          </DropdownMenuRadioItem>
          {CATEGORY_COLOR_NAMES.map((name) => (
            <DropdownMenuRadioItem
              key={name}
              value={CATEGORY_COLORS[name]}
              title={name}
              className={tileClassName}
            >
              <CategoryColor value={CATEGORY_COLORS[name]} className="size-5" />
            </DropdownMenuRadioItem>
          ))}
          <label
            title="Custom"
            className={cn(
              tileClassName,
              "relative flex cursor-pointer rounded-2xl hover:bg-accent",
              isCustom && "bg-foreground/20 text-foreground",
            )}
          >
            <input
              type="color"
              aria-label="Custom color"
              value={isCustom ? value : "#3b82f6"}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="size-5 shrink-0 rounded-full ring-1 ring-foreground/20"
              style={{
                background:
                  "conic-gradient(#ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6, #ef4444)",
              }}
            />
          </label>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
