import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/lib/types";
import { cn } from "cn";
import { CategoryVisual } from "./CategoryVisual";

const NONE_VALUE = "__none__";

type Props = {
  id?: string;
  value: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  className?: string;
};

export function CategoryPicker({
  id,
  value,
  onChange,
  categories,
  placeholder = "Select category",
  allowNone = true,
  noneLabel = "No category",
  className,
}: Props) {
  const selected = categories.find((c) => c.id === value) ?? null;

  return (
    <Select
      value={value === "" ? NONE_VALUE : value}
      onValueChange={(v) => onChange(v === NONE_VALUE ? "" : (v ?? ""))}
    >
      <SelectTrigger id={id} className={cn("w-full", className)}>
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <CategoryVisual
              icon={selected.icon}
              color={selected.color}
              className="size-5 [&_svg]:size-3"
            />
            <span className="truncate">{selected.name}</span>
          </span>
        ) : selected === null ? (
          <span>{noneLabel}</span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem>}
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <CategoryVisual
              icon={c.icon}
              color={c.color}
              className="size-5 [&_svg]:size-3"
            />
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
