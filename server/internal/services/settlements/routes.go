package settlements

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type Service struct {
	db *lib.DB
}

// SettlementsRouter mounts group-scoped settlement routes under {groupID}.
// Callers must apply the group membership middleware at the {groupID} level.
func SettlementsRouter(database *lib.DB) http.Handler {
	s := &Service{db: database}
	r := chi.NewRouter()

	r.Get("/", s.listHandler)
	r.Post("/", s.createHandler)
	r.Get("/{settlementID}", s.getHandler)
	// DELETE /{settlementID} disabled: settlements are immutable payment receipts.
	// Deleting would reverse `settled` and re-expose debt (`net = paid - owed - settled`).
	// To correct a mistake, create an inverse settlement. Future: attach receipt (image/pdf/doc).
	// r.Delete("/{settlementID}", s.deleteHandler)

	return r
}
