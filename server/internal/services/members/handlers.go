package members

import (
	"encoding/json/v2"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

func parseRole(s string) (db.GroupMemberRole, bool) {
	switch db.GroupMemberRole(s) {
	case db.GroupMemberRoleAdmin, db.GroupMemberRoleMember:
		return db.GroupMemberRole(s), true
	default:
		return "", false
	}
}

// getMemberInGroup loads a group_members row and ensures it belongs to the
// group from the URL.
func (s *Service) getMemberInGroup(w http.ResponseWriter, r *http.Request, groupID uuid.UUID) (db.GroupMember, bool) {
	memberID, ok := lib.UUIDParamFromRequest(r, w, "memberID")
	if !ok {
		return db.GroupMember{}, false
	}
	member, err := s.db.Q.GetGroupMemberByID(r.Context(), memberID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Member not found")
			return db.GroupMember{}, false
		}
		response.InternalServerError(w, err, "Failed to fetch member")
		return db.GroupMember{}, false
	}
	if member.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Member not found")
		return db.GroupMember{}, false
	}
	return member, true
}

func (s *Service) listHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	limit, offset := lib.ParsePagination(r)
	members, err := s.db.Q.ListGroupMembersWithUser(r.Context(), db.ListGroupMembersWithUserParams{
		GroupID:    lib.PGUUID(groupID),
		PageLimit:  limit,
		PageOffset: offset,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to fetch members")
		return
	}
	if members == nil {
		members = []db.ListGroupMembersWithUserRow{}
	}

	response.OK(w, "Members fetched successfully", members)
}

// roleHandler changes a member's role. Owner role is immutable; admins cannot
// touch the owner or other admins.
func (s *Service) roleHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	caller := lib.GroupMemberFromContextWithForbiddenErr(r.Context(), w)

	target, ok := s.getMemberInGroup(w, r, groupID)
	if !ok {
		return
	}
	if target.Role == db.GroupMemberRoleOwner {
		response.Forbidden(w, "The group owner's role cannot be changed")
		return
	}
	if caller.Role == db.GroupMemberRoleMember {
		response.Forbidden(w, "Only owners and admins can change roles")
		return
	}
	if caller.Role == db.GroupMemberRoleAdmin && target.Role == db.GroupMemberRoleAdmin {
		response.Forbidden(w, "Admins cannot change other admins")
		return
	}

	var req struct {
		Role string `json:"role"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}
	role, valid := parseRole(req.Role)
	if !valid {
		response.BadRequest(w, "role must be admin or member")
		return
	}

	updated, err := s.db.Q.UpdateGroupMemberRole(r.Context(), db.UpdateGroupMemberRoleParams{
		ID:   target.ID,
		Role: role,
	})
	if err != nil {
		response.InternalServerError(w, err, "Failed to update role")
		return
	}

	response.OK(w, "Member role updated successfully", updated)
}

// removeHandler revokes a member's access (status=removed).
func (s *Service) removeHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	caller := lib.GroupMemberFromContextWithForbiddenErr(r.Context(), w)

	target, ok := s.getMemberInGroup(w, r, groupID)
	if !ok {
		return
	}
	if target.Role == db.GroupMemberRoleOwner {
		response.Forbidden(w, "The group owner cannot be removed")
		return
	}
	if caller.Role == db.GroupMemberRoleMember && target.ID != caller.ID {
		response.Forbidden(w, "Members cannot remove other members")
		return
	}
	if caller.Role == db.GroupMemberRoleAdmin && target.Role == db.GroupMemberRoleAdmin {
		response.Forbidden(w, "Admins cannot remove other admins")
		return
	}

	updated, err := s.db.Q.RemoveGroupMember(r.Context(), target.ID)
	if err != nil {
		response.InternalServerError(w, err, "Failed to remove member")
		return
	}

	response.OK(w, "Member removed successfully", updated)
}

// leaveHandler lets the calling member leave (owners cannot).
func (s *Service) leaveHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	member, err := s.db.Q.GetGroupMemberByUserAndGroup(r.Context(), db.GetGroupMemberByUserAndGroupParams{
		UserID:  lib.PGUUID(userID),
		GroupID: lib.PGUUID(groupID),
	})
	if err != nil {
		response.NotFound(w, "You are not a member of this group")
		return
	}
	if member.Role == db.GroupMemberRoleOwner {
		response.Forbidden(w, "The group owner cannot leave; archive the group instead")
		return
	}

	updated, err := s.db.Q.LeaveGroupMember(r.Context(), member.ID)
	if err != nil {
		response.InternalServerError(w, err, "Failed to leave group")
		return
	}

	response.OK(w, "Left the group", updated)
}
