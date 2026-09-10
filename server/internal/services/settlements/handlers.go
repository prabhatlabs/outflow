package settlements

import (
	"context"
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

func parsePaymentMethod(s string) (db.PaymentMethod, bool) {
	switch db.PaymentMethod(s) {
	case db.PaymentMethodCash, db.PaymentMethodUpi, db.PaymentMethodBankTransfer,
		db.PaymentMethodCard, db.PaymentMethodOther:
		return db.PaymentMethod(s), true
	default:
		return "", false
	}
}

func (s *Service) requireActiveMember(ctx context.Context, groupID, userID pgtype.UUID) bool {
	member, err := s.db.Q.GetGroupMemberByUserAndGroup(ctx, db.GetGroupMemberByUserAndGroupParams{
		UserID:  userID,
		GroupID: groupID,
	})
	return err == nil && member.Status == db.GroupMemberStatusActive
}

type settlementWithSplits struct {
	db.Settlement
	Splits []db.SettlementSplit `json:"splits"`
}

func (s *Service) listHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	limit, offset := lib.ParsePagination(r)

	var (
		settlements []db.Settlement
		err         error
	)
	if uid, ok := lib.UUIDFromQuery(r, "user_id"); ok {
		settlements, err = s.db.Q.ListSettlementsByGroupAndUser(r.Context(), db.ListSettlementsByGroupAndUserParams{
			GroupID:    lib.PGUUID(groupID),
			FromUserID: uid,
			PageLimit:  limit,
			PageOffset: offset,
		})
	} else {
		settlements, err = s.db.Q.ListSettlementsByGroupID(r.Context(), db.ListSettlementsByGroupIDParams{
			GroupID:    lib.PGUUID(groupID),
			PageLimit:  limit,
			PageOffset: offset,
		})
	}
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch settlements")
		return
	}
	if settlements == nil {
		settlements = []db.Settlement{}
	}

	response.OK(w, "Settlements fetched successfully", settlements)
}

func (s *Service) createHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	var req struct {
		FromUserID      string   `json:"from_user_id"`
		ToUserID        string   `json:"to_user_id"`
		Amount          float64  `json:"amount"`
		PaymentMethod   string   `json:"payment_method"`
		Note            string   `json:"note"`
		SettlementDate  string   `json:"settlement_date"`
		ExpenseSplitIDs []string `json:"expense_split_ids"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	fromID, err := uuid.Parse(req.FromUserID)
	if err != nil {
		response.BadRequest(w, "from_user_id is invalid")
		return
	}
	toID, err := uuid.Parse(req.ToUserID)
	if err != nil {
		response.BadRequest(w, "to_user_id is invalid")
		return
	}
	if fromID == toID {
		response.BadRequest(w, "A settlement cannot pay to itself")
		return
	}
	if req.Amount <= 0 {
		response.BadRequest(w, "Amount must be positive")
		return
	}
	pm, valid := parsePaymentMethod(strings.TrimSpace(req.PaymentMethod))
	if !valid {
		response.BadRequest(w, "payment_method must be cash, upi, bank_transfer, card or other")
		return
	}
	settlementDate := time.Now()
	if req.SettlementDate != "" {
		d, err := time.Parse(time.DateOnly, req.SettlementDate)
		if err != nil {
			response.BadRequest(w, "settlement_date must be YYYY-MM-DD")
			return
		}
		settlementDate = d
	}

	pg := lib.PGUUID(groupID)
	if !s.requireActiveMember(r.Context(), pg, lib.PGUUID(fromID)) ||
		!s.requireActiveMember(r.Context(), pg, lib.PGUUID(toID)) {
		response.BadRequest(w, "Both users must be active group members")
		return
	}

	splitIDs := make([]pgtype.UUID, 0, len(req.ExpenseSplitIDs))
	for _, raw := range req.ExpenseSplitIDs {
		id, err := uuid.Parse(raw)
		if err != nil {
			response.BadRequest(w, "expense_split_ids contains an invalid id")
			return
		}
		splitIDs = append(splitIDs, lib.PGUUID(id))
	}

	var out settlementWithSplits
	err = s.db.WithTx(r.Context(), func(q *db.Queries) error {
		settlement, err := q.CreateSettlement(r.Context(), db.CreateSettlementParams{
			GroupID:        pg,
			FromUserID:     lib.PGUUID(fromID),
			ToUserID:       lib.PGUUID(toID),
			Amount:         lib.Numeric(req.Amount),
			PaymentMethod:  pm,
			Note:           lib.OptionalText(strings.TrimSpace(req.Note)),
			SettlementDate: lib.Date(settlementDate),
		})
		if err != nil {
			return err
		}
		out.Settlement = settlement

		for _, sid := range splitIDs {
			es, err := q.GetExpenseSplitByID(r.Context(), sid)
			if err != nil {
				return errors.New("expense split not found")
			}
			expense, err := q.GetExpenseByID(r.Context(), es.ExpenseID)
			if err != nil || expense.GroupID != pg {
				return errors.New("expense split not in this group")
			}
			if _, err := q.CreateSettlementSplit(r.Context(), db.CreateSettlementSplitParams{
				SettlementID:   settlement.ID,
				ExpenseSplitID: sid,
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "not in this group") {
			response.BadRequest(w, err.Error())
			return
		}
		response.InternalServerError(w, err, "Failed to create settlement")
		return
	}

	out.Splits, _ = s.db.Q.ListSettlementSplitsBySettlementID(r.Context(), db.ListSettlementSplitsBySettlementIDParams{
		SettlementID: out.Settlement.ID,
		PageLimit:    50,
		PageOffset:   0,
	})

	response.Created(w, "Settlement created successfully", out)
}

func (s *Service) getHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	settlementID, ok := lib.UUIDParamFromRequest(r, w, "settlementID")
	if !ok {
		return
	}

	settlement, err := s.db.Q.GetSettlementByID(r.Context(), settlementID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Settlement not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch settlement")
		return
	}
	if settlement.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Settlement not found")
		return
	}

	limit, offset := lib.ParsePagination(r)
	splits, _ := s.db.Q.ListSettlementSplitsBySettlementID(r.Context(), db.ListSettlementSplitsBySettlementIDParams{
		SettlementID: settlementID,
		PageLimit:    limit,
		PageOffset:   offset,
	})
	out := settlementWithSplits{Settlement: settlement, Splits: splits}
	if out.Splits == nil {
		out.Splits = []db.SettlementSplit{}
	}

	response.OK(w, "Settlement fetched successfully", out)
}

func (s *Service) deleteHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	settlementID, ok := lib.UUIDParamFromRequest(r, w, "settlementID")
	if !ok {
		return
	}

	settlement, err := s.db.Q.GetSettlementByID(r.Context(), settlementID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Settlement not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch settlement")
		return
	}
	if settlement.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Settlement not found")
		return
	}

	err = s.db.WithTx(r.Context(), func(q *db.Queries) error {
		if err := q.DeleteSettlementSplitsBySettlementID(r.Context(), settlementID); err != nil {
			return err
		}
		return q.DeleteSettlement(r.Context(), settlementID)
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to delete settlement")
		return
	}

	response.OK(w, "Settlement deleted successfully", nil)
}
