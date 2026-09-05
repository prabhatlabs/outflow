package users

import (
	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type Service struct {
	db *lib.DB
}

func UserRouter(database *lib.DB) *chi.Mux {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/", s.userHandler)

	return r
}
