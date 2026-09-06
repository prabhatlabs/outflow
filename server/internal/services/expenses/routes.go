package expenses

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type Service struct {
	db *lib.DB
}

// ExpensesRouter mounts group-scoped expense routes under {groupID}.
// Callers must apply the group membership middleware at the {groupID} level.
func ExpensesRouter(database *lib.DB) http.Handler {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/", s.listHandler)
	r.Post("/", s.createHandler)
	r.Get("/{expenseID}", s.getHandler)
	r.Patch("/{expenseID}", s.editHandler)
	r.Post("/{expenseID}/archive", s.archiveHandler)
	r.Post("/{expenseID}/unarchive", s.unarchiveHandler)
	r.Delete("/{expenseID}", s.deleteHandler)

	return r
}
