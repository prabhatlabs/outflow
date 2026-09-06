-- name: ListExpensesByGroupFiltered :many
SELECT * FROM expenses
WHERE group_id = sqlc.arg(group_id)
  AND (sqlc.narg(category_id)::uuid IS NULL OR category_id = sqlc.narg(category_id))
  AND (sqlc.narg(paid_by)::uuid IS NULL OR paid_by = sqlc.narg(paid_by))
  AND (sqlc.narg(from_date)::date IS NULL OR expense_date >= sqlc.narg(from_date))
  AND (sqlc.narg(to_date)::date IS NULL OR expense_date <= sqlc.narg(to_date))
  AND (sqlc.narg(include_archived)::bool OR is_archived = FALSE)
ORDER BY expense_date DESC, created_at DESC;
