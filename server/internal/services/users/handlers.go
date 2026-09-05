package users

import (
	"net/http"

	"github.com/prabhatlabs/outflow/internal/lib/response"
)

func (s *Service) userHandler(w http.ResponseWriter, r *http.Request) {
	response.SendJsonResponse(w, http.StatusOK, nil)
}
