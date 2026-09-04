-- name: GetUserWithEmail :one
SELECT * FROM users WHERE email = $1;

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
