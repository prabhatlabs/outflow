CREATE INDEX IF NOT EXISTS idx_expenses_paid_date_active
    ON expenses (paid_by, expense_date) WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_settlements_from_date
    ON settlements (from_user_id, settlement_date);

CREATE INDEX IF NOT EXISTS idx_settlements_to_date
    ON settlements (to_user_id, settlement_date);
