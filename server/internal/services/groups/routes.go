package groups

import (
	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type Service struct {
	db *lib.DB
}

func GroupsRouter(database *lib.DB) *chi.Mux {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/all", s.allHandler)
	r.Post("/create", s.createHandler)
	r.With(lib.RequireGroupMember(database)).Get("/{groupID}", s.getHandler)
	r.With(lib.RequireGroupOwner(database)).Patch("/{groupID}", s.editHandler)
	r.With(lib.RequireGroupOwner(database)).Delete("/{groupID}", s.archiveHandler)

	return r
}
