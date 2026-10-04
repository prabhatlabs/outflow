package dashboard

import (
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/response"
	"golang.org/x/sync/errgroup"
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

func numSub(a, b pgtype.Numeric) pgtype.Numeric {
	af, _ := a.Float64Value()
	bf, _ := b.Float64Value()
	return lib.Numeric(af.Float64 - bf.Float64)
}

type dashboardStats struct {
	ExpenseCount     int64   `json:"expense_count"`
	TotalPaid        float64 `json:"total_paid"`
	TotalOwed        float64 `json:"total_owed"`
	Net              float64 `json:"net"`
	AvgPerDay        float64 `json:"avg_per_day"`
	AvgPerExpense    float64 `json:"avg_per_expense"`
	SettlementCount  int64   `json:"settlement_count"`
	SettlementAmount float64 `json:"settlement_amount"`
	ActiveGroupCount int64   `json:"active_group_count"`
}

type dashboardGroupBreakdown struct {
	GroupID   string  `json:"group_id"`
	GroupName string  `json:"group_name"`
	Currency  string  `json:"currency"`
	Count     int64   `json:"count"`
	Total     float64 `json:"total"`
	Percentage float64 `json:"percentage"`
}

type dashboardCategoryBreakdown struct {
	CategoryID   *string `json:"category_id"`
	CategoryName string  `json:"category_name"`
	Color        string  `json:"color"`
	Icon         *string `json:"icon"`
	Count        int64   `json:"count"`
	Total        float64 `json:"total"`
	Percentage   float64 `json:"percentage"`
}

type dashboardCurrencyBreakdown struct {
	Currency string  `json:"currency"`
	Count    int64   `json:"count"`
	Total    float64 `json:"total"`
	Percentage float64 `json:"percentage"`
}

type dashboardDailyPoint struct {
	Date  string  `json:"date"`
	Count int64   `json:"count"`
	Total float64 `json:"total"`
}

type dashboardRecentExpense struct {
	db.Expense
	GroupName string `json:"group_name"`
}

type dashboardBalanceSummary struct {
	GroupID   string  `json:"group_id"`
	GroupName string  `json:"group_name"`
	Paid      float64 `json:"paid"`
	Owed      float64 `json:"owed"`
	Settled   float64 `json:"settled"`
	Net       float64 `json:"net"`
}

type dashboardInvitationsPreview struct {
	Count   int            `json:"count"`
	Preview []db.Invitation `json:"preview"`
}

type dashboardBudgetsPreview struct {
	Count   int                `json:"count"`
	Preview []db.PersonalBudget `json:"preview"`
}

type dashboardResponse struct {
	Period              overviewPeriod              `json:"period"`
	FromDate            string                      `json:"from_date"`
	ToDate              string                      `json:"to_date"`
	Timezone            string                      `json:"timezone"`
	Currency            string                      `json:"currency"`
	Stats               dashboardStats              `json:"stats"`
	ByGroup             []dashboardGroupBreakdown   `json:"by_group"`
	ByCategory          []dashboardCategoryBreakdown `json:"by_category"`
	ByCurrency          []dashboardCurrencyBreakdown `json:"by_currency"`
	Daily               []dashboardDailyPoint       `json:"daily"`
	RecentExpenses      []dashboardRecentExpense    `json:"recent_expenses"`
	BalancesSummary     []dashboardBalanceSummary   `json:"balances_summary"`
	PendingInvitations  dashboardInvitationsPreview `json:"pending_invitations"`
	PersonalBudgets     dashboardBudgetsPreview     `json:"personal_budgets"`
}

func (s *Service) overviewHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	if userID == uuid.Nil {
		return
	}

	rawPeriod := r.URL.Query().Get("period")
	period, ok := parsePeriod(rawPeriod)
	if !ok {
		response.BadRequest(w, "Invalid period, must be one of: today, 7d, 30d")
		return
	}

	tzName := "UTC"
	loc := time.UTC
	if u, err := s.db.Q.GetUserByID(r.Context(), lib.PGUUID(userID)); err == nil && u.Timezone != "" {
		if l, err := time.LoadLocation(u.Timezone); err == nil {
			loc = l
			tzName = u.Timezone
		} else {
			log.Printf("dashboard overview: invalid timezone %q for user %s: %v", u.Timezone, userID, err)
		}
	}

	fromT, toT := periodBoundsInUserTZ(period, loc)
	fromDate := lib.Date(fromT)
	toDate := lib.Date(toT)
	fromStr := fromT.Format(time.DateOnly)
	toStr := toT.Format(time.DateOnly)
	userPgID := lib.PGUUID(userID)

	// Expire stale invitations before counting (same as invitations pendingHandler).
	_ = s.db.Q.ExpireOverdueInvitations(r.Context())

	var (
		paidStats       db.GetDashboardPaidStatsRow
		owedStats       db.GetDashboardOwedStatsRow
		expenseCount    int64
		settlementRow   db.GetDashboardSettlementStatsRow
		activeGroupCount int64
		catRows         []db.GetDashboardByCategoryRow
		groupRows       []db.GetDashboardByGroupRow
		currencyRows    []db.GetDashboardByCurrencyRow
		dailyRows       []db.GetDashboardDailyRow
		recentRows      []db.GetDashboardRecentRow
		balanceRows     []db.GetDashboardBalancesSummaryRow
		pendingInvites  []db.Invitation
		budgets         []db.PersonalBudget
	)

	g, gctx := errgroup.WithContext(r.Context())

	g.Go(func() error {
		var err error
		paidStats, err = s.db.Q.GetDashboardPaidStats(gctx, db.GetDashboardPaidStatsParams{UserID: userPgID, FromDate: fromDate, ToDate: toDate})
		return err
	})
	g.Go(func() error {
		var err error
		owedStats, err = s.db.Q.GetDashboardOwedStats(gctx, db.GetDashboardOwedStatsParams{UserID: userPgID, FromDate: fromDate, ToDate: toDate})
		return err
	})
	g.Go(func() error {
		var err error
		expenseCount, err = s.db.Q.GetDashboardExpenseCount(gctx, db.GetDashboardExpenseCountParams{UserID: userPgID, FromDate: fromDate, ToDate: toDate})
		return err
	})
	g.Go(func() error {
		var err error
		settlementRow, err = s.db.Q.GetDashboardSettlementStats(gctx, db.GetDashboardSettlementStatsParams{UserID: userPgID, FromDate: fromDate, ToDate: toDate})
		return err
	})
	g.Go(func() error {
		var err error
		activeGroupCount, err = s.db.Q.GetDashboardActiveGroupCount(gctx, userPgID)
		return err
	})
	g.Go(func() error {
		var err error
		catRows, err = s.db.Q.GetDashboardByCategory(gctx, db.GetDashboardByCategoryParams{UserID: userPgID, FromDate: fromDate, ToDate: toDate})
		return err
	})
	g.Go(func() error {
		var err error
		groupRows, err = s.db.Q.GetDashboardByGroup(gctx, db.GetDashboardByGroupParams{UserID: userPgID, FromDate: fromDate, ToDate: toDate})
		return err
	})
	g.Go(func() error {
		var err error
		currencyRows, err = s.db.Q.GetDashboardByCurrency(gctx, db.GetDashboardByCurrencyParams{UserID: userPgID, FromDate: fromDate, ToDate: toDate})
		return err
	})
	g.Go(func() error {
		var err error
		dailyRows, err = s.db.Q.GetDashboardDaily(gctx, db.GetDashboardDailyParams{UserID: userPgID, FromDate: fromDate, ToDate: toDate})
		return err
	})
	g.Go(func() error {
		var err error
		recentRows, err = s.db.Q.GetDashboardRecent(gctx, db.GetDashboardRecentParams{UserID: userPgID, FromDate: fromDate, ToDate: toDate})
		return err
	})
	g.Go(func() error {
		var err error
		balanceRows, err = s.db.Q.GetDashboardBalancesSummary(gctx, userPgID)
		return err
	})
	// Pending invitations preview + total count (fetch outside errgroup to reuse user email, but keep simple).
	// We run these as part of the group too for parallelism, capturing user email first.

	// Fetch user email for invitations query (already fetched above for TZ, reuse).
	var userEmail string
	if u, err := s.db.Q.GetUserByID(r.Context(), userPgID); err == nil {
		userEmail = u.Email
	}
	g.Go(func() error {
		if userEmail == "" {
			return nil
		}
		var err error
		// Fetch a few more than preview to get accurate count capped at page; we fetch 20 and use length as count if <20.
		pendingInvites, err = s.db.Q.ListPendingInvitationsByEmail(gctx, db.ListPendingInvitationsByEmailParams{Lower: userEmail, PageLimit: 20, PageOffset: 0})
		return err
	})
	g.Go(func() error {
		var err error
		budgets, err = s.db.Q.ListPersonalBudgetsByUserID(gctx, db.ListPersonalBudgetsByUserIDParams{UserID: userPgID, PageLimit: 20, PageOffset: 0})
		return err
	})

	if err := g.Wait(); err != nil {
		response.InternalServerError(w, err, "Failed to fetch dashboard overview")
		return
	}
	if pendingInvites == nil {
		pendingInvites = []db.Invitation{}
	}
	if budgets == nil {
		budgets = []db.PersonalBudget{}
	}
	if recentRows == nil {
		recentRows = []db.GetDashboardRecentRow{}
	}

	totalPaid := numericToFloat(paidStats.TotalAmount)
	totalOwed := numericToFloat(owedStats.TotalOwed)
	settlementAmount := numericToFloat(settlementRow.SettlementAmount)
	net := totalPaid - totalOwed

	days := 1
	switch period {
	case period7d:
		days = 7
	case period30d:
		days = 30
	}
	var involvedTotal float64
	for _, row := range groupRows {
		involvedTotal += numericToFloat(row.TotalAmount)
	}
	var avgPerDay, avgPerExpense float64
	if days > 0 && involvedTotal > 0 {
		avgPerDay = involvedTotal / float64(days)
	}
	if expenseCount > 0 && involvedTotal > 0 {
		avgPerExpense = involvedTotal / float64(expenseCount)
	}

	// Primary currency: most used in period, fallback INR
	currency := "INR"
	if len(currencyRows) > 0 && currencyRows[0].Currency != "" {
		currency = currencyRows[0].Currency
	}

	// By group with percentages
	var groupTotal float64
	for _, row := range groupRows {
		groupTotal += numericToFloat(row.TotalAmount)
	}
	byGroup := make([]dashboardGroupBreakdown, 0, len(groupRows))
	for _, row := range groupRows {
		t := numericToFloat(row.TotalAmount)
		var pct float64
		if groupTotal > 0 {
			pct = t / groupTotal * 100
		}
		byGroup = append(byGroup, dashboardGroupBreakdown{
			GroupID: uuid.UUID(row.GroupID.Bytes).String(),
			GroupName: row.GroupName,
			Currency: row.GroupCurrency,
			Count: row.ExpenseCount,
			Total: t,
			Percentage: pct,
		})
	}

	// By category
	var catTotal float64
	for _, row := range catRows {
		catTotal += numericToFloat(row.TotalAmount)
	}
	byCategory := make([]dashboardCategoryBreakdown, 0, len(catRows))
	for _, row := range catRows {
		t := numericToFloat(row.TotalAmount)
		var pct float64
		if catTotal > 0 {
			pct = t / catTotal * 100
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
		byCategory = append(byCategory, dashboardCategoryBreakdown{
			CategoryID: idPtr, CategoryName: name, Color: color, Icon: iconPtr,
			Count: row.ExpenseCount, Total: t, Percentage: pct,
		})
	}

	// By currency
	var currencyTotal float64
	for _, row := range currencyRows {
		currencyTotal += numericToFloat(row.TotalAmount)
	}
	byCurrency := make([]dashboardCurrencyBreakdown, 0, len(currencyRows))
	for _, row := range currencyRows {
		t := numericToFloat(row.TotalAmount)
		var pct float64
		if currencyTotal > 0 {
			pct = t / currencyTotal * 100
		}
		byCurrency = append(byCurrency, dashboardCurrencyBreakdown{
			Currency: row.Currency, Count: row.ExpenseCount, Total: t, Percentage: pct,
		})
	}

	// Daily zero-fill
	type dailyAgg struct {
		Count int64
		Total float64
	}
	dailyLookup := make(map[string]dailyAgg, len(dailyRows))
	for _, row := range dailyRows {
		key := row.ExpenseDate.Time.Format(time.DateOnly)
		dailyLookup[key] = dailyAgg{Count: row.ExpenseCount, Total: numericToFloat(row.TotalAmount)}
	}
	daily := make([]dashboardDailyPoint, 0, days)
	for i := 0; i < days; i++ {
		d := fromT.AddDate(0, 0, i)
		key := d.Format(time.DateOnly)
		if v, ok := dailyLookup[key]; ok {
			daily = append(daily, dashboardDailyPoint{Date: key, Count: v.Count, Total: v.Total})
		} else {
			daily = append(daily, dashboardDailyPoint{Date: key, Count: 0, Total: 0})
		}
	}

	// Recent
	recent := make([]dashboardRecentExpense, 0, len(recentRows))
	for _, row := range recentRows {
		recent = append(recent, dashboardRecentExpense{
			Expense: db.Expense{
				ID: row.ID, GroupID: row.GroupID, CreatedBy: row.CreatedBy, PaidBy: row.PaidBy,
				CategoryID: row.CategoryID, Amount: row.Amount, Description: row.Description,
				Note: row.Note, SplitType: row.SplitType, IsArchived: row.IsArchived,
				ArchivedAt: row.ArchivedAt, ExpenseDate: row.ExpenseDate, CreatedAt: row.CreatedAt,
				UpdatedAt: row.UpdatedAt, SplitsCount: row.SplitsCount,
			},
			GroupName: row.GroupName,
		})
	}

	// Balances summary (overall, not period-filtered)
	balancesSummary := make([]dashboardBalanceSummary, 0, len(balanceRows))
	for _, row := range balanceRows {
		paid := numericToFloat(row.Paid)
		owed := numericToFloat(row.Owed)
		settled := numericToFloat(row.SettledTo) - numericToFloat(row.SettledFrom)
		netCalc := paid - owed - settled
		balancesSummary = append(balancesSummary, dashboardBalanceSummary{
			GroupID: uuid.UUID(row.GroupID.Bytes).String(),
			GroupName: row.GroupName,
			Paid: paid, Owed: owed, Settled: settled, Net: netCalc,
		})
	}

	// Preview slices (cap 3)
	previewInvites := pendingInvites
	if len(previewInvites) > 3 {
		previewInvites = previewInvites[:3]
	}
	previewBudgets := budgets
	if len(previewBudgets) > 3 {
		previewBudgets = previewBudgets[:3]
	}

	resp := dashboardResponse{
		Period: period, FromDate: fromStr, ToDate: toStr, Timezone: tzName, Currency: currency,
		Stats: dashboardStats{
			ExpenseCount: expenseCount, TotalPaid: totalPaid, TotalOwed: totalOwed, Net: net,
			AvgPerDay: avgPerDay, AvgPerExpense: avgPerExpense,
			SettlementCount: settlementRow.SettlementCount, SettlementAmount: settlementAmount,
			ActiveGroupCount: activeGroupCount,
		},
		ByGroup: byGroup, ByCategory: byCategory, ByCurrency: byCurrency,
		Daily: daily, RecentExpenses: recent, BalancesSummary: balancesSummary,
		PendingInvitations: dashboardInvitationsPreview{Count: len(pendingInvites), Preview: previewInvites},
		PersonalBudgets: dashboardBudgetsPreview{Count: len(budgets), Preview: previewBudgets},
	}

	response.OK(w, "Dashboard overview fetched successfully", resp)
}
