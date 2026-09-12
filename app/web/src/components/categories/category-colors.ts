export const CATEGORY_COLORS = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  green: "#22c55e",
  teal: "#14b8b6",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  pink: "#ec4899",
} satisfies Record<string, string>

export type CategoryColorName = keyof typeof CATEGORY_COLORS

export const CATEGORY_COLOR_NAMES = Object.keys(
  CATEGORY_COLORS,
) as CategoryColorName[]

export function getCategoryColorName(
  value: string,
): CategoryColorName | null {
  const hex = value.trim().toLowerCase()
  const found = (Object.keys(CATEGORY_COLORS) as CategoryColorName[]).find(
    (name) => CATEGORY_COLORS[name].toLowerCase() === hex,
  )
  return found ?? null
}
