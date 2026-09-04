-- Drop Triggers
DROP TRIGGER IF EXISTS set_users_updated_at ON users;
DROP TRIGGER IF EXISTS set_auths_updated_at ON auths;
DROP TRIGGER IF EXISTS set_groups_updated_at ON groups;
DROP TRIGGER IF EXISTS set_group_members_updated_at ON group_members;
DROP TRIGGER IF EXISTS set_invitations_updated_at ON invitations;
DROP TRIGGER IF EXISTS set_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS set_expenses_updated_at ON expenses;
DROP TRIGGER IF EXISTS set_expense_splits_updated_at ON expense_splits;
DROP TRIGGER IF EXISTS set_settlements_updated_at ON settlements;
DROP TRIGGER IF EXISTS set_group_budgets_updated_at ON group_budgets;
DROP TRIGGER IF EXISTS set_personal_budgets_updated_at ON personal_budgets;

-- Drop Indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_id;
DROP INDEX IF EXISTS idx_groups_created_by;
DROP INDEX IF EXISTS idx_group_members_user_id;
DROP INDEX IF EXISTS idx_group_members_group_id;
DROP INDEX IF EXISTS idx_invitations_group_id;
DROP INDEX IF EXISTS idx_invitations_group_email;
DROP INDEX IF EXISTS idx_invitations_token_hash;
DROP INDEX IF EXISTS idx_categories_group_id;
DROP INDEX IF EXISTS idx_expenses_group_date;
DROP INDEX IF EXISTS idx_expenses_group_category;
DROP INDEX IF EXISTS idx_expenses_group_created_by;
DROP INDEX IF EXISTS idx_expenses_group_paid_by;
DROP INDEX IF EXISTS idx_expense_splits_expense_id;
DROP INDEX IF EXISTS idx_expense_splits_user_id;
DROP INDEX IF EXISTS idx_settlements_group_date;
DROP INDEX IF EXISTS idx_settlements_group_from;
DROP INDEX IF EXISTS idx_settlements_group_to;
DROP INDEX IF EXISTS idx_settlement_splits_settlement_id;
DROP INDEX IF EXISTS idx_settlement_splits_expense_split_id;
DROP INDEX IF EXISTS idx_group_budgets_group_id;
DROP INDEX IF EXISTS idx_personal_budgets_user_id;

-- Drop Tables (reverse dependency order)
DROP TABLE IF EXISTS personal_budgets;
DROP TABLE IF EXISTS group_budgets;
DROP TABLE IF EXISTS settlement_splits;
DROP TABLE IF EXISTS settlements;
DROP TABLE IF EXISTS expense_splits;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS auths;
DROP TABLE IF EXISTS users;

-- Drop Enums
DROP TYPE IF EXISTS budget_period;
DROP TYPE IF EXISTS payment_method;
DROP TYPE IF EXISTS split_type;
DROP TYPE IF EXISTS invitation_status;
DROP TYPE IF EXISTS group_member_status;
DROP TYPE IF EXISTS group_member_role;
DROP TYPE IF EXISTS group_type;
DROP TYPE IF EXISTS login_provider;

-- Drop Function
DROP FUNCTION IF EXISTS update_updated_at_column();
