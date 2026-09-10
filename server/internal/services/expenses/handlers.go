package expenses

import (
	"context"
	"encoding/json/v2"
	"errors"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

type splitInput struct {
	UserID     string   `json:"user_id"`
	AmountOwed float64  `json:"amount_owed"`
	Percentage *float64 `json:"percentage"`
	Shares     *float64 `json:"shares"`
}

type expenseInput struct {
	PaidBy      string       `json:"paid_by"`
	CategoryID  string       `json:"category_id"`
	Amount      float64      `json:"amount"`
	Description string       `json:"description"`
	Note        string       `json:"note"`
	SplitType   string       `json:"split_type"`
	ExpenseDate string       `json:"expense_date"`
	Splits      []splitInput `json:"splits"`
}

type expenseWithSplits struct {
	db.Expense
	Splits []db.ExpenseSplit `json:"splits"`
}

func parseSplitType(s string) (db.SplitType, bool) {
	switch db.SplitType(s) {
	case db.SplitTypeEqual, db.SplitTypePercentage, db.SplitTypeExact, db.SplitTypeShares:
		return db.SplitType(s), true
	default:
		return "", false
	}
}

// validateSplits checks amounts add up and every user is an active member.
func (s *Service) validateSplits(r *http.Request, groupID pgtype.UUID, amount float64, splits []splitInput, splitType db.SplitType) string {
	if len(splits) == 0 {
		return "At least one split is required"
	}

	seen := make(map[uuid.UUID]bool, len(splits))
	var sum float64
	for _, sp := range splits {
		uid, err := uuid.Parse(sp.UserID)
		if err != nil {
			return "Split user id is invalid"
		}
		if seen[uid] {
			return "Duplicate split user"
		}
		seen[uid] = true

		if sp.AmountOwed < 0 {
			return "Split amount cannot be negative"
		}
		if splitType == db.SplitTypeExact && sp.AmountOwed <= 0 {
			return "Exact splits need a positive amount"
		}
		if splitType == db.SplitTypePercentage && (sp.Percentage == nil || *sp.Percentage <= 0) {
			return "Percentage splits need a percentage"
		}
		if splitType == db.SplitTypeShares && (sp.Shares == nil || *sp.Shares <= 0) {
			return "Share splits need a share count"
		}

		member, err := s.db.Q.GetGroupMemberByUserAndGroup(r.Context(), db.GetGroupMemberByUserAndGroupParams{
			UserID:  lib.PGUUID(uid),
			GroupID: groupID,
		})
		if err != nil || member.Status != db.GroupMemberStatusActive {
			return "All split participants must be active group members"
		}
		sum += sp.AmountOwed
	}

	if !amountClose(sum, amount) {
		return "Split amounts must add up to the total"
	}
	return ""
}

// amountClose compares two money values with a cent of tolerance,
// big.Float to sidestep float accumulation error.
func amountClose(a, b float64) bool {
	diff := new(big.Float).SetFloat64(a)
	diff.Sub(diff, new(big.Float).SetFloat64(b))
	abs := new(big.Float).Abs(diff)
	tol := big.NewFloat(0.005)
	return abs.Cmp(tol) <= 0
}

func splitSumByPercentageOrShares(total float64, splits []splitInput, splitType db.SplitType) []float64 {
	amounts := make([]float64, len(splits))
	switch splitType {
	case db.SplitTypeEqual:
		per := total / float64(len(splits))
		for i := range amounts {
			amounts[i] = per
		}
	case db.SplitTypePercentage:
		var sum float64
		for _, sp := range splits {
			if sp.Percentage != nil {
				sum += *sp.Percentage
			}
		}
		for i, sp := range splits {
			if sp.Percentage != nil && sum > 0 {
				amounts[i] = total * (*sp.Percentage) / sum
			}
		}
	case db.SplitTypeShares:
		var sum float64
		for _, sp := range splits {
			if sp.Shares != nil {
				sum += *sp.Shares
			}
		}
		for i, sp := range splits {
			if sp.Shares != nil && sum > 0 {
				amounts[i] = total * (*sp.Shares) / sum
			}
		}
	case db.SplitTypeExact:
		for i, sp := range splits {
			amounts[i] = sp.AmountOwed
		}
	}
	return amounts
}

func (s *Service) fetchExpenseWithSplits(ctx context.Context, expenseID pgtype.UUID) (expenseWithSplits, error) {
	expense, err := s.db.Q.GetExpenseByID(ctx, expenseID)
	if err != nil {
		return expenseWithSplits{}, err
	}
	splits, err := s.db.Q.ListExpenseSplitsByExpenseID(ctx, db.ListExpenseSplitsByExpenseIDParams{
		ExpenseID:  expenseID,
		PageLimit:  50,
		PageOffset: 0,
	})
	if err != nil {
		return expenseWithSplits{}, err
	}
	return expenseWithSplits{Expense: expense, Splits: splits}, nil
}

func (s *Service) listHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	limit, offset := lib.ParsePagination(r)
	params := db.ListExpensesByGroupFilteredParams{
		GroupID:    lib.PGUUID(groupID),
		PageLimit:  limit,
		PageOffset: offset,
	}
	if cat, ok := lib.UUIDFromQuery(r, "category_id"); ok {
		params.CategoryID = cat
	}
	if pb, ok := lib.UUIDFromQuery(r, "paid_by"); ok {
		params.PaidBy = pb
	}
	q := r.URL.Query()
	if from, err := time.Parse(time.DateOnly, q.Get("from")); err == nil && q.Get("from") != "" {
		params.FromDate = lib.Date(from)
	}
	if to, err := time.Parse(time.DateOnly, q.Get("to")); err == nil && q.Get("to") != "" {
		params.ToDate = lib.Date(to)
	}
	if archived, err := strconv.ParseBool(q.Get("include_archived")); err == nil && archived {
		params.IncludeArchived = lib.Bool(true)
	}

	expenses, err := s.db.Q.ListExpensesByGroupFiltered(r.Context(), params)
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch expenses")
		return
	}
	if expenses == nil {
		expenses = []db.Expense{}
	}

	response.OK(w, "Expenses fetched successfully", expenses)
}

