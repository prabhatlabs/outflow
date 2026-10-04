-- name: GetExpenseByID :one
SELECT * FROM expenses WHERE id = $1;

-- name: ListExpensesByGroupID :many
SELECT * FROM expenses
WHERE group_id = $1 AND is_archived = FALSE
ORDER BY expense_date DESC, created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListExpensesByGroupAndCategory :many
SELECT * FROM expenses
WHERE group_id = $1 AND category_id = $2 AND is_archived = FALSE
ORDER BY expense_date DESC, created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListExpensesByPaidBy :many
SELECT * FROM expenses
WHERE paid_by = $1 AND is_archived = FALSE
ORDER BY expense_date DESC, created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateExpense :one
INSERT INTO expenses (
    group_id,
    created_by,
    paid_by,
    category_id,
    amount,
    description,
    note,
    split_type,
    expense_date
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9
)
RETURNING *;

-- name: UpdateExpense :one
UPDATE expenses SET
    paid_by = COALESCE(sqlc.narg(paid_by), paid_by),
    category_id = COALESCE(sqlc.narg(category_id), category_id),
    amount = COALESCE(sqlc.narg(amount), amount),
    description = COALESCE(sqlc.narg(description), description),
    note = COALESCE(sqlc.narg(note), note),
    split_type = COALESCE(sqlc.narg(split_type), split_type),
    expense_date = COALESCE(sqlc.narg(expense_date), expense_date)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: UpdateExpenseSplitsCount :one
UPDATE expenses SET splits_count = sqlc.arg(splits_count) WHERE id = sqlc.arg(id) RETURNING splits_count;

-- name: CountExpensesByGroupFilteredActive :one
SELECT COUNT(*)::bigint FROM expenses
WHERE group_id = sqlc.arg(group_id) AND is_archived = FALSE
  AND (sqlc.narg(category_id)::uuid IS NULL OR category_id = sqlc.narg(category_id))
  AND (sqlc.narg(paid_by)::uuid IS NULL OR paid_by = sqlc.narg(paid_by))
  AND (sqlc.narg(from_date)::date IS NULL OR expense_date >= sqlc.narg(from_date))
  AND (sqlc.narg(to_date)::date IS NULL OR expense_date <= sqlc.narg(to_date));

-- name: GetExpenseByIDForUpdate :one
SELECT * FROM expenses WHERE id = $1 FOR UPDATE;

-- name: ArchiveExpense :one
UPDATE expenses SET
    is_archived = TRUE,
    archived_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UnarchiveExpense :one
UPDATE expenses SET
    is_archived = FALSE,
    archived_at = NULL
WHERE id = $1
RETURNING *;

-- name: DeleteExpense :exec
DELETE FROM expenses WHERE id = $1;
