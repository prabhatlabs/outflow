package groups

import (
	"encoding/json/v2"
	"errors"
	"math/big"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

func parseGroupType(s string) (db.GroupType, bool) {
	switch db.GroupType(s) {
	case db.GroupTypeHousehold,
		db.GroupTypeTrip,
		db.GroupTypeRoommates,
		db.GroupTypeCouple,
		db.GroupTypeProject,
		db.GroupTypeOther:
		return db.GroupType(s), true
	default:
		return "", false
	}
}

func (s *Service) allHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groups, err := s.db.Q.ListGroupsByUserID(r.Context(), lib.PGUUID(userID))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if groups == nil {
		groups = []db.Group{}
	}
	response.OK(w, "Groups fetched successfully", groups)
}

func (s *Service) createHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)

	var req struct {
		Name            string `json:"name"`
		Description     string `json:"description"`
		AvatarURL       string `json:"avatar_url"`
		Type            string `json:"type"`
		DefaultCurrency string `json:"default_currency"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		response.BadRequest(w, "Group name is required")
		return
	}

	groupType := db.GroupTypeHousehold
	if req.Type != "" {
		t, valid := parseGroupType(req.Type)
		if !valid {
			response.BadRequest(w, "Invalid group type")
			return
		}
		groupType = t
	}

	currency := strings.ToUpper(strings.TrimSpace(req.DefaultCurrency))
	if currency == "" {
		currency = "INR"
	}

	var group db.Group
	err := s.db.WithTx(r.Context(), func(q *db.Queries) error {
		var err error
		group, err = q.CreateGroup(r.Context(), db.CreateGroupParams{
			Name:            name,
			Description:     lib.OptionalText(strings.TrimSpace(req.Description)),
			AvatarUrl:       lib.OptionalText(strings.TrimSpace(req.AvatarURL)),
			Type:            groupType,
			DefaultCurrency: currency,
			CreatedBy:       lib.PGUUID(userID),
		})
		if err != nil {
			return err
		}

		_, err = q.CreateGroupMember(r.Context(), db.CreateGroupMemberParams{
			UserID:  lib.PGUUID(userID),
			GroupID: group.ID,
			Role:    db.GroupMemberRoleOwner,
			Status:  db.GroupMemberStatusActive,
		})
		return err
	})
	if err != nil {
		response.InternalServerError(w, "Failed to create group")
		return
	}

	response.Created(w, "Group created successfully", group)
}

func (s *Service) getHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	groupPgID := lib.PGUUID(groupID)

	group, err := s.db.Q.GetGroupByID(r.Context(), groupPgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Group not found")
			return
		}
		response.InternalServerError(w, "Failed to fetch group")
		return
	}

	response.OK(w, "Group fetched successfully", group)
}

func (s *Service) editHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	groupPgID := lib.PGUUID(groupID)

	var req struct {
		Name            *string `json:"name"`
		Description     *string `json:"description"`
		AvatarURL       *string `json:"avatar_url"`
		Type            *string `json:"type"`
		DefaultCurrency *string `json:"default_currency"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	params := db.UpdateGroupParams{ID: groupPgID}
	updated := false

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			response.BadRequest(w, "Group name cannot be empty")
			return
		}
		params.Name = lib.RequiredText(name)
		updated = true
	}
	if req.Description != nil {
		params.Description = lib.RequiredText(strings.TrimSpace(*req.Description))
		updated = true
	}
	if req.AvatarURL != nil {
		params.AvatarUrl = lib.RequiredText(strings.TrimSpace(*req.AvatarURL))
		updated = true
	}
	if req.Type != nil {
		t, valid := parseGroupType(*req.Type)
		if !valid {
			response.BadRequest(w, "Invalid group type")
			return
		}
		params.Type = db.NullGroupType{GroupType: t, Valid: true}
		updated = true
	}
	if req.DefaultCurrency != nil {
		currency := strings.ToUpper(strings.TrimSpace(*req.DefaultCurrency))
		if currency == "" {
			response.BadRequest(w, "Default currency cannot be empty")
			return
		}
		params.DefaultCurrency = lib.RequiredText(currency)
		updated = true
	}

	if !updated {
		response.BadRequest(w, "No fields to update")
		return
	}

	// Untouched fields stay NULL and the COALESCE in the query keeps the
	// old value; provided-but-empty strings clear text fields.
	group, err := s.db.Q.UpdateGroup(r.Context(), params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Group not found")
			return
		}
		response.InternalServerError(w, "Failed to update group")
		return
	}

	response.OK(w, "Group updated successfully", group)
}

func (s *Service) archiveHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	groupPgID := lib.PGUUID(groupID)

	group, err := s.db.Q.ArchiveGroup(r.Context(), groupPgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Group not found")
			return
		}
		response.InternalServerError(w, "Failed to archive group")
		return
	}

	response.OK(w, "Group archived successfully", group)
}

// settled = repayments received minus sent.
type balanceRow struct {
	UserID    pgtype.UUID    `json:"user_id"`
	FirstName string         `json:"first_name"`
	LastName  pgtype.Text    `json:"last_name"`
	Paid      pgtype.Numeric `json:"paid"`
	Owed      pgtype.Numeric `json:"owed"`
	Settled   pgtype.Numeric `json:"settled"`
	Net       pgtype.Numeric `json:"net"`
}

func numSub(a, b pgtype.Numeric) pgtype.Numeric {
	af, _ := a.Float64Value()
	bf, _ := b.Float64Value()
	res := big.NewFloat(af.Float64 - bf.Float64)
	var n pgtype.Numeric
	_ = n.Scan(res)
	return n
}

// balancesHandler computes net position per active member:
// net = paid - owed + settled_from - settled_to (negative means the member
// owes the group).
func (s *Service) balancesHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	rows, err := s.db.Q.ListGroupBalances(r.Context(), lib.PGUUID(groupID))
	if err != nil {
		response.InternalServerError(w, "Failed to compute balances")
		return
	}

	out := make([]balanceRow, 0, len(rows))
	for _, row := range rows {
		settled := numSub(row.SettledTo, row.SettledFrom)
		net := numSub(numSub(row.Paid, row.Owed), settled)
		out = append(out, balanceRow{
			UserID:    row.UserID,
			FirstName: row.FirstName,
			LastName:  row.LastName,
			Paid:      row.Paid,
			Owed:      row.Owed,
			Settled:   settled,
			Net:       net,
		})
	}

	response.OK(w, "Balances fetched successfully", out)
}