func (s *Service) createHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	var input expenseInput
	if err := json.UnmarshalRead(r.Body, &input); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	badMsg, normalized := s.normalizeExpenseInput(r, lib.PGUUID(groupID), userID, input)
	if badMsg != "" {
		response.BadRequest(w, badMsg)
		return
	}

	var out expenseWithSplits
	err := s.db.WithTx(r.Context(), func(q *db.Queries) error {
		expense, err := q.CreateExpense(r.Context(), normalized.create)
		if err != nil {
			return err
		}
		if err := replaceSplits(r.Context(), q, expense.ID, normalized.splits); err != nil {
			return err
		}
		out.Expense = expense
		out.Splits = nil
		return nil
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to create expense")
		return
	}

	out.Splits, err = s.db.Q.ListExpenseSplitsByExpenseID(r.Context(), db.ListExpenseSplitsByExpenseIDParams{
		ExpenseID:  out.Expense.ID,
		PageLimit:  50,
		PageOffset: 0,
	})
	if err != nil {
		out.Splits = []db.ExpenseSplit{}
	}

	response.Created(w, "Expense created successfully", out)
}

type normalizedExpense struct {
	create db.CreateExpenseParams
	update db.UpdateExpenseParams
	splits []db.CreateExpenseSplitParams
}

