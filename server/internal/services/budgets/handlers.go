package budgets

import (
	"encoding/json/v2"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

func parseBudgetPeriod(s string) (db.BudgetPeriod, bool) {
	switch db.BudgetPeriod(s) {
	case db.BudgetPeriodWeekly, db.BudgetPeriodMonthly, db.BudgetPeriodYearly, db.BudgetPeriodCustom:
		return db.BudgetPeriod(s), true
	default:
		return "", false
	}
}

type budgetInput struct {
	AmountLimit    float64 `json:"amount_limit"`
	Period         string  `json:"period"`
	StartDate      string  `json:"start_date"`
	EndDate        string  `json:"end_date"`
	AlertThreshold *int32  `json:"alert_threshold"`
}

// validateBudget normalizes a budget payload into create-params pieces.
func validateBudget(in budgetInput) (amount pgtype.Numeric, period db.BudgetPeriod, start, end pgtype.Date, threshold int32, msg string) {
	if in.AmountLimit <= 0 {
		return pgtype.Numeric{}, "", pgtype.Date{}, pgtype.Date{}, 0, "amount_limit must be positive"
	}
	amount = lib.Numeric(in.AmountLimit)

	period, valid := parseBudgetPeriod(strings.TrimSpace(in.Period))
	if !valid {
		return pgtype.Numeric{}, "", pgtype.Date{}, pgtype.Date{}, 0, "period must be weekly, monthly, yearly or custom"
	}

	startDate := time.Now()
	if in.StartDate != "" {
		d, err := time.Parse(time.DateOnly, in.StartDate)
		if err != nil {
			return pgtype.Numeric{}, "", pgtype.Date{}, pgtype.Date{}, 0, "start_date must be YYYY-MM-DD"
		}
		startDate = d
	}
	start = lib.Date(startDate)

	if period == db.BudgetPeriodCustom {
		if in.EndDate == "" {
			return pgtype.Numeric{}, "", pgtype.Date{}, pgtype.Date{}, 0, "custom period requires an end_date"
		}
	}
	if in.EndDate != "" {
		d, err := time.Parse(time.DateOnly, in.EndDate)
		if err != nil {
			return pgtype.Numeric{}, "", pgtype.Date{}, pgtype.Date{}, 0, "end_date must be YYYY-MM-DD"
		}
		if d.Before(startDate) {
			return pgtype.Numeric{}, "", pgtype.Date{}, pgtype.Date{}, 0, "end_date cannot be before start_date"
		}
		end = lib.Date(d)
	}

	threshold = 75
	if in.AlertThreshold != nil {
		if *in.AlertThreshold <= 0 || *in.AlertThreshold > 100 {
			return pgtype.Numeric{}, "", pgtype.Date{}, pgtype.Date{}, 0, "alert_threshold must be between 1 and 100"
		}
		threshold = *in.AlertThreshold
	}
	return amount, period, start, end, threshold, ""
}

type budgetPatch struct {
	amount    pgtype.Numeric
	amountSet bool
	period    db.NullBudgetPeriod
	start     pgtype.Date
	end       pgtype.Date
	endSet    bool
	threshold pgtype.Int4
}

// validateBudgetPatch validates only the fields present in the payload.
// isCustomWithEnd must confirm custom-period consistency against the merged
// (old or new) start/end values.
func validateBudgetPatch(in budgetInput) (budgetPatch, string) {
	var p budgetPatch

	if in.AmountLimit != 0 {
		if in.AmountLimit < 0 {
			return p, "amount_limit must be positive"
		}
		p.amount, p.amountSet = lib.Numeric(in.AmountLimit), true
	}

	startDate := time.Time{}
	if in.StartDate != "" {
		d, err := time.Parse(time.DateOnly, in.StartDate)
		if err != nil {
			return p, "start_date must be YYYY-MM-DD"
		}
		p.start = lib.Date(d)
		startDate = d
	}

	endDate := time.Time{}
	if in.EndDate != "" {
		d, err := time.Parse(time.DateOnly, in.EndDate)
		if err != nil {
			return p, "end_date must be YYYY-MM-DD"
		}
		p.end, p.endSet = lib.Date(d), true
		endDate = d
	}

	if in.Period != "" {
		period, valid := parseBudgetPeriod(strings.TrimSpace(in.Period))
		if !valid {
			return p, "period must be weekly, monthly, yearly or custom"
		}
		p.period = db.NullBudgetPeriod{BudgetPeriod: period, Valid: true}
	}

	if in.AlertThreshold != nil {
		if *in.AlertThreshold <= 0 || *in.AlertThreshold > 100 {
			return p, "alert_threshold must be between 1 and 100"
		}
		p.threshold = lib.Int4(*in.AlertThreshold)
	}

	if !endDate.IsZero() && !startDate.IsZero() && endDate.Before(startDate) {
		return p, "end_date cannot be before start_date"
	}
	return p, ""
}

// checkCustomPeriod enforces the chk_*_budgets_custom constraint on the
// merged values: a custom period needs a non-null end_date.
func checkCustomPeriod(period db.NullBudgetPeriod, newStart, newEnd pgtype.Date, oldStart, oldEnd pgtype.Date) error {
	if !period.Valid || period.BudgetPeriod != db.BudgetPeriodCustom {
		return nil
	}
	end := newEnd
	if !end.Valid {
		end = oldEnd
	}
	if !end.Valid {
		return errors.New("custom period requires an end_date")
	}
	start := newStart
	if !start.Valid {
		start = oldStart
	}
	if start.Valid && end.Time.Before(start.Time) {
		return errors.New("end_date cannot be before start_date")
	}
	return nil
}

// ---- group budgets ----

func (s *Service) groupListHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	budgets, err := s.db.Q.ListGroupBudgetsByGroupID(r.Context(), lib.PGUUID(groupID))
	if err != nil {
		response.InternalServerError(w, "Failed to fetch budgets")
		return
	}
	if budgets == nil {
		budgets = []db.GroupBudget{}
	}

	response.OK(w, "Budgets fetched successfully", budgets)
}

