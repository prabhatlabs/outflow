import type { BudgetPeriod } from "./types"

export const BUDGET_PERIODS: BudgetPeriod[] = [
  "weekly",
  "monthly",
  "yearly",
  "custom",
]

export function validateBudgetInput(params: {
  amount: string
  period: BudgetPeriod
  endDate: string
}): string | null {
  const parsed = Number(params.amount)
  if (!Number.isFinite(parsed) || parsed <= 0)
    return "Amount must be a positive number"
  if (params.period === "custom" && !params.endDate)
    return "Custom period requires an end date"
  return null
}
