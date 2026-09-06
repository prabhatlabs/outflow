-- name: CreateEmailLoginCode :one
-- Inserts a new code, or rotates an existing one only if it already expired.
-- Returns no row (pgx.ErrNoRows) when an unexpired code is still on file.
INSERT INTO email_login_codes (
    email,
    expires_at
) VALUES (
    $1,
    $2
)
ON CONFLICT (email) DO UPDATE
SET expires_at = EXCLUDED.expires_at
WHERE email_login_codes.expires_at <= CURRENT_TIMESTAMP
RETURNING *;

-- name: ConsumeEmailLoginCode :one
DELETE FROM email_login_codes
WHERE id = $1 AND expires_at > CURRENT_TIMESTAMP
RETURNING email;
