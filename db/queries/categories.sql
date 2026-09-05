-- name: GetCategoryByID :one
SELECT * FROM categories WHERE id = $1;

-- name: GetCategoryByNameAndGroup :one
SELECT * FROM categories WHERE name = $1 AND group_id = $2;

-- name: ListCategoriesByGroupID :many
SELECT * FROM categories WHERE group_id = $1 ORDER BY name ASC;

-- name: CreateCategory :one
INSERT INTO categories (
    group_id,
    created_by,
    name,
    icon,
    color
) VALUES (
    $1,
    $2,
    $3,
    $4,
    $5
)
RETURNING *;

-- name: UpdateCategory :one
UPDATE categories SET
    name = COALESCE(sqlc.narg(name), name),
    icon = COALESCE(sqlc.narg(icon), icon),
    color = COALESCE(sqlc.narg(color), color)
WHERE id = sqlc.arg(id)
RETURNING *;

-- name: DeleteCategory :exec
DELETE FROM categories WHERE id = $1;