func (s *Service) groupCreateHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	var in budgetInput
	if err := json.UnmarshalRead(r.Body, &in); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	amount, period, start, end, threshold, msg := validateBudget(in)
	if msg != "" {
		response.BadRequest(w, msg)
		return
	}

	budget, err := s.db.Q.CreateGroupBudget(r.Context(), db.CreateGroupBudgetParams{
		GroupID:        lib.PGUUID(groupID),
		AmountLimit:    amount,
		Period:         period,
		StartDate:      start,
		EndDate:        end,
		AlertThreshold: threshold,
	})
	if err != nil {
		response.InternalServerError(w, "Failed to create budget")
		return
	}

	response.Created(w, "Budget created successfully", budget)
}

func (s *Service) getGroupBudget(w http.ResponseWriter, r *http.Request, groupID pgtype.UUID) (db.GroupBudget, bool) {
	budgetID, ok := lib.UUIDParamFromRequest(r, w, "budgetID")
	if !ok {
		return db.GroupBudget{}, false
	}
	budget, err := s.db.Q.GetGroupBudgetByID(r.Context(), budgetID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Budget not found")
			return db.GroupBudget{}, false
		}
		response.InternalServerError(w, "Failed to fetch budget")
		return db.GroupBudget{}, false
	}
	if budget.GroupID != groupID {
		response.NotFound(w, "Budget not found")
		return db.GroupBudget{}, false
	}
	return budget, true
}

func (s *Service) groupGetHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	budget, ok := s.getGroupBudget(w, r, lib.PGUUID(groupID))
	if !ok {
		return
	}
	response.OK(w, "Budget fetched successfully", budget)
}

func (s *Service) groupEditHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	budget, ok := s.getGroupBudget(w, r, lib.PGUUID(groupID))
	if !ok {
		return
	}

	var in budgetInput
	if err := json.UnmarshalRead(r.Body, &in); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}
	if in.AmountLimit == 0 && in.Period == "" && in.StartDate == "" && in.EndDate == "" && in.AlertThreshold == nil {
		response.BadRequest(w, "No fields to update")
		return
	}

	patch, msg := validateBudgetPatch(in)
	if msg != "" {
		response.BadRequest(w, msg)
		return
	}
	if err := checkCustomPeriod(patch.period, patch.start, patch.end, budget.StartDate, budget.EndDate); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	updated, err := s.db.Q.UpdateGroupBudget(r.Context(), db.UpdateGroupBudgetParams{
		ID:             budget.ID,
		AmountLimit:    patch.amount,
		Period:         patch.period,
		StartDate:      patch.start,
		EndDate:        patch.end,
		AlertThreshold: patch.threshold,
	})
	if err != nil {
		response.InternalServerError(w, "Failed to update budget")
		return
	}

	response.OK(w, "Budget updated successfully", updated)
}

