package main

import (
	"context"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/services/auth"
	"github.com/prabhatlabs/outflow/internal/services/users"
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

	r.Mount("/auth", auth.AuthRouter(database))
	r.Mount("/users", users.UserRouter(database))

	http.ListenAndServe(":3000", r)
}
