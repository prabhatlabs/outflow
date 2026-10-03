-- name: GetDashboardPaidStats :one
SELECT
    COUNT(*)::bigint AS expense_count,
    COALESCE(SUM(amount), 0)::decimal(14,2) AS total_amount
FROM expenses
WHERE paid_by = sqlc.arg(user_id)
  AND expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND is_archived = FALSE
  AND group_id IN (SELECT group_id FROM group_members WHERE group_members.user_id = sqlc.arg(user_id) AND status = 'active');

-- name: GetDashboardOwedStats :one
SELECT
    COALESCE(SUM(es.amount_owed), 0)::decimal(14,2) AS total_owed,
    COUNT(DISTINCT e.id)::bigint AS expense_count
FROM expense_splits es
JOIN expenses e ON e.id = es.expense_id
WHERE es.user_id = sqlc.arg(user_id)
  AND e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND e.group_id IN (SELECT group_id FROM group_members WHERE group_members.user_id = sqlc.arg(user_id) AND status = 'active');

-- name: GetDashboardExpenseCount :one
SELECT COUNT(*)::bigint AS expense_count
FROM expenses e
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND e.group_id IN (SELECT group_id FROM group_members WHERE group_members.user_id = sqlc.arg(user_id) AND status = 'active')
  AND (e.paid_by = sqlc.arg(user_id) OR EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = sqlc.arg(user_id)));

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
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND e.group_id IN (SELECT group_id FROM group_members WHERE group_members.user_id = sqlc.arg(user_id) AND status = 'active')
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
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND e.group_id IN (SELECT group_id FROM group_members WHERE group_members.user_id = sqlc.arg(user_id) AND status = 'active')
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
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND e.group_id IN (SELECT group_id FROM group_members WHERE group_members.user_id = sqlc.arg(user_id) AND status = 'active')
  AND (e.paid_by = sqlc.arg(user_id) OR EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = sqlc.arg(user_id)))
GROUP BY g.default_currency
ORDER BY total_amount DESC;

-- name: GetDashboardDaily :many
SELECT
    e.expense_date AS expense_date,
    COUNT(DISTINCT e.id)::bigint AS expense_count,
    COALESCE(SUM(e.amount), 0)::decimal(14,2) AS total_amount
FROM expenses e
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND e.group_id IN (SELECT group_id FROM group_members WHERE group_members.user_id = sqlc.arg(user_id) AND status = 'active')
  AND (e.paid_by = sqlc.arg(user_id) OR EXISTS (SELECT 1 FROM expense_splits es2 WHERE es2.expense_id = e.id AND es2.user_id = sqlc.arg(user_id)))
GROUP BY e.expense_date
ORDER BY e.expense_date ASC;

-- name: GetDashboardRecent :many
SELECT e.*, g.name AS group_name
FROM expenses e
JOIN groups g ON g.id = e.group_id
WHERE e.expense_date BETWEEN sqlc.arg(from_date) AND sqlc.arg(to_date)
  AND e.is_archived = FALSE
  AND e.group_id IN (SELECT group_id FROM group_members WHERE group_members.user_id = sqlc.arg(user_id) AND status = 'active')
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

-- name: GetDashboardActiveGroupCount :one
SELECT COUNT(*)::bigint AS active_group_count
FROM group_members
WHERE user_id = sqlc.arg(user_id) AND status = 'active';

-- name: GetDashboardBalancesSummary :many
SELECT
    g.id AS group_id,
    g.name AS group_name,
    COALESCE((
        SELECT SUM(e.amount) FROM expenses e
        WHERE e.group_id = g.id AND e.paid_by = sqlc.arg(user_id) AND e.is_archived = FALSE
    ), 0)::decimal(14,2) AS paid,
    COALESCE((
        SELECT SUM(es.amount_owed) FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        WHERE e.group_id = g.id AND es.user_id = sqlc.arg(user_id) AND e.is_archived = FALSE
    ), 0)::decimal(14,2) AS owed,
    COALESCE((
        SELECT SUM(s.amount) FROM settlements s
        WHERE s.group_id = g.id AND s.to_user_id = sqlc.arg(user_id)
    ), 0)::decimal(14,2) AS settled_to,
    COALESCE((
        SELECT SUM(s.amount) FROM settlements s
        WHERE s.group_id = g.id AND s.from_user_id = sqlc.arg(user_id)
    ), 0)::decimal(14,2) AS settled_from
FROM groups g
JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = sqlc.arg(user_id) AND gm.status = 'active'
ORDER BY g.name ASC;
