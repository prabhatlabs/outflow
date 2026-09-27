package groups

import (
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

type overviewPeriod string

const (
	periodToday overviewPeriod = "today"
	period7d    overviewPeriod = "7d"
	period30d   overviewPeriod = "30d"
)

func parsePeriod(raw string) (overviewPeriod, bool) {
	switch overviewPeriod(raw) {
	case periodToday, period7d, period30d:
		return overviewPeriod(raw), true
	case "":
		return period30d, true
	default:
		return "", false
	}
}

func periodBoundsInUserTZ(period overviewPeriod, loc *time.Location) (time.Time, time.Time) {
	nowLoc := time.Now().In(loc)
	todayLoc := time.Date(nowLoc.Year(), nowLoc.Month(), nowLoc.Day(), 0, 0, 0, 0, loc)
	switch period {
	case periodToday:
		return todayLoc, todayLoc
	case period7d:
		return todayLoc.AddDate(0, 0, -6), todayLoc
	default:
		return todayLoc.AddDate(0, 0, -29), todayLoc
	}
}

func numericToFloat(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, _ := n.Float64Value()
	return f.Float64
}

type overviewStats struct {
	ExpenseCount     int64   `json:"expense_count"`
	TotalAmount      float64 `json:"total_amount"`
	AvgAmount        float64 `json:"avg_amount"`
	AvgPerDay        float64 `json:"avg_per_day"`
	SettlementCount  int64   `json:"settlement_count"`
	SettlementAmount float64 `json:"settlement_amount"`
	MemberCount      int64   `json:"member_count"`
	CategoryCount    int     `json:"category_count"`
}

type categoryBreakdown struct {
	CategoryID   *string `json:"category_id"`
	CategoryName string  `json:"category_name"`
	Color        string  `json:"color"`
	Icon         *string `json:"icon"`
	Count        int64   `json:"count"`
	Total        float64 `json:"total"`
	Percentage   float64 `json:"percentage"`
}

type memberPaidBreakdown struct {
	UserID     string  `json:"user_id"`
	FirstName  string  `json:"first_name"`
	LastName   *string `json:"last_name"`
	Count      int64   `json:"count"`
	Total      float64 `json:"total"`
	Percentage float64 `json:"percentage"`
}

type memberOwedBreakdown struct {
	UserID     string  `json:"user_id"`
	FirstName  string  `json:"first_name"`
	LastName   *string `json:"last_name"`
	TotalOwed  float64 `json:"total_owed"`
	Percentage float64 `json:"percentage"`
}

type dailyPoint struct {
	Date  string  `json:"date"`
	Count int64   `json:"count"`
	Total float64 `json:"total"`
}

type overviewResponse struct {
	Period         overviewPeriod      `json:"period"`
	FromDate       string              `json:"from_date"`
	ToDate         string              `json:"to_date"`
	Timezone       string              `json:"timezone"`
	Currency       string              `json:"currency"`
	Stats          overviewStats       `json:"stats"`
	ByCategory     []categoryBreakdown `json:"by_category"`
	ByMemberPaid   []memberPaidBreakdown `json:"by_member_paid"`
	ByMemberOwed   []memberOwedBreakdown `json:"by_member_owed"`
	Daily          []dailyPoint        `json:"daily"`
	RecentExpenses []db.Expense        `json:"recent_expenses"`
	Balances       []balanceRow        `json:"balances"`
}

func (s *Service) overviewHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	if userID == uuid.Nil {
		return
	}
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	rawPeriod := r.URL.Query().Get("period")
	period, ok := parsePeriod(rawPeriod)
	if !ok {
		response.BadRequest(w, "Invalid period, must be one of: today, 7d, 30d")
		return
	}

	// User timezone for period bounds. Falls back to UTC.
	tzName := "UTC"
	loc := time.UTC
	if u, err := s.db.Q.GetUserByID(r.Context(), lib.PGUUID(userID)); err == nil && u.Timezone != "" {
		if l, err := time.LoadLocation(u.Timezone); err == nil {
			loc = l
			tzName = u.Timezone
		}
	}

	fromT, toT := periodBoundsInUserTZ(period, loc)
	fromDate := lib.Date(fromT)
	toDate := lib.Date(toT)
	fromStr := fromT.Format(time.DateOnly)
	toStr := toT.Format(time.DateOnly)

	groupPgID := lib.PGUUID(groupID)
	group, err := s.db.Q.GetGroupByID(r.Context(), groupPgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Group not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch group")
		return
	}

	// Period-filtered aggregates. Each query hits an index on (group_id, expense_date) etc.
	statsRow, err := s.db.Q.GetOverviewStats(r.Context(), db.GetOverviewStatsParams{
		GroupID:     groupPgID,
		ExpenseDate: fromDate, ExpenseDate_2: toDate,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch overview stats")
		return
	}

	settlementRow, err := s.db.Q.GetOverviewSettlementStats(r.Context(), db.GetOverviewSettlementStatsParams{
		GroupID: groupPgID, SettlementDate: fromDate, SettlementDate_2: toDate,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch settlement stats")
		return
	}

	memberCount, err := s.db.Q.GetOverviewMemberCount(r.Context(), groupPgID)
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch member count")
		return
	}

	catRows, err := s.db.Q.GetOverviewByCategory(r.Context(), db.GetOverviewByCategoryParams{
		GroupID: groupPgID, ExpenseDate: fromDate, ExpenseDate_2: toDate,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch category breakdown")
		return
	}

	paidRows, err := s.db.Q.GetOverviewByMemberPaid(r.Context(), db.GetOverviewByMemberPaidParams{
		GroupID: groupPgID, ExpenseDate: fromDate, ExpenseDate_2: toDate,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch member paid breakdown")
		return
	}

	owedRows, err := s.db.Q.GetOverviewByMemberOwed(r.Context(), db.GetOverviewByMemberOwedParams{
		GroupID: groupPgID, ExpenseDate: fromDate, ExpenseDate_2: toDate,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch member owed breakdown")
		return
	}

	dailyRows, err := s.db.Q.GetOverviewDaily(r.Context(), db.GetOverviewDailyParams{
		GroupID: groupPgID, ExpenseDate: fromDate, ExpenseDate_2: toDate,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch daily trend")
		return
	}

	recentRows, err := s.db.Q.GetOverviewRecent(r.Context(), db.GetOverviewRecentParams{
		GroupID: groupPgID, ExpenseDate: fromDate, ExpenseDate_2: toDate,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch recent expenses")
		return
	}
	if recentRows == nil {
		recentRows = []db.Expense{}
	}

	// Overall balances (not period-filtered) for net position.
	balanceRows, err := s.db.Q.ListGroupBalances(r.Context(), db.ListGroupBalancesParams{
		GroupID: groupPgID, PageLimit: 100, PageOffset: 0,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to compute balances")
		return
	}
	balances := make([]balanceRow, 0, len(balanceRows))
	for _, row := range balanceRows {
		settled := numSub(row.SettledTo, row.SettledFrom)
		net := numSub(numSub(row.Paid, row.Owed), settled)
		balances = append(balances, balanceRow{
			UserID: row.UserID, FirstName: row.FirstName, LastName: row.LastName,
			Paid: row.Paid, Owed: row.Owed, Settled: settled, Net: net,
		})
	}

	totalAmount := numericToFloat(statsRow.TotalAmount)
	settlementAmount := numericToFloat(settlementRow.SettlementAmount)

	// Derived stats.
	var avgAmount, avgPerDay float64
	if statsRow.ExpenseCount > 0 {
		avgAmount = totalAmount / float64(statsRow.ExpenseCount)
	}
	days := 1
	switch period {
	case period7d:
		days = 7
	case period30d:
		days = 30
	}
	if days > 0 {
		avgPerDay = totalAmount / float64(days)
	}

	// Build by_category with percentages. Stable order already by total DESC from SQL.
	byCategory := make([]categoryBreakdown, 0, len(catRows))
	for _, row := range catRows {
		t := numericToFloat(row.TotalAmount)
		var pct float64
		if totalAmount > 0 {
			pct = t / totalAmount * 100
		}
		var idPtr *string
		if row.CategoryID.Valid {
			s := uuid.UUID(row.CategoryID.Bytes).String()
			idPtr = &s
		}
		name := "Uncategorized"
		if row.CategoryName.Valid && row.CategoryName.String != "" {
			name = row.CategoryName.String
		}
		color := "#71717a"
		if row.CategoryColor.Valid && row.CategoryColor.String != "" {
			color = row.CategoryColor.String
		}
		var iconPtr *string
		if row.CategoryIcon.Valid && row.CategoryIcon.String != "" {
			iconPtr = &row.CategoryIcon.String
		}
		byCategory = append(byCategory, categoryBreakdown{
			CategoryID: idPtr, CategoryName: name, Color: color, Icon: iconPtr,
			Count: row.ExpenseCount, Total: t, Percentage: pct,
		})
	}

	byMemberPaid := make([]memberPaidBreakdown, 0, len(paidRows))
	for _, row := range paidRows {
		t := numericToFloat(row.TotalAmount)
		var pct float64
		if totalAmount > 0 {
			pct = t / totalAmount * 100
		}
		var lastPtr *string
		if row.LastName.Valid && row.LastName.String != "" {
			lastPtr = &row.LastName.String
		}
		byMemberPaid = append(byMemberPaid, memberPaidBreakdown{
			UserID: uuid.UUID(row.UserID.Bytes).String(),
			FirstName: row.FirstName, LastName: lastPtr,
			Count: row.ExpenseCount, Total: t, Percentage: pct,
		})
	}

	owedTotal := 0.0
	for _, row := range owedRows {
		owedTotal += numericToFloat(row.TotalOwed)
	}
	byMemberOwed := make([]memberOwedBreakdown, 0, len(owedRows))
	for _, row := range owedRows {
		t := numericToFloat(row.TotalOwed)
		var pct float64
		if owedTotal > 0 {
			pct = t / owedTotal * 100
		}
		var lastPtr *string
		if row.LastName.Valid && row.LastName.String != "" {
			lastPtr = &row.LastName.String
		}
		byMemberOwed = append(byMemberOwed, memberOwedBreakdown{
			UserID: uuid.UUID(row.UserID.Bytes).String(),
			FirstName: row.FirstName, LastName: lastPtr,
			TotalOwed: t, Percentage: pct,
		})
	}

	// Daily: zero-fill gaps so chart has 1/7/30 points even when no expenses on a date.
	type dailyAgg struct {
		Count int64
		Total float64
	}
	dailyLookup := make(map[string]dailyAgg, len(dailyRows))
	for _, row := range dailyRows {
		key := row.ExpenseDate.Time.Format(time.DateOnly)
		dailyLookup[key] = dailyAgg{Count: row.ExpenseCount, Total: numericToFloat(row.TotalAmount)}
	}
	daily := make([]dailyPoint, 0, days)
	for i := 0; i < days; i++ {
		d := fromT.AddDate(0, 0, i)
		key := d.Format(time.DateOnly)
		if v, ok := dailyLookup[key]; ok {
			daily = append(daily, dailyPoint{Date: key, Count: v.Count, Total: v.Total})
		} else {
			daily = append(daily, dailyPoint{Date: key, Count: 0, Total: 0})
		}
	}

	resp := overviewResponse{
		Period: period, FromDate: fromStr, ToDate: toStr,
		Timezone: tzName, Currency: group.DefaultCurrency,
		Stats: overviewStats{
			ExpenseCount: statsRow.ExpenseCount, TotalAmount: totalAmount,
			AvgAmount: avgAmount, AvgPerDay: avgPerDay,
			SettlementCount: settlementRow.SettlementCount, SettlementAmount: settlementAmount,
			MemberCount: memberCount, CategoryCount: len(byCategory),
		},
		ByCategory: byCategory, ByMemberPaid: byMemberPaid, ByMemberOwed: byMemberOwed,
		Daily: daily, RecentExpenses: recentRows, Balances: balances,
	}

	response.OK(w, "Overview fetched successfully", resp)
}
