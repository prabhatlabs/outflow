package budgets

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type Service struct {
	db *lib.DB
}

// GroupBudgetsRouter mounts group-scoped budget routes under {groupID}.
// Callers must apply the group membership middleware at the {groupID} level.
func GroupBudgetsRouter(database *lib.DB) http.Handler {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/", s.groupListHandler)
	r.Post("/", s.groupCreateHandler)
	r.Get("/{budgetID}", s.groupGetHandler)
	r.Patch("/{budgetID}", s.groupEditHandler)
	r.Delete("/{budgetID}", s.groupDeleteHandler)

	return r
}

// PersonalBudgetsRouter mounts user-scoped budget routes (no group context).
func PersonalBudgetsRouter(database *lib.DB) http.Handler {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/", s.personalListHandler)
	r.Post("/", s.personalCreateHandler)
	r.Get("/{budgetID}", s.personalGetHandler)
	r.Patch("/{budgetID}", s.personalEditHandler)
	r.Delete("/{budgetID}", s.personalDeleteHandler)

	return r
}
