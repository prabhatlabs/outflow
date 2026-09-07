-- name: GetGroupBudgetByID :one
SELECT * FROM group_budgets WHERE id = $1;

-- name: ListGroupBudgetsByGroupID :many
SELECT * FROM group_budgets WHERE group_id = $1 ORDER BY start_date DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateGroupBudget :one
INSERT INTO group_budgets (
    group_id,
    amount_limit,
    period,
    start_date,
    end_date,
    alert_threshold
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
)
RETURNING *;

-- name: UpdateGroupBudget :one
UPDATE group_budgets SET
    amount_limit = COALESCE(sqlc.narg(amount_limit), amount_limit),
    period = COALESCE(sqlc.narg(period), period),
    start_date = COALESCE(sqlc.narg(start_date), start_date),
    end_date = COALESCE(sqlc.narg(end_date), end_date),
    alert_threshold = COALESCE(sqlc.narg(alert_threshold), alert_threshold)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: DeleteGroupBudget :exec
DELETE FROM group_budgets WHERE id = $1;
