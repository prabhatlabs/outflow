package auth

import (
	"encoding/json/v2"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

func (s *Service) me(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)

	user, err := s.db.Q.GetUserByID(r.Context(), lib.PGUUID(userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.Unauthorized(w, "User not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch user")
		return
	}

	response.OK(w, "User fetched successfully", user)
}

func (s *Service) updateMe(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	if userID == uuid.Nil {
		return
	}

	var req struct {
		FirstName *string `json:"first_name"`
		LastName  *string `json:"last_name"`
		AvatarURL *string `json:"avatar_url"`
		Timezone  *string `json:"timezone"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	params := db.UpdateUserParams{ID: lib.PGUUID(userID)}
	updated := false

	if req.FirstName != nil {
		name := strings.TrimSpace(*req.FirstName)
		if name == "" {
			response.BadRequest(w, "First name cannot be empty")
			return
		}
		params.FirstName = lib.RequiredText(name)
		updated = true
	}
	if req.LastName != nil {
		params.LastName = lib.OptionalText(strings.TrimSpace(*req.LastName))
		updated = true
	}
	if req.AvatarURL != nil {
		params.AvatarUrl = lib.OptionalText(strings.TrimSpace(*req.AvatarURL))
		updated = true
	}
	if req.Timezone != nil {
		tz := strings.TrimSpace(*req.Timezone)
		if tz != "" {
			if _, err := time.LoadLocation(tz); err != nil {
				response.BadRequest(w, "Unknown timezone")
				return
			}
		}
		params.Timezone = lib.OptionalText(tz)
		updated = true
	}

	if !updated {
		response.BadRequest(w, "No fields to update")
		return
	}

	user, err := s.db.Q.UpdateUser(r.Context(), params)
	if err != nil {
		response.InternalServerError(w, err, "Failed to update user")
		return
	}

	response.OK(w, "User updated successfully", user)
}

func (s *Service) refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(lib.RefreshCookieName)
	if err != nil {
		response.Unauthorized(w, "Refresh token not found")
		return
	}

	claims, err := lib.ParseRefreshToken(cookie.Value)
	if err != nil {
		lib.ClearAuthCookies(w)
		response.Unauthorized(w, "Invalid or expired refresh token")
		return
	}

	if err := s.issueSession(w, lib.PGUUID(claims.UserID)); err != nil {
		response.InternalServerError(w, err, "Failed to issue tokens")
		return
	}

	response.OK(w, "Session refreshed", nil)
}

func (s *Service) logout(w http.ResponseWriter, r *http.Request) {
	lib.ClearAuthCookies(w)
	response.OK(w, "Logged out", nil)
}
