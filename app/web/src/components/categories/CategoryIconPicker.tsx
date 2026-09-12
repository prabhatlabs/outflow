import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, CircleX } from "lucide-react"
import { CATEGORY_ICON_NAMES } from "./category-icons"
import { CategoryIcon } from "./CategoryIcon"

type Props = {
  value: string
  onChange: (name: string) => void
}

const tileClassName =
  "flex-col items-center justify-center gap-0 px-0 py-2 size-10 data-checked:bg-foreground/20 data-checked:text-foreground [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"

export function CategoryIconPicker({ value, onChange }: Props) {
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
          {value === "" ? (
            <CircleX aria-hidden="true" />
          ) : (
            <CategoryIcon name={value} />
          )}
          <span className="truncate">{value === "" ? "None" : value}</span>
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
          {CATEGORY_ICON_NAMES.map((name) => (
            <DropdownMenuRadioItem
              key={name}
              value={name}
              title={name}
              className={tileClassName}
            >
              <CategoryIcon name={name} className="size-5" />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
