package auth

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

func (s *Service) me(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)

	user, err := s.db.Q.GetUserByID(r.Context(), pgtype.UUID{Bytes: userID, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.SendJsonResponse(w, http.StatusUnauthorized, response.ErrorResponse{
				Error:   "Unauthorized",
				Message: "User not found",
			})
			return
		}
		response.SendJsonResponse(w, http.StatusInternalServerError, response.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to fetch user",
		})
		return
	}

	response.SendJsonResponse(w, http.StatusOK, response.SuccessResponse{
		Message: "User fetched successfully",
		Data:    user,
	})
}

func (s *Service) refresh(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(lib.RefreshCookieName)
	if err != nil {
		response.SendJsonResponse(w, http.StatusUnauthorized, response.ErrorResponse{
			Error:   "Unauthorized",
			Message: "Refresh token not found",
		})
		return
	}

	claims, err := lib.ParseRefreshToken(cookie.Value)
	if err != nil {
		lib.ClearAuthCookies(w)
		response.SendJsonResponse(w, http.StatusUnauthorized, response.ErrorResponse{
			Error:   "Unauthorized",
			Message: "Invalid or expired refresh token",
		})
		return
	}

	if err := s.issueSession(w, pgtype.UUID{Bytes: claims.UserID, Valid: true}); err != nil {
		response.SendJsonResponse(w, http.StatusInternalServerError, response.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to issue tokens",
		})
		return
	}

	response.SendJsonResponse(w, http.StatusOK, response.SuccessResponse{
		Message: "Session refreshed",
		Data:    nil,
	})
}

func (s *Service) logout(w http.ResponseWriter, r *http.Request) {
	lib.ClearAuthCookies(w)
	response.SendJsonResponse(w, http.StatusOK, response.SuccessResponse{
		Message: "Logged out",
		Data:    nil,
	})
}