func (s *Service) normalizeExpenseInput(r *http.Request, groupID pgtype.UUID, userID uuid.UUID, in expenseInput) (string, normalizedExpense) {
	var out normalizedExpense

	if in.Amount <= 0 {
		return "Amount must be positive", out
	}

	paidBy := userID
	if in.PaidBy != "" {
		parsed, err := uuid.Parse(in.PaidBy)
		if err != nil {
			return "paid_by is invalid", out
		}
		paidBy = parsed
	}

	splitType, valid := parseSplitType(in.SplitType)
	if !valid {
		return "split_type must be equal, percentage, exact or shares", out
	}

	expenseDate := time.Now()
	if in.ExpenseDate != "" {
		parsed, err := time.Parse(time.DateOnly, in.ExpenseDate)
		if err != nil {
			return "expense_date must be YYYY-MM-DD", out
		}
		expenseDate = parsed
	}

	// compute per-user amounts from the split type
	amounts := splitSumByPercentageOrShares(in.Amount, in.Splits, splitType)
	computedSplits := make([]splitInput, len(in.Splits))
	for i, sp := range in.Splits {
		sp.AmountOwed = amounts[i]
		computedSplits[i] = sp
	}

	if msg := s.validateSplits(r, groupID, in.Amount, computedSplits, splitType); msg != "" {
		return msg, out
	}

	create := db.CreateExpenseParams{
		GroupID:     groupID,
		CreatedBy:   lib.PGUUID(userID),
		PaidBy:      lib.PGUUID(paidBy),
		Amount:      lib.Numeric(in.Amount),
		Description: lib.OptionalText(strings.TrimSpace(in.Description)),
		Note:        lib.OptionalText(strings.TrimSpace(in.Note)),
		SplitType:   splitType,
		ExpenseDate: lib.Date(expenseDate),
	}
	if in.CategoryID != "" {
		catID, err := uuid.Parse(in.CategoryID)
		if err != nil {
			return "category_id is invalid", out
		}
		cat, err := s.db.Q.GetCategoryByID(r.Context(), lib.PGUUID(catID))
		if err != nil || cat.GroupID != groupID {
			return "Category not found in this group", out
		}
		create.CategoryID = lib.PGUUID(catID)
	}

	splitParams := make([]db.CreateExpenseSplitParams, 0, len(computedSplits))
	for _, sp := range computedSplits {
		uid, _ := uuid.Parse(sp.UserID)
		p := db.CreateExpenseSplitParams{
			UserID:     lib.PGUUID(uid),
			AmountOwed: lib.Numeric(sp.AmountOwed),
		}
		if sp.Percentage != nil {
			p.Percentage = lib.Numeric(*sp.Percentage)
		}
		if sp.Shares != nil {
			p.Shares = lib.Numeric(*sp.Shares)
		}
		splitParams = append(splitParams, p)
	}

	out.create = create
	out.splits = splitParams
	return "", out
}

func replaceSplits(ctx context.Context, q *db.Queries, expenseID pgtype.UUID, splits []db.CreateExpenseSplitParams) error {
	if err := q.DeleteExpenseSplitsByExpenseID(ctx, expenseID); err != nil {
		return err
	}
	for _, sp := range splits {
		sp.ExpenseID = expenseID
		if _, err := q.CreateExpenseSplit(ctx, sp); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) getHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	expenseID, ok := lib.UUIDParamFromRequest(r, w, "expenseID")
	if !ok {
		return
	}

	out, err := s.fetchExpenseWithSplits(r.Context(), expenseID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Expense not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch expense")
		return
	}
	if out.Expense.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Expense not found")
		return
	}

	response.OK(w, "Expense fetched successfully", out)
}

