-- name: GetSettlementSplitByID :one
SELECT * FROM settlement_splits WHERE id = $1;

-- name: ListSettlementSplitsBySettlementID :many
SELECT * FROM settlement_splits WHERE settlement_id = $1 ORDER BY created_at ASC;

-- name: ListSettlementSplitsByExpenseSplitID :many
SELECT * FROM settlement_splits WHERE expense_split_id = $1 ORDER BY created_at ASC;

-- name: CreateSettlementSplit :one
INSERT INTO settlement_splits (
    settlement_id,
    expense_split_id
) VALUES (
    $1,
    $2
)
RETURNING *;

-- name: DeleteSettlementSplit :exec
DELETE FROM settlement_splits WHERE id = $1;

-- name: DeleteSettlementSplitsBySettlementID :exec
DELETE FROM settlement_splits WHERE settlement_id = $1;
