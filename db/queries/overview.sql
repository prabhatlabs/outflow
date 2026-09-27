-- name: GetOverviewStats :one
SELECT
    COUNT(*)::bigint AS expense_count,
    COALESCE(SUM(amount), 0)::decimal(14,2) AS total_amount
FROM expenses
WHERE group_id = $1
  AND expense_date BETWEEN $2 AND $3
  AND is_archived = FALSE;

-- name: GetOverviewByCategory :many
SELECT
    c.id AS category_id,
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon,
    COUNT(e.id)::bigint AS expense_count,
    COALESCE(SUM(e.amount), 0)::decimal(14,2) AS total_amount
FROM expenses e
LEFT JOIN categories c ON c.id = e.category_id
WHERE e.group_id = $1
  AND e.expense_date BETWEEN $2 AND $3
  AND e.is_archived = FALSE
GROUP BY c.id, c.name, c.color, c.icon
ORDER BY total_amount DESC;

-- name: GetOverviewByMemberPaid :many
SELECT
    u.id AS user_id,
    u.first_name AS first_name,
    u.last_name AS last_name,
    COUNT(e.id)::bigint AS expense_count,
    COALESCE(SUM(e.amount), 0)::decimal(14,2) AS total_amount
FROM expenses e
JOIN users u ON u.id = e.paid_by
WHERE e.group_id = $1
  AND e.expense_date BETWEEN $2 AND $3
  AND e.is_archived = FALSE
GROUP BY u.id, u.first_name, u.last_name
ORDER BY total_amount DESC;

-- name: GetOverviewByMemberOwed :many
SELECT
    u.id AS user_id,
    u.first_name AS first_name,
    u.last_name AS last_name,
    COALESCE(SUM(es.amount_owed), 0)::decimal(14,2) AS total_owed
FROM expense_splits es
JOIN expenses e ON e.id = es.expense_id
JOIN users u ON u.id = es.user_id
WHERE e.group_id = $1
  AND e.expense_date BETWEEN $2 AND $3
  AND e.is_archived = FALSE
GROUP BY u.id, u.first_name, u.last_name
ORDER BY total_owed DESC;

-- name: GetOverviewDaily :many
SELECT
    expense_date,
    COUNT(*)::bigint AS expense_count,
    COALESCE(SUM(amount), 0)::decimal(14,2) AS total_amount
FROM expenses
WHERE group_id = $1
  AND expense_date BETWEEN $2 AND $3
  AND is_archived = FALSE
GROUP BY expense_date
ORDER BY expense_date ASC;

-- name: GetOverviewRecent :many
SELECT *
FROM expenses
WHERE group_id = $1
  AND expense_date BETWEEN $2 AND $3
  AND is_archived = FALSE
ORDER BY expense_date DESC, created_at DESC
LIMIT 10;

-- name: GetOverviewSettlementStats :one
SELECT
    COUNT(*)::bigint AS settlement_count,
    COALESCE(SUM(amount), 0)::decimal(14,2) AS settlement_amount
FROM settlements
WHERE group_id = $1
  AND settlement_date BETWEEN $2 AND $3;

-- name: GetOverviewMemberCount :one
SELECT COUNT(*)::bigint AS member_count
FROM group_members
WHERE group_id = $1
  AND status = 'active';
