package invitations

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type Service struct {
	db *lib.DB
}

// InvitationsRouter mounts group-scoped invitation routes under {groupID}.
// Membership is enforced by middleware at the {groupID} level.
func InvitationsRouter(database *lib.DB) http.Handler {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/", s.listHandler)
	r.Post("/", s.createHandler)
	r.Delete("/{invitationID}", s.cancelHandler)

	return r
}

// UserInvitationsRouter mounts the caller's own invitation routes.
func UserInvitationsRouter(database *lib.DB) http.Handler {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/pending", s.pendingHandler)
	r.Post("/accept", s.acceptHandler)
	r.Post("/reject", s.rejectHandler)

	return r
}
