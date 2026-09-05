package lib

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

type ctxKey string

const userIDKey ctxKey = "userID"

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)
	return id, ok
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(AccessCookieName)
		if err != nil {
			response.SendJsonResponse(w, http.StatusUnauthorized, response.ErrorResponse{
				Error:   "Unauthorized",
				Message: "Authentication required",
			})
			return
		}

		claims, err := ParseAccessToken(cookie.Value)
		if err != nil {
			response.SendJsonResponse(w, http.StatusUnauthorized, response.ErrorResponse{
				Error:   "Unauthorized",
				Message: "Invalid or expired session",
			})
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, claims.UserID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
