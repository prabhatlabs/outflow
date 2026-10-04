-- name: ListGroupBalances :many
-- Legacy N×4 correlated variant (kept). Prefer Agg below.
SELECT
    gm.user_id,
    u.first_name,
    u.last_name,
    COALESCE((
        SELECT SUM(es.amount_owed)
        FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        WHERE e.group_id = gm.group_id AND es.user_id = gm.user_id AND e.is_archived = FALSE
    ), 0)::DECIMAL(14,2) AS owed,
    COALESCE((
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.group_id = gm.group_id AND e.paid_by = gm.user_id AND e.is_archived = FALSE
    ), 0)::DECIMAL(14,2) AS paid,
    COALESCE((
        SELECT SUM(s.amount)
        FROM settlements s
        WHERE s.group_id = gm.group_id AND s.to_user_id = gm.user_id
    ), 0)::DECIMAL(14,2) AS settled_to,
    COALESCE((
        SELECT SUM(s.amount)
        FROM settlements s
        WHERE s.group_id = gm.group_id AND s.from_user_id = gm.user_id
    ), 0)::DECIMAL(14,2) AS settled_from
FROM group_members gm
JOIN users u ON u.id = gm.user_id
WHERE gm.group_id = $1 AND gm.status = 'active'
ORDER BY u.first_name ASC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);

-- name: ListGroupBalancesAgg :many
SELECT
    gm.user_id,
    u.first_name,
    u.last_name,
    COALESCE(owed_agg.owed, 0)::DECIMAL(14,2) AS owed,
    COALESCE(paid_agg.paid, 0)::DECIMAL(14,2) AS paid,
    COALESCE(st_agg.settled_to, 0)::DECIMAL(14,2) AS settled_to,
    COALESCE(sf_agg.settled_from, 0)::DECIMAL(14,2) AS settled_from
FROM group_members gm
JOIN users u ON u.id = gm.user_id
LEFT JOIN (
    SELECT es.user_id, SUM(es.amount_owed)::DECIMAL(14,2) AS owed
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id = sqlc.arg(group_id) AND e.is_archived = FALSE
    GROUP BY es.user_id
) owed_agg ON owed_agg.user_id = gm.user_id
LEFT JOIN (
    SELECT e.paid_by, SUM(e.amount)::DECIMAL(14,2) AS paid
    FROM expenses e
    WHERE e.group_id = sqlc.arg(group_id) AND e.is_archived = FALSE
    GROUP BY e.paid_by
) paid_agg ON paid_agg.paid_by = gm.user_id
LEFT JOIN (
    SELECT s.to_user_id, SUM(s.amount)::DECIMAL(14,2) AS settled_to
    FROM settlements s WHERE s.group_id = sqlc.arg(group_id) GROUP BY s.to_user_id
) st_agg ON st_agg.to_user_id = gm.user_id
LEFT JOIN (
    SELECT s.from_user_id, SUM(s.amount)::DECIMAL(14,2) AS settled_from
    FROM settlements s WHERE s.group_id = sqlc.arg(group_id) GROUP BY s.from_user_id
) sf_agg ON sf_agg.from_user_id = gm.user_id
WHERE gm.group_id = sqlc.arg(group_id) AND gm.status = 'active'
ORDER BY u.first_name ASC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);
