-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE LOWER(email) = LOWER($1);

-- name: CreateUser :one
INSERT INTO users (
    email,
    first_name,
    last_name,
    avatar_url,
    timezone,
    email_verified_at,
    last_login_mode,
    last_login_at
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8
)
RETURNING *;

-- name: UpdateUser :one
UPDATE users SET
    first_name = COALESCE(sqlc.narg(first_name), first_name),
    last_name = COALESCE(sqlc.narg(last_name), last_name),
    avatar_url = COALESCE(sqlc.narg(avatar_url), avatar_url),
    timezone = COALESCE(sqlc.narg(timezone), timezone),
    email_verified_at = COALESCE(sqlc.narg(email_verified_at), email_verified_at),
    last_login_mode = COALESCE(sqlc.narg(last_login_mode), last_login_mode),
    last_login_at = COALESCE(sqlc.narg(last_login_at), last_login_at),
    is_active = COALESCE(sqlc.narg(is_active), is_active)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: UpdateUserLastLogin :one
UPDATE users SET
    last_login_mode = $2,
    last_login_at = NOW()
WHERE id = $1
RETURNING *;

-- name: VerifyUserEmail :one
UPDATE users SET
    email_verified_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeactivateUser :exec
UPDATE users SET is_active = FALSE WHERE id = $1;

-- name: ActivateUser :exec
UPDATE users SET is_active = TRUE WHERE id = $1;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;
