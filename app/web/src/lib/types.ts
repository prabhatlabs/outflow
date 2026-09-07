export type LoginProvider = "email" | "google" | ""

export type LastLoginMode = {
  login_provider: LoginProvider
  valid: boolean
}

export type User = {
  id: string
  email: string
  first_name: string
  last_name: string | null
  avatar_url: string | null
  is_active: boolean
  timezone: string
  email_verified_at: string | null
  last_login_mode: LastLoginMode
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type GroupType =
  | "household"
  | "trip"
  | "roommates"
  | "couple"
  | "project"
  | "other"

export type Group = {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  type: GroupType
  default_currency: string
  created_by: string
  is_archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type Category = {
  id: string
  group_id: string
  created_by: string
  name: string
  icon: string | null
  color: string
  created_at: string
  updated_at: string
}

export type SplitType = "equal" | "percentage" | "exact" | "shares"

export type Expense = {
  id: string
  group_id: string
  created_by: string
  paid_by: string
  category_id: string | null
  amount: number
  description: string | null
  note: string | null
  split_type: SplitType
  is_archived: boolean
  archived_at: string | null
  expense_date: string
  created_at: string
  updated_at: string
}

export type ExpenseSplit = {
  id: string
  expense_id: string
  user_id: string
  amount_owed: number
  percentage: number | null
  shares: number | null
  created_at: string
  updated_at: string
}

export type ExpenseWithSplits = Expense & { splits: ExpenseSplit[] }

export type ExpenseSplitInput = {
  user_id: string
  amount_owed?: number
  percentage?: number
  shares?: number
}

export type CreateExpenseInput = {
  paid_by?: string
  category_id?: string | null
  amount: number
  description?: string
  note?: string
  split_type: SplitType
  expense_date?: string
  splits: ExpenseSplitInput[]
}

export type EditExpenseInput = Partial<
  Omit<CreateExpenseInput, "splits">
> & { splits?: ExpenseSplitInput[] }

export type ExpenseFilters = {
  category_id?: string
  paid_by?: string
  from?: string
  to?: string
  include_archived?: boolean
}

export type PaymentMethod =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "card"
  | "other"

export type Settlement = {
  id: string
  group_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  payment_method: PaymentMethod
  note: string | null
  settlement_date: string
  created_at: string
  updated_at: string
}

export type SettlementSplit = {
  id: string
  settlement_id: string
  expense_split_id: string
  created_at: string
}

export type SettlementWithSplits = Settlement & { splits: SettlementSplit[] }

export type CreateSettlementInput = {
  from_user_id: string
  to_user_id: string
  amount: number
  payment_method: PaymentMethod
  note?: string
  settlement_date?: string
  expense_split_ids?: string[]
}

export type BalanceRow = {
  user_id: string
  first_name: string
  last_name: string | null
  paid: number
  owed: number
  settled: number
  net: number
}

export type BudgetPeriod = "weekly" | "monthly" | "yearly" | "custom"

export type GroupBudget = {
  id: string
  group_id: string
  amount_limit: number
  period: BudgetPeriod
  start_date: string
  end_date: string | null
  alert_threshold: number
  created_at: string
  updated_at: string
}

export type PersonalBudget = {
  id: string
  user_id: string
  amount_limit: number
  period: BudgetPeriod
  start_date: string
  end_date: string | null
  alert_threshold: number
  created_at: string
  updated_at: string
}

export type CreateBudgetInput = {
  amount_limit: number
  period: BudgetPeriod
  start_date?: string
  end_date?: string | null
  alert_threshold?: number
}

export type EditBudgetInput = Partial<CreateBudgetInput>

export type GroupMemberRole = "owner" | "admin" | "member"
export type GroupMemberStatus = "invited" | "active" | "left" | "removed"

export type GroupMember = {
  id: string
  user_id: string
  group_id: string
  role: GroupMemberRole
  status: GroupMemberStatus
  invited_by: string | null
  joined_at: string | null
  left_at: string | null
  created_at: string
  updated_at: string
}

export type GroupMemberWithUser = GroupMember & {
  first_name: string
  last_name: string | null
  email: string
  avatar_url: string | null
}

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled"

export type Invitation = {
  id: string
  group_id: string
  invited_by: string
  email: string
  token_hash: string
  status: InvitationStatus
  expires_at: string
  accepted_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
}
