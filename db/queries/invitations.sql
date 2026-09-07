-- name: GetInvitationByID :one
SELECT * FROM invitations WHERE id = $1;

-- name: GetInvitationByTokenHash :one
SELECT * FROM invitations WHERE token_hash = $1;

-- name: ListInvitationsByGroupID :many
SELECT * FROM invitations WHERE group_id = $1 ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListPendingInvitationsByEmail :many
SELECT * FROM invitations
WHERE LOWER(email) = LOWER($1) AND status = 'pending'
ORDER BY created_at DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: CreateInvitation :one
INSERT INTO invitations (
    group_id,
    invited_by,
    email,
    token_hash,
    expires_at
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING *;

-- name: AcceptInvitation :one
UPDATE invitations SET
    status = 'accepted',
    accepted_at = NOW()
WHERE id = $1
RETURNING *;

-- name: RejectInvitation :one
UPDATE invitations SET
    status = 'rejected',
    rejected_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CancelInvitation :one
UPDATE invitations SET
    status = 'cancelled'
WHERE id = $1
RETURNING *;

-- name: ExpireOverdueInvitations :exec
UPDATE invitations SET
    status = 'expired'
WHERE status = 'pending' AND expires_at < NOW();

-- name: DeleteInvitation :exec
DELETE FROM invitations WHERE id = $1;
