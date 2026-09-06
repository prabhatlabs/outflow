package groups

import (
	"encoding/json/v2"
	"errors"
	"net/http"
	"strings"

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

func badRequest(w http.ResponseWriter, message string) {
	response.SendJsonResponse(w, http.StatusBadRequest, response.ErrorResponse{
		Error:   "Bad Request",
		Message: message,
	})
}

func (s *Service) allHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groups, err := s.db.Q.ListGroupsByUserID(r.Context(), pgtype.UUID{Bytes: userID, Valid: true})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if groups == nil {
		groups = []db.Group{}
	}
	response.SendJsonResponse(w, http.StatusOK, response.SuccessResponse{
		Message: "Groups fetched successfully",
		Data:    groups,
	})
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
		badRequest(w, "Invalid JSON payload")
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		badRequest(w, "Group name is required")
		return
	}

	groupType := db.GroupTypeHousehold
	if req.Type != "" {
		t, valid := parseGroupType(req.Type)
		if !valid {
			badRequest(w, "Invalid group type")
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
			CreatedBy:       pgtype.UUID{Bytes: userID, Valid: true},
		})
		if err != nil {
			return err
		}

		_, err = q.CreateGroupMember(r.Context(), db.CreateGroupMemberParams{
			UserID:  pgtype.UUID{Bytes: userID, Valid: true},
			GroupID: group.ID,
			Role:    db.GroupMemberRoleOwner,
			Status:  db.GroupMemberStatusActive,
		})
		return err
	})
	if err != nil {
		response.SendJsonResponse(w, http.StatusInternalServerError, response.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to create group",
		})
		return
	}

	response.SendJsonResponse(w, http.StatusCreated, response.SuccessResponse{
		Message: "Group created successfully",
		Data:    group,
	})
}

func (s *Service) getHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	groupPgID := pgtype.UUID{Bytes: groupID, Valid: true}

	group, err := s.db.Q.GetGroupByID(r.Context(), groupPgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.SendJsonResponse(w, http.StatusNotFound, response.ErrorResponse{
				Error:   "Not Found",
				Message: "Group not found",
			})
			return
		}
		response.SendJsonResponse(w, http.StatusInternalServerError, response.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to fetch group",
		})
		return
	}

	response.SendJsonResponse(w, http.StatusOK, response.SuccessResponse{
		Message: "Group fetched successfully",
		Data:    group,
	})
}

func (s *Service) editHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	groupPgID := pgtype.UUID{Bytes: groupID, Valid: true}

	var req struct {
		Name            *string `json:"name"`
		Description     *string `json:"description"`
		AvatarURL       *string `json:"avatar_url"`
		Type            *string `json:"type"`
		DefaultCurrency *string `json:"default_currency"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		badRequest(w, "Invalid JSON payload")
		return
	}

	params := db.UpdateGroupParams{ID: groupPgID}
	updated := false

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			badRequest(w, "Group name cannot be empty")
			return
		}
		params.Name = pgtype.Text{String: name, Valid: true}
		updated = true
	}
	if req.Description != nil {
		params.Description = pgtype.Text{String: strings.TrimSpace(*req.Description), Valid: true}
		updated = true
	}
	if req.AvatarURL != nil {
		params.AvatarUrl = pgtype.Text{String: strings.TrimSpace(*req.AvatarURL), Valid: true}
		updated = true
	}
	if req.Type != nil {
		t, valid := parseGroupType(*req.Type)
		if !valid {
			badRequest(w, "Invalid group type")
			return
		}
		params.Type = db.NullGroupType{GroupType: t, Valid: true}
		updated = true
	}
	if req.DefaultCurrency != nil {
		currency := strings.ToUpper(strings.TrimSpace(*req.DefaultCurrency))
		if currency == "" {
			badRequest(w, "Default currency cannot be empty")
			return
		}
		params.DefaultCurrency = pgtype.Text{String: currency, Valid: true}
		updated = true
	}

	if !updated {
		badRequest(w, "No fields to update")
		return
	}

	// Untouched fields stay NULL and the COALESCE in the query keeps the
	// old value; provided-but-empty strings clear text fields.
	group, err := s.db.Q.UpdateGroup(r.Context(), params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.SendJsonResponse(w, http.StatusNotFound, response.ErrorResponse{
				Error:   "Not Found",
				Message: "Group not found",
			})
			return
		}
		response.SendJsonResponse(w, http.StatusInternalServerError, response.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to update group",
		})
		return
	}

	response.SendJsonResponse(w, http.StatusOK, response.SuccessResponse{
		Message: "Group updated successfully",
		Data:    group,
	})
}

func (s *Service) archiveHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	groupPgID := pgtype.UUID{Bytes: groupID, Valid: true}

	group, err := s.db.Q.ArchiveGroup(r.Context(), groupPgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.SendJsonResponse(w, http.StatusNotFound, response.ErrorResponse{
				Error:   "Not Found",
				Message: "Group not found",
			})
			return
		}
		response.SendJsonResponse(w, http.StatusInternalServerError, response.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to archive group",
		})
		return
	}

	response.SendJsonResponse(w, http.StatusOK, response.SuccessResponse{
		Message: "Group archived successfully",
		Data:    group,
	})
}
