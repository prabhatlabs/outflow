-- name: GetSettlementByID :one
SELECT * FROM settlements WHERE id = $1;

-- name: ListSettlementsByGroupID :many
SELECT * FROM settlements
WHERE group_id = $1
ORDER BY settlement_date DESC, created_at DESC;

-- name: ListSettlementsByGroupAndUser :many
SELECT * FROM settlements
WHERE group_id = $1 AND (from_user_id = $2 OR to_user_id = $2)
ORDER BY settlement_date DESC, created_at DESC;

-- name: CreateSettlement :one
INSERT INTO settlements (
    group_id,
    from_user_id,
    to_user_id,
    amount,
    payment_method,
    note,
    settlement_date
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7
)
RETURNING *;

-- name: UpdateSettlement :one
UPDATE settlements SET
    amount = COALESCE(sqlc.narg(amount), amount),
    payment_method = COALESCE(sqlc.narg(payment_method), payment_method),
    note = COALESCE(sqlc.narg(note), note),
    settlement_date = COALESCE(sqlc.narg(settlement_date), settlement_date)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: DeleteSettlement :exec
DELETE FROM settlements WHERE id = $1;
