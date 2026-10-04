-- name: GetDashboardPaidStats :one
SELECT
    COUNT(*)::bigint AS expense_count,
    COALESCE(SUM(e.amount), 0)::decimal(14,2) AS total_amount
FROM expenses e
JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
WHERE e.paid_by = sqlc.arg(user_id)
  AND e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE;

-- name: GetDashboardOwedStats :one
SELECT
    COALESCE(SUM(es.amount_owed), 0)::decimal(14,2) AS total_owed,
    COUNT(DISTINCT e.id)::bigint AS expense_count
FROM expense_splits es
JOIN expenses e ON e.id = es.expense_id
JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
WHERE es.user_id = sqlc.arg(user_id)
  AND e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE;

-- name: GetDashboardExpenseCount :one
SELECT COUNT(*)::bigint AS expense_count FROM (
    SELECT e.id FROM expenses e
    JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
    WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
      AND e.is_archived = FALSE AND e.paid_by = sqlc.arg(user_id)
    UNION
    SELECT e.id FROM expenses e
    JOIN expense_splits es2 ON es2.expense_id = e.id AND es2.user_id = sqlc.arg(user_id)
    JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
    WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
      AND e.is_archived = FALSE
) u;

-- name: GetDashboardByCategory :many
SELECT
    c.id AS category_id,
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon,
    COUNT(DISTINCT e.id)::bigint AS expense_count,
    COALESCE(SUM(e.amount), 0)::decimal(14,2) AS total_amount
FROM expenses e
LEFT JOIN categories c ON c.id = e.category_id
JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND (e.paid_by = sqlc.arg(user_id) OR EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = sqlc.arg(user_id)))
GROUP BY c.id, c.name, c.color, c.icon
ORDER BY total_amount DESC;

-- name: GetDashboardByGroup :many
SELECT
    g.id AS group_id,
    g.name AS group_name,
    g.default_currency AS group_currency,
    COUNT(DISTINCT e.id)::bigint AS expense_count,
    COALESCE(SUM(e.amount), 0)::decimal(14,2) AS total_amount
FROM expenses e
JOIN groups g ON g.id = e.group_id
JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND (e.paid_by = sqlc.arg(user_id) OR EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = sqlc.arg(user_id)))
GROUP BY g.id, g.name, g.default_currency
ORDER BY total_amount DESC;

-- name: GetDashboardByCurrency :many
SELECT
    g.default_currency AS currency,
    COUNT(DISTINCT e.id)::bigint AS expense_count,
    COALESCE(SUM(e.amount), 0)::decimal(14,2) AS total_amount
FROM expenses e
JOIN groups g ON g.id = e.group_id
JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND (e.paid_by = sqlc.arg(user_id) OR EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = sqlc.arg(user_id)))
GROUP BY g.default_currency
ORDER BY total_amount DESC;

-- name: GetDashboardDaily :many
SELECT
    e.expense_date AS expense_date,
    COUNT(DISTINCT e.id)::bigint AS expense_count,
    COALESCE(SUM(e.amount), 0)::decimal(14,2) AS total_amount
FROM expenses e
JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND (e.paid_by = sqlc.arg(user_id) OR EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = sqlc.arg(user_id)))
GROUP BY e.expense_date
ORDER BY e.expense_date ASC;

-- name: GetDashboardRecent :many
SELECT e.*, g.name AS group_name
FROM expenses e
JOIN groups g ON g.id = e.group_id
JOIN group_members gm ON gm.group_id = e.group_id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND (e.paid_by = sqlc.arg(user_id) OR EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = sqlc.arg(user_id)))
ORDER BY e.expense_date DESC, e.created_at DESC
LIMIT 10;

-- name: GetDashboardSettlementStats :one
SELECT
    COUNT(*)::bigint AS settlement_count,
    COALESCE(SUM(amount), 0)::decimal(14,2) AS settlement_amount
FROM settlements
WHERE (from_user_id = sqlc.arg(user_id) OR to_user_id = sqlc.arg(user_id))
  AND settlement_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND group_id IN (SELECT group_id FROM group_members WHERE group_members.user_id = sqlc.arg(user_id) AND status = 'active');

-- name: GetDashboardSettlementStatsUnion :one
SELECT COUNT(*)::bigint AS settlement_count, COALESCE(SUM(u.amount),0)::decimal(14,2) AS settlement_amount FROM (
    SELECT s.amount FROM settlements s WHERE s.from_user_id = sqlc.arg(user_id) AND s.settlement_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date) AND s.group_id IN (SELECT group_id FROM group_members WHERE user_id = sqlc.arg(user_id) AND status = 'active')
    UNION ALL
    SELECT s.amount FROM settlements s WHERE s.to_user_id = sqlc.arg(user_id) AND s.settlement_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date) AND s.group_id IN (SELECT group_id FROM group_members WHERE user_id = sqlc.arg(user_id) AND status = 'active')
) u;

-- name: GetDashboardActiveGroupCount :one
SELECT COUNT(*)::bigint AS active_group_count
FROM group_members
WHERE user_id = sqlc.arg(user_id) AND status = 'active';

-- name: GetDashboardBalancesSummary :many
SELECT
    g.id AS group_id,
    g.name AS group_name,
    COALESCE(paid_agg.paid, 0)::decimal(14,2) AS paid,
    COALESCE(owed_agg.owed, 0)::decimal(14,2) AS owed,
    COALESCE(st_agg.settled_to, 0)::decimal(14,2) AS settled_to,
    COALESCE(sf_agg.settled_from, 0)::decimal(14,2) AS settled_from
FROM groups g
JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
LEFT JOIN (
    SELECT e.group_id, SUM(e.amount)::decimal(14,2) AS paid FROM expenses e
    WHERE e.paid_by = sqlc.arg(user_id) AND e.is_archived = FALSE GROUP BY e.group_id
) paid_agg ON paid_agg.group_id = g.id
LEFT JOIN (
    SELECT e.group_id, SUM(es.amount_owed)::decimal(14,2) AS owed FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = sqlc.arg(user_id) AND e.is_archived = FALSE GROUP BY e.group_id
) owed_agg ON owed_agg.group_id = g.id
LEFT JOIN (
    SELECT s.group_id, SUM(s.amount)::decimal(14,2) AS settled_to FROM settlements s
    WHERE s.to_user_id = sqlc.arg(user_id) GROUP BY s.group_id
) st_agg ON st_agg.group_id = g.id
LEFT JOIN (
    SELECT s.group_id, SUM(s.amount)::decimal(14,2) AS settled_from FROM settlements s
    WHERE s.from_user_id = sqlc.arg(user_id) GROUP BY s.group_id
) sf_agg ON sf_agg.group_id = g.id
ORDER BY g.name ASC;
