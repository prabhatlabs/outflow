-- name: ListGroupMembersWithUser :many
SELECT
    gm.id,
    gm.user_id,
    gm.group_id,
    gm.role,
    gm.status,
    gm.invited_by,
    gm.joined_at,
    gm.left_at,
    gm.created_at,
    gm.updated_at,
    u.first_name,
    u.last_name,
    u.email,
    u.avatar_url
FROM group_members gm
JOIN users u ON u.id = gm.user_id
WHERE gm.group_id = $1
ORDER BY gm.created_at ASC;