func (s *Service) editHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	expenseID, ok := lib.UUIDParamFromRequest(r, w, "expenseID")
	if !ok {
		return
	}

	existing, err := s.db.Q.GetExpenseByID(r.Context(), expenseID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Expense not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch expense")
		return
	}
	if existing.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Expense not found")
		return
	}
	if existing.CreatedBy != lib.PGUUID(userID) {
		response.Forbidden(w, "Only the creator can edit this expense")
		return
	}

	var req struct {
		expenseInput
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}
	in := req.expenseInput

	// amount falls back to the stored value when omitted
	amount := in.Amount
	if amount == 0 {
		f, _ := existing.Amount.Float64Value()
		amount = f.Float64
	}
	if in.Amount == 0 && len(in.Splits) == 0 && in.SplitType == "" && in.PaidBy == "" &&
		in.CategoryID == "" && in.Description == "" && in.Note == "" && in.ExpenseDate == "" {
		response.BadRequest(w, "No fields to update")
		return
	}

	params := db.UpdateExpenseParams{ID: expenseID}
	if in.PaidBy != "" {
		uid, err := uuid.Parse(in.PaidBy)
		if err != nil {
			response.BadRequest(w, "paid_by is invalid")
			return
		}
		params.PaidBy = lib.PGUUID(uid)
	}
	if in.CategoryID != "" {
		catID, err := uuid.Parse(in.CategoryID)
		if err != nil {
			response.BadRequest(w, "category_id is invalid")
			return
		}
		cat, err := s.db.Q.GetCategoryByID(r.Context(), lib.PGUUID(catID))
		if err != nil || cat.GroupID != lib.PGUUID(groupID) {
			response.BadRequest(w, "Category not found in this group")
			return
		}
		params.CategoryID = lib.PGUUID(catID)
	}
	if in.Amount != 0 {
		params.Amount = lib.Numeric(in.Amount)
	}
	if in.Description != "" {
		params.Description = lib.RequiredText(strings.TrimSpace(in.Description))
	}
	if in.Note != "" {
		params.Note = lib.RequiredText(strings.TrimSpace(in.Note))
	}
	if in.SplitType != "" {
		st, valid := parseSplitType(in.SplitType)
		if !valid {
			response.BadRequest(w, "split_type must be equal, percentage, exact or shares")
			return
		}
		params.SplitType = db.NullSplitType{SplitType: st, Valid: true}
	}
	if in.ExpenseDate != "" {
		d, err := time.Parse(time.DateOnly, in.ExpenseDate)
		if err != nil {
			response.BadRequest(w, "expense_date must be YYYY-MM-DD")
			return
		}
		params.ExpenseDate = lib.Date(d)
	}

	var newSplits []db.CreateExpenseSplitParams
	if len(in.Splits) > 0 {
		splitType := existing.SplitType
		if in.SplitType != "" {
			splitType, _ = parseSplitType(in.SplitType)
		}
		amounts := splitSumByPercentageOrShares(amount, in.Splits, splitType)
		computed := make([]splitInput, len(in.Splits))
		for i, sp := range in.Splits {
			sp.AmountOwed = amounts[i]
			computed[i] = sp
		}
		if msg := s.validateSplits(r, lib.PGUUID(groupID), amount, computed, splitType); msg != "" {
			response.BadRequest(w, msg)
			return
		}
		newSplits = make([]db.CreateExpenseSplitParams, 0, len(computed))
		for _, sp := range computed {
			uid, _ := uuid.Parse(sp.UserID)
			p := db.CreateExpenseSplitParams{
				UserID:     lib.PGUUID(uid),
				AmountOwed: lib.Numeric(sp.AmountOwed),
			}
			if sp.Percentage != nil {
				p.Percentage = lib.Numeric(*sp.Percentage)
			}
			if sp.Shares != nil {
				p.Shares = lib.Numeric(*sp.Shares)
			}
			newSplits = append(newSplits, p)
		}
	} else if in.Amount != 0 {
		// amount changed without new splits: recompute existing splits so the
		// books stay balanced
		old, err := s.db.Q.ListExpenseSplitsByExpenseID(r.Context(), db.ListExpenseSplitsByExpenseIDParams{
			ExpenseID:  expenseID,
			PageLimit:  50,
			PageOffset: 0,
		})
		if err != nil {
			response.InternalServerError(w, err, "Failed to load splits")
			return
		}
		rebalanced, err := rebalance(amount, old)
		if err != nil {
			response.BadRequest(w, "Cannot change amount: "+err.Error())
			return
		}
		newSplits = rebalanced
	}

	err = s.db.WithTx(r.Context(), func(q *db.Queries) error {
		if _, err := q.UpdateExpense(r.Context(), params); err != nil {
			return err
		}
		if newSplits != nil {
			return replaceSplits(r.Context(), q, expenseID, newSplits)
		}
		return nil
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to update expense")
		return
	}

	out, err := s.fetchExpenseWithSplits(r.Context(), expenseID)
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch updated expense")
		return
	}

	response.OK(w, "Expense updated successfully", out)
}

