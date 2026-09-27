CREATE INDEX IF NOT EXISTS idx_expenses_group_date_active
    ON expenses (group_id, expense_date) WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_expenses_group_paid_active
    ON expenses (group_id, paid_by, expense_date) WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_expenses_group_category_active
    ON expenses (group_id, category_id, expense_date) WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_expenses_group_amount_active
    ON expenses (group_id, expense_date, amount) WHERE is_archived = FALSE;
