package lib

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

type ctxKey string

const userIDKey ctxKey = "userID"

const groupIDKey ctxKey = "groupID"

const groupMemberKey ctxKey = "groupMember"

func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)
	return id, ok
}

func UserIDFromContextWithUnauthorizedErr(ctx context.Context, w http.ResponseWriter) uuid.UUID {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		response.SendJsonResponse(w, http.StatusUnauthorized, response.ErrorResponse{
			Error:   "Unauthorized",
			Message: "Authentication required",
		})
		return uuid.Nil
	}
	return userID
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

func GroupIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(groupIDKey).(uuid.UUID)
	return id, ok
}

func GroupIDFromContextWithNotFoundErr(ctx context.Context, w http.ResponseWriter) uuid.UUID {
	groupID, ok := GroupIDFromContext(ctx)
	if !ok {
		response.SendJsonResponse(w, http.StatusNotFound, response.ErrorResponse{
			Error:   "Not Found",
			Message: "Group not found",
		})
		return uuid.Nil
	}
	return groupID
}

func GroupMemberFromContext(ctx context.Context) (db.GroupMember, bool) {
	member, ok := ctx.Value(groupMemberKey).(db.GroupMember)
	return member, ok
}

func GroupMemberFromContextWithForbiddenErr(ctx context.Context, w http.ResponseWriter) db.GroupMember {
	member, ok := GroupMemberFromContext(ctx)
	if !ok {
		response.SendJsonResponse(w, http.StatusForbidden, response.ErrorResponse{
			Error:   "Forbidden",
			Message: "Access denied",
		})
		return db.GroupMember{}
	}
	return member
}

func parseGroupIDParam(r *http.Request) (pgtype.UUID, uuid.UUID, error) {
	raw := chi.URLParam(r, "groupID")
	id, err := uuid.Parse(raw)
	if err != nil {
		return pgtype.UUID{}, uuid.Nil, err
	}
	return pgtype.UUID{Bytes: id, Valid: true}, id, nil
}

func requireGroupMembership(database *DB, requireOwner bool, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, ok := UserIDFromContext(r.Context())
		if !ok {
			response.SendJsonResponse(w, http.StatusUnauthorized, response.ErrorResponse{
				Error:   "Unauthorized",
				Message: "Authentication required",
			})
			return
		}

		groupPgID, groupID, err := parseGroupIDParam(r)
		if err != nil {
			response.SendJsonResponse(w, http.StatusBadRequest, response.ErrorResponse{
				Error:   "Bad Request",
				Message: "Invalid group ID",
			})
			return
		}

		member, err := database.Q.GetGroupMemberByUserAndGroup(r.Context(), db.GetGroupMemberByUserAndGroupParams{
			UserID:  pgtype.UUID{Bytes: userID, Valid: true},
			GroupID: groupPgID,
		})
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
				Message: "Failed to verify group membership",
			})
			return
		}

		if member.Status != db.GroupMemberStatusActive {
			response.SendJsonResponse(w, http.StatusForbidden, response.ErrorResponse{
				Error:   "Forbidden",
				Message: "You are no longer a member of this group",
			})
			return
		}

		if requireOwner && member.Role != db.GroupMemberRoleOwner {
			response.SendJsonResponse(w, http.StatusForbidden, response.ErrorResponse{
				Error:   "Forbidden",
				Message: "Only group owners can perform this action",
			})
			return
		}

		ctx := context.WithValue(r.Context(), groupIDKey, groupID)
		ctx = context.WithValue(ctx, groupMemberKey, member)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireGroupMember allows any active member of the {groupID} group.
func RequireGroupMember(database *DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return requireGroupMembership(database, false, next)
	}
}

// RequireGroupOwner allows only owners of the {groupID} group.
func RequireGroupOwner(database *DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return requireGroupMembership(database, true, next)
	}
}