// rebalance keeps each split's share of the old total but applies it to the
// new amount.
func rebalance(newTotal float64, old []db.ExpenseSplit) ([]db.CreateExpenseSplitParams, error) {
	if len(old) == 0 {
		return nil, errors.New("no splits to rebalance")
	}
	var oldTotal float64
	vals := make([]float64, len(old))
	for i, sp := range old {
		f, _ := sp.AmountOwed.Float64Value()
		vals[i] = f.Float64
		oldTotal += vals[i]
	}
	if oldTotal <= 0 {
		return nil, errors.New("total is zero")
	}

	out := make([]db.CreateExpenseSplitParams, 0, len(old))
	for i, sp := range old {
		p := db.CreateExpenseSplitParams{
			UserID:     sp.UserID,
			AmountOwed: lib.Numeric(newTotal * vals[i] / oldTotal),
		}
		if sp.Percentage.Valid {
			p.Percentage = sp.Percentage
		}
		if sp.Shares.Valid {
			p.Shares = sp.Shares
		}
		out = append(out, p)
	}
	return out, nil
}

func (s *Service) archiveHandler(w http.ResponseWriter, r *http.Request) {
	s.setArchived(w, r, true)
}

func (s *Service) unarchiveHandler(w http.ResponseWriter, r *http.Request) {
	s.setArchived(w, r, false)
}

func (s *Service) setArchived(w http.ResponseWriter, r *http.Request, archived bool) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	expenseID, ok := lib.UUIDParamFromRequest(r, w, "expenseID")
	if !ok {
		return
	}

	existing, err := s.db.Q.GetExpenseByID(r.Context(), expenseID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Expense not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch expense")
		return
	}
	if existing.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Expense not found")
		return
	}
	member := lib.GroupMemberFromContextWithForbiddenErr(r.Context(), w)
	if existing.CreatedBy != lib.PGUUID(userID) && member.Role == db.GroupMemberRoleMember {
		response.Forbidden(w, "Only the creator, admins and owners can change archive state")
		return
	}

	var fn func(context.Context, pgtype.UUID) (db.Expense, error)
	if archived {
		fn = s.db.Q.ArchiveExpense
	} else {
		fn = s.db.Q.UnarchiveExpense
	}
	expense, err := fn(r.Context(), expenseID)
	if err != nil {
		response.InternalServerError(w, err, "Failed to update expense")
		return
	}

	msg := "Expense unarchived successfully"
	if archived {
		msg = "Expense archived successfully"
	}
	response.OK(w, msg, expense)
}

func (s *Service) deleteHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	expenseID, ok := lib.UUIDParamFromRequest(r, w, "expenseID")
	if !ok {
		return
	}

	existing, err := s.db.Q.GetExpenseByID(r.Context(), expenseID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Expense not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch expense")
		return
	}
	if existing.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Expense not found")
		return
	}
	member := lib.GroupMemberFromContextWithForbiddenErr(r.Context(), w)
	if existing.CreatedBy != lib.PGUUID(userID) && member.Role == db.GroupMemberRoleMember {
		response.Forbidden(w, "Only the creator, admins and owners can delete this expense")
		return
	}

	if err := s.db.Q.DeleteExpense(r.Context(), expenseID); err != nil {
		response.InternalServerError(w, err, "Failed to delete expense")
		return
	}

	response.OK(w, "Expense deleted successfully", nil)
}