func (s *Service) groupDeleteHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	budget, ok := s.getGroupBudget(w, r, lib.PGUUID(groupID))
	if !ok {
		return
	}

	if err := s.db.Q.DeleteGroupBudget(r.Context(), budget.ID); err != nil {
		response.InternalServerError(w, "Failed to delete budget")
		return
	}

	response.OK(w, "Budget deleted successfully", nil)
}

// ---- personal budgets ----

func (s *Service) personalListHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)

	budgets, err := s.db.Q.ListPersonalBudgetsByUserID(r.Context(), lib.PGUUID(userID))
	if err != nil {
		response.InternalServerError(w, "Failed to fetch budgets")
		return
	}
	if budgets == nil {
		budgets = []db.PersonalBudget{}
	}

	response.OK(w, "Budgets fetched successfully", budgets)
}

func (s *Service) personalCreateHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)

	var in budgetInput
	if err := json.UnmarshalRead(r.Body, &in); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	amount, period, start, end, threshold, msg := validateBudget(in)
	if msg != "" {
		response.BadRequest(w, msg)
		return
	}

	budget, err := s.db.Q.CreatePersonalBudget(r.Context(), db.CreatePersonalBudgetParams{
		UserID:         lib.PGUUID(userID),
		AmountLimit:    amount,
		Period:         period,
		StartDate:      start,
		EndDate:        end,
		AlertThreshold: threshold,
	})
	if err != nil {
		response.InternalServerError(w, "Failed to create budget")
		return
	}

	response.Created(w, "Budget created successfully", budget)
}

func (s *Service) personalGetHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	budgetID, ok := lib.UUIDParamFromRequest(r, w, "budgetID")
	if !ok {
		return
	}

	budget, err := s.db.Q.GetPersonalBudgetByID(r.Context(), budgetID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Budget not found")
			return
		}
		response.InternalServerError(w, "Failed to fetch budget")
		return
	}
	if budget.UserID != lib.PGUUID(userID) {
		response.NotFound(w, "Budget not found")
		return
	}

	response.OK(w, "Budget fetched successfully", budget)
}

func (s *Service) personalEditHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	budgetID, ok := lib.UUIDParamFromRequest(r, w, "budgetID")
	if !ok {
		return
	}

	budget, err := s.db.Q.GetPersonalBudgetByID(r.Context(), budgetID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Budget not found")
			return
		}
		response.InternalServerError(w, "Failed to fetch budget")
		return
	}
	if budget.UserID != lib.PGUUID(userID) {
		response.NotFound(w, "Budget not found")
		return
	}

	var in budgetInput
	if err := json.UnmarshalRead(r.Body, &in); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}
	if in.AmountLimit == 0 && in.Period == "" && in.StartDate == "" && in.EndDate == "" && in.AlertThreshold == nil {
		response.BadRequest(w, "No fields to update")
		return
	}

	patch, msg := validateBudgetPatch(in)
	if msg != "" {
		response.BadRequest(w, msg)
		return
	}
	if err := checkCustomPeriod(patch.period, patch.start, patch.end, budget.StartDate, budget.EndDate); err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	updated, err := s.db.Q.UpdatePersonalBudget(r.Context(), db.UpdatePersonalBudgetParams{
		ID:             budget.ID,
		AmountLimit:    patch.amount,
		Period:         patch.period,
		StartDate:      patch.start,
		EndDate:        patch.end,
		AlertThreshold: patch.threshold,
	})
	if err != nil {
		response.InternalServerError(w, "Failed to update budget")
		return
	}

	response.OK(w, "Budget updated successfully", updated)
}

func (s *Service) personalDeleteHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	budgetID, ok := lib.UUIDParamFromRequest(r, w, "budgetID")
	if !ok {
		return
	}

	budget, err := s.db.Q.GetPersonalBudgetByID(r.Context(), budgetID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Budget not found")
			return
		}
		response.InternalServerError(w, "Failed to fetch budget")
		return
	}
	if budget.UserID != lib.PGUUID(userID) {
		response.NotFound(w, "Budget not found")
		return
	}

	if err := s.db.Q.DeletePersonalBudget(r.Context(), budget.ID); err != nil {
		response.InternalServerError(w, "Failed to delete budget")
		return
	}

	response.OK(w, "Budget deleted successfully", nil)
}
