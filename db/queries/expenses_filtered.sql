-- name: ListExpensesByGroupFiltered :many
-- Legacy generic filter (kept for include_archived=true path). Prefer the
-- Active variant below for the common is_archived=FALSE case which can use
-- partial indexes (see 000005_overview_indexes).
SELECT * FROM expenses
WHERE group_id = sqlc.arg(group_id)
  AND (sqlc.narg(category_id)::uuid IS NULL OR category_id = sqlc.narg(category_id))
  AND (sqlc.narg(paid_by)::uuid IS NULL OR paid_by = sqlc.narg(paid_by))
  AND (sqlc.narg(from_date)::date IS NULL OR expense_date >= sqlc.narg(from_date))
  AND (sqlc.narg(to_date)::date IS NULL OR expense_date <= sqlc.narg(to_date))
  AND (sqlc.narg(include_archived)::bool OR is_archived = FALSE)
ORDER BY expense_date DESC, created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListExpensesByGroupFilteredActive :many
-- Hot path: is_archived hard-coded to FALSE so the partial indexes
-- idx_expenses_group_*_active (000005) apply. Caller should branch to this
-- when include_archived is false (the common case).
SELECT * FROM expenses
WHERE group_id = sqlc.arg(group_id)
  AND is_archived = FALSE
  AND (sqlc.narg(category_id)::uuid IS NULL OR category_id = sqlc.narg(category_id))
  AND (sqlc.narg(paid_by)::uuid IS NULL OR paid_by = sqlc.narg(paid_by))
  AND (sqlc.narg(from_date)::date IS NULL OR expense_date >= sqlc.narg(from_date))
  AND (sqlc.narg(to_date)::date IS NULL OR expense_date <= sqlc.narg(to_date))
ORDER BY expense_date DESC, created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);
