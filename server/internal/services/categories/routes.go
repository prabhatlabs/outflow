package categories

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type Service struct {
	db *lib.DB
}

// CategoriesRouter mounts group-scoped category routes under {groupID}.
// Callers must apply the group membership middleware at the {groupID} level.
func CategoriesRouter(database *lib.DB) http.Handler {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/", s.listHandler)
	r.Post("/", s.createHandler)
	r.Get("/{categoryID}", s.getHandler)
	r.Patch("/{categoryID}", s.editHandler)
	r.Delete("/{categoryID}", s.deleteHandler)

	return r
}
