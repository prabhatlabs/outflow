package categories

import (
	"encoding/json/v2"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

func (s *Service) listHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	limit, offset := lib.ParsePagination(r)
	categories, err := s.db.Q.ListCategoriesByGroupID(r.Context(), db.ListCategoriesByGroupIDParams{
		GroupID:    lib.PGUUID(groupID),
		PageLimit:  limit,
		PageOffset: offset,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch categories")
		return
	}
	if categories == nil {
		categories = []db.Category{}
	}

	response.OK(w, "Categories fetched successfully", categories)
}

func (s *Service) createHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	var req struct {
		Name  string `json:"name"`
		Icon  string `json:"icon"`
		Color string `json:"color"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		response.BadRequest(w, "Category name is required")
		return
	}
	color := strings.TrimSpace(req.Color)
	if color == "" {
		response.BadRequest(w, "Category color is required")
		return
	}

	// same name in the same group = conflict
	existing, err := s.db.Q.GetCategoryByNameAndGroup(r.Context(), db.GetCategoryByNameAndGroupParams{
		Name:    name,
		GroupID: lib.PGUUID(groupID),
	})
	if err == nil && existing.ID.Valid {
		response.Conflict(w, "A category with this name already exists")
		return
	} else if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		response.InternalServerError(w, err, "Failed to check existing category")
		return
	}

	category, err := s.db.Q.CreateCategory(r.Context(), db.CreateCategoryParams{
		GroupID:   lib.PGUUID(groupID),
		CreatedBy: lib.PGUUID(userID),
		Name:      name,
		Icon:      lib.OptionalText(strings.TrimSpace(req.Icon)),
		Color:     color,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to create category")
		return
	}

	response.Created(w, "Category created successfully", category)
}

func (s *Service) getHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	categoryID, ok := lib.UUIDParamFromRequest(r, w, "categoryID")
	if !ok {
		return
	}

	category, err := s.db.Q.GetCategoryByID(r.Context(), categoryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Category not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch category")
		return
	}
	if category.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Category not found")
		return
	}

	response.OK(w, "Category fetched successfully", category)
}

func (s *Service) editHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	categoryID, ok := lib.UUIDParamFromRequest(r, w, "categoryID")
	if !ok {
		return
	}

	var req struct {
		Name  *string `json:"name"`
		Icon  *string `json:"icon"`
		Color *string `json:"color"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	category, err := s.db.Q.GetCategoryByID(r.Context(), categoryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Category not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch category")
		return
	}
	if category.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Category not found")
		return
	}

	params := db.UpdateCategoryParams{ID: categoryID}
	updated := false

	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if name == "" {
			response.BadRequest(w, "Category name cannot be empty")
			return
		}
		if name != category.Name {
			dup, err := s.db.Q.GetCategoryByNameAndGroup(r.Context(), db.GetCategoryByNameAndGroupParams{
				Name:    name,
				GroupID: lib.PGUUID(groupID),
			})
			if err == nil && dup.ID.Valid && dup.ID != categoryID {
				response.Conflict(w, "A category with this name already exists")
				return
			}
		}
		params.Name = lib.RequiredText(name)
		updated = true
	}
	if req.Color != nil {
		color := strings.TrimSpace(*req.Color)
		if color == "" {
			response.BadRequest(w, "Category color cannot be empty")
			return
		}
		params.Color = lib.RequiredText(color)
		updated = true
	}
	if req.Icon != nil {
		params.Icon = lib.OptionalText(strings.TrimSpace(*req.Icon))
		updated = true
	}

	if !updated {
		response.BadRequest(w, "No fields to update")
		return
	}

	category, err = s.db.Q.UpdateCategory(r.Context(), params)
	if err != nil {
		response.InternalServerError(w, err, "Failed to update category")
		return
	}

	response.OK(w, "Category updated successfully", category)
}

func (s *Service) deleteHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	categoryID, ok := lib.UUIDParamFromRequest(r, w, "categoryID")
	if !ok {
		return
	}

	category, err := s.db.Q.GetCategoryByID(r.Context(), categoryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Category not found")
			return
		}
		response.InternalServerError(w, err, "Failed to fetch category")
		return
	}
	if category.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Category not found")
		return
	}

	if err := s.db.Q.DeleteCategory(r.Context(), categoryID); err != nil {
		response.InternalServerError(w, err, "Failed to delete category")
		return
	}

	response.OK(w, "Category deleted successfully", nil)
}
