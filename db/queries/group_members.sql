-- name: GetGroupMemberByID :one
SELECT * FROM group_members WHERE id = $1;

-- name: GetGroupMemberByUserAndGroup :one
SELECT * FROM group_members WHERE user_id = $1 AND group_id = $2;

-- name: ListGroupMembersByGroupID :many
SELECT * FROM group_members WHERE group_id = $1 ORDER BY created_at ASC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListGroupMembersByGroupAndStatus :many
SELECT * FROM group_members WHERE group_id = $1 AND status = $2 ORDER BY created_at ASC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateGroupMember :one
INSERT INTO group_members (
    user_id,
    group_id,
    role,
    status,
    invited_by
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING *;

-- name: UpdateGroupMemberRole :one
UPDATE group_members SET
    role = $2
WHERE id = $1
RETURNING *;

-- name: ActivateGroupMember :one
UPDATE group_members SET
    status = 'active',
    joined_at = NOW()
WHERE id = $1
RETURNING *;

-- name: LeaveGroupMember :one
UPDATE group_members SET
    status = 'left',
    left_at = NOW()
WHERE id = $1
RETURNING *;

-- name: RemoveGroupMember :one
UPDATE group_members SET
    status = 'removed',
    left_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteGroupMember :exec
DELETE FROM group_members WHERE id = $1;
