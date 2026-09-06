package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/services/auth"
	"github.com/prabhatlabs/outflow/internal/services/groups"
)

func main() {
	if err := lib.LoadEnv(); err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	database, err := lib.ConnectDB(ctx, lib.Envs.DATABASE_URL)
	if err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{lib.Envs.FRONTEND_URL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Accept"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Mount("/auth", auth.AuthRouter(database))

	r.Group(func(r chi.Router) {
		r.Use(lib.AuthMiddleware)

		r.Mount("/groups", groups.GroupsRouter(database))
	})

	http.ListenAndServe(":3000", r)
}
