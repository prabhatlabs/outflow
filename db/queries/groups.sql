-- name: GetGroupByID :one
SELECT * FROM groups WHERE id = $1;

-- name: ListGroupsByUserID :many
SELECT g.* FROM groups g
INNER JOIN group_members gm ON gm.group_id = g.id
WHERE gm.user_id = $1 AND gm.status = 'active'
ORDER BY g.created_at DESC;

-- name: CreateGroup :one
INSERT INTO groups (
    name,
    description,
    avatar_url,
    type,
    default_currency,
    created_by
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
)
RETURNING *;

-- name: UpdateGroup :one
UPDATE groups SET
    name = COALESCE(sqlc.narg(name), name),
    description = COALESCE(sqlc.narg(description), description),
    avatar_url = COALESCE(sqlc.narg(avatar_url), avatar_url),
    type = COALESCE(sqlc.narg(type), type),
    default_currency = COALESCE(sqlc.narg(default_currency), default_currency)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: ArchiveGroup :one
UPDATE groups SET
    is_archived = TRUE,
    archived_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UnarchiveGroup :one
UPDATE groups SET
    is_archived = FALSE,
    archived_at = NULL
WHERE id = $1
RETURNING *;

-- name: DeleteGroup :exec
DELETE FROM groups WHERE id = $1;
