package lib

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

// UUIDParamFromRequest parses a chi URL param as a UUID, answering 400 when
// malformed. ok=false means a response has already been sent.
func UUIDParamFromRequest(r *http.Request, w http.ResponseWriter, param string) (pgtype.UUID, bool) {
	raw := chi.URLParam(r, param)
	id, err := uuid.Parse(raw)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid "+param)
		return pgtype.UUID{}, false
	}
	return PGUUID(id), true
}

// ParsePagination reads ?limit=&offset= with safe defaults: limit 20
// (clamped to [1, 50]) and offset >= 0.
func ParsePagination(r *http.Request) (limit, offset int32) {
	limit = 20
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			limit = int32(v)
		}
	}
	if limit < 1 {
		limit = 1
	}
	if limit > 50 {
		limit = 50
	}

	if raw := r.URL.Query().Get("offset"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			offset = int32(v)
		}
	}
	return limit, offset
}

// UUIDFromQuery parses a query-string UUID. Absent values return ok=false
// without sending a response.
func UUIDFromQuery(r *http.Request, key string) (pgtype.UUID, bool) {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return pgtype.UUID{}, false
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return pgtype.UUID{}, false
	}
	return PGUUID(id), true
}
