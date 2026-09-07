-- name: GetExpenseSplitByID :one
SELECT * FROM expense_splits WHERE id = $1;

-- name: GetExpenseSplitByExpenseAndUser :one
SELECT * FROM expense_splits WHERE expense_id = $1 AND user_id = $2;

-- name: ListExpenseSplitsByExpenseID :many
SELECT * FROM expense_splits WHERE expense_id = $1 ORDER BY created_at ASC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListExpenseSplitsByUserID :many
SELECT * FROM expense_splits WHERE user_id = $1 ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateExpenseSplit :one
INSERT INTO expense_splits (
    expense_id,
    user_id,
    amount_owed,
    percentage,
    shares
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING *;

-- name: UpdateExpenseSplit :one
UPDATE expense_splits SET
    amount_owed = COALESCE(sqlc.narg(amount_owed), amount_owed),
    percentage = COALESCE(sqlc.narg(percentage), percentage),
    shares = COALESCE(sqlc.narg(shares), shares)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: DeleteExpenseSplit :exec
DELETE FROM expense_splits WHERE id = $1;

-- name: DeleteExpenseSplitsByExpenseID :exec
DELETE FROM expense_splits WHERE expense_id = $1;
