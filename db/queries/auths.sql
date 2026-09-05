-- name: GetAuthByID :one
SELECT * FROM auths WHERE id = $1;

-- name: GetAuthByProviderAccountID :one
SELECT * FROM auths WHERE provider = $1 AND provider_account_id = $2;

-- name: GetAuthByUserAndProvider :one
SELECT * FROM auths WHERE user_id = $1 AND provider = $2;

-- name: ListAuthsByUserID :many
SELECT * FROM auths WHERE user_id = $1 ORDER BY created_at DESC;

-- name: CreateAuth :one
INSERT INTO auths (
    user_id,
    provider,
    provider_account_id
) VALUES (
    $1,
    $2,
    $3
)
RETURNING *;

-- name: DeleteAuth :exec
DELETE FROM auths WHERE id = $1;

-- name: DeleteAuthByUserAndProvider :exec
DELETE FROM auths WHERE user_id = $1 AND provider = $2;

-- name: DeleteAuthsByUserID :exec
DELETE FROM auths WHERE user_id = $1;
