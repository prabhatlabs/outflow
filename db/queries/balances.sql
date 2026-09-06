-- name: ListGroupBalances :many
-- Net balance per active member:
--   owed    = sum of their expense_splits.amount_owed
--   paid    = sum of expenses they paid for
--   settled = net settlements (received - sent)
--   net     = owed - paid - settled... computed in Go; here raw components
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
ORDER BY u.first_name ASC;
