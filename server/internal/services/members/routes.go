package members

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type Service struct {
	db *lib.DB
}

// MembersRouter mounts group-scoped member routes under {groupID}.
// Callers must apply the group membership middleware at the {groupID} level.
func MembersRouter(database *lib.DB) http.Handler {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/", s.listHandler)
	r.Post("/leave", s.leaveHandler)
	r.Patch("/{memberID}/role", s.roleHandler)
	r.Delete("/{memberID}", s.removeHandler)

	return r
}
