package groups

import (
	"github.com/go-chi/chi/v5"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/services/budgets"
	"github.com/prabhatlabs/outflow/internal/services/categories"
	"github.com/prabhatlabs/outflow/internal/services/expenses"
	"github.com/prabhatlabs/outflow/internal/services/invitations"
	"github.com/prabhatlabs/outflow/internal/services/members"
	"github.com/prabhatlabs/outflow/internal/services/settlements"
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

	// group-scoped sub-resources: membership is enforced at the {groupID}
	// level, ownership checks happen per-route inside each sub-router
	r.Route("/{groupID}", func(r chi.Router) {
		r.Use(lib.RequireGroupMember(database))

		r.Get("/balances", s.balancesHandler)
		r.Mount("/categories", categories.CategoriesRouter(database))
		r.Mount("/expenses", expenses.ExpensesRouter(database))
		r.Mount("/settlements", settlements.SettlementsRouter(database))
		r.Mount("/budgets", budgets.GroupBudgetsRouter(database))
		r.Mount("/members", members.MembersRouter(database))
		r.Mount("/invitations", invitations.InvitationsRouter(database))
	})

	return r
}
