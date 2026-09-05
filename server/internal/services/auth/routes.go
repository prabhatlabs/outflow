package auth

import (
	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type Service struct {
	db *lib.DB
}

func AuthRouter(database *lib.DB) *chi.Mux {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/login/google", s.oauthGoogleLogin)
	r.Get("/callback/google", s.oauthGoogleCallback)

	r.Post("/login/email", s.emailMagicLinkLogin)
	r.Get("/callback/email", s.emailMagicLinkCallback)

	return r
}
