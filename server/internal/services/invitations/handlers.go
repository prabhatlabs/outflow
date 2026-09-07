package invitations

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json/v2"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/email"
	"github.com/prabhatlabs/outflow/internal/lib/response"
)

const defaultExpiryHours = 24

// generateToken returns (raw, sha256hex). Only the hash is stored; the raw
// value goes into the emailed link.
func generateToken() (string, string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	raw := hex.EncodeToString(b)
	sum := sha256.Sum256([]byte(raw))
	return raw, hex.EncodeToString(sum[:]), nil
}

func (s *Service) getInvitationInGroup(w http.ResponseWriter, r *http.Request, groupID uuid.UUID) (db.Invitation, bool) {
	invID, ok := lib.UUIDParamFromRequest(r, w, "invitationID")
	if !ok {
		return db.Invitation{}, false
	}
	inv, err := s.db.Q.GetInvitationByID(r.Context(), invID)
	if err != nil {
		response.NotFound(w, "Invitation not found")
		return db.Invitation{}, false
	}
	if inv.GroupID != lib.PGUUID(groupID) {
		response.NotFound(w, "Invitation not found")
		return db.Invitation{}, false
	}
	return inv, true
}

func (s *Service) listHandler(w http.ResponseWriter, r *http.Request) {
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	limit, offset := lib.ParsePagination(r)
	invitations, err := s.db.Q.ListInvitationsByGroupID(r.Context(), db.ListInvitationsByGroupIDParams{
		GroupID:    lib.PGUUID(groupID),
		PageLimit:  limit,
		PageOffset: offset,
	})
	if err != nil {
		response.InternalServerError(w, "Failed to fetch invitations")
		return
	}
	if invitations == nil {
		invitations = []db.Invitation{}
	}

	response.OK(w, "Invitations fetched successfully", invitations)
}

func (s *Service) createHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	member := lib.GroupMemberFromContextWithForbiddenErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}
	if member.Role == db.GroupMemberRoleMember {
		response.Forbidden(w, "Only owners and admins can invite people")
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	emailAddr := normalizeEmail(req.Email)
	if !strings.Contains(emailAddr, "@") || emailAddr == "" {
		response.BadRequest(w, "Invalid email address")
		return
	}

	group, err := s.db.Q.GetGroupByID(r.Context(), lib.PGUUID(groupID))
	if err != nil {
		response.NotFound(w, "Group not found")
		return
	}
	inviter, err := s.db.Q.GetUserByID(r.Context(), lib.PGUUID(userID))
	if err != nil {
		response.InternalServerError(w, "Failed to fetch inviter")
		return
	}

	rawToken, tokenHash, err := generateToken()
	if err != nil {
		response.InternalServerError(w, "Failed to generate invitation token")
		return
	}

	expiresAt := pgtype.Timestamptz{
		Time:  time.Now().Add(defaultExpiryHours * time.Hour),
		Valid: true,
	}

	inv, err := s.db.Q.CreateInvitation(r.Context(), db.CreateInvitationParams{
		GroupID:   lib.PGUUID(groupID),
		InvitedBy: lib.PGUUID(userID),
		Email:     emailAddr,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		// pending duplicate or other constraint
		if strings.Contains(err.Error(), "duplicate key") {
			response.Conflict(w, "An invitation for this email already exists")
			return
		}
		response.InternalServerError(w, "Failed to create invitation")
		return
	}

	inviteURL := strings.TrimRight(lib.Envs.FRONTEND_URL, "/") + "/invitations?token=" + rawToken
	if err := email.SendInvite(emailAddr, group.Name, displayName(inviter), inviteURL, defaultExpiryHours); err != nil {
		// the invitation row stays; the inviter can resend later or share URL
		log.Printf("invitations: send invite to %s: %v", emailAddr, err)
	}

	response.Created(w, "Invitation sent", inv)
}

func displayName(u db.User) string {
	if u.LastName.Valid && strings.TrimSpace(u.LastName.String) != "" {
		return u.FirstName + " " + u.LastName.String
	}
	return u.FirstName
}

func normalizeEmail(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// cancelHandler withdraws a pending invitation (inviter or owner only).
func (s *Service) cancelHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)
	groupID := lib.GroupIDFromContextWithNotFoundErr(r.Context(), w)
	member := lib.GroupMemberFromContextWithForbiddenErr(r.Context(), w)
	if groupID == uuid.Nil {
		return
	}

	inv, ok := s.getInvitationInGroup(w, r, groupID)
	if !ok {
		return
	}
	if inv.InvitedBy != lib.PGUUID(userID) && member.Role != db.GroupMemberRoleOwner {
		response.Forbidden(w, "Only the inviter or the group owner can cancel this invitation")
		return
	}
	if inv.Status != db.InvitationStatusPending {
		response.BadRequest(w, "Only pending invitations can be cancelled")
		return
	}

	cancelled, err := s.db.Q.CancelInvitation(r.Context(), inv.ID)
	if err != nil {
		response.InternalServerError(w, "Failed to cancel invitation")
		return
	}

	response.OK(w, "Invitation cancelled", cancelled)
}

// pendingHandler lists invitations addressed to the caller's email, marking
// overdue ones as expired first.
func (s *Service) pendingHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)

	user, err := s.db.Q.GetUserByID(r.Context(), lib.PGUUID(userID))
	if err != nil {
		response.InternalServerError(w, "Failed to fetch user")
		return
	}

	if err := s.db.Q.ExpireOverdueInvitations(r.Context()); err != nil {
		log.Printf("invitations: expire overdue: %v", err)
	}

	limit, offset := lib.ParsePagination(r)
	pending, err := s.db.Q.ListPendingInvitationsByEmail(r.Context(), db.ListPendingInvitationsByEmailParams{
		Lower:      user.Email,
		PageLimit:  limit,
		PageOffset: offset,
	})
	if err != nil {
		response.InternalServerError(w, "Failed to fetch invitations")
		return
	}
	if pending == nil {
		pending = []db.Invitation{}
	}

	response.OK(w, "Pending invitations fetched successfully", pending)
}

// acceptHandler redeems an invitation token: the caller becomes an active
// member of the group.
func (s *Service) acceptHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)

	var req struct {
		Token string `json:"token"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}
	if req.Token == "" {
		response.BadRequest(w, "token is required")
		return
	}

	sum := sha256.Sum256([]byte(strings.TrimSpace(req.Token)))
	inv, err := s.db.Q.GetInvitationByTokenHash(r.Context(), hex.EncodeToString(sum[:]))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			response.NotFound(w, "Invitation not found")
			return
		}
		response.InternalServerError(w, "Failed to fetch invitation")
		return
	}
	if inv.Status != db.InvitationStatusPending {
		response.BadRequest(w, "This invitation is no longer pending")
		return
	}
	if !inv.ExpiresAt.Valid || inv.ExpiresAt.Time.Before(time.Now()) {
		response.BadRequest(w, "This invitation has expired")
		return
	}

	user, err := s.db.Q.GetUserByID(r.Context(), lib.PGUUID(userID))
	if err != nil {
		response.InternalServerError(w, "Failed to fetch user")
		return
	}
	if !strings.EqualFold(user.Email, inv.Email) {
		response.Forbidden(w, "This invitation was sent to a different email")
		return
	}

	err = s.db.WithTx(r.Context(), func(q *db.Queries) error {
		if _, err := q.AcceptInvitation(r.Context(), inv.ID); err != nil {
			return err
		}
		existing, err := q.GetGroupMemberByUserAndGroup(r.Context(), db.GetGroupMemberByUserAndGroupParams{
			UserID:  lib.PGUUID(userID),
			GroupID: inv.GroupID,
		})
		if err == nil {
			if existing.Status == db.GroupMemberStatusActive {
				return errAlreadyMember
			}
			_, err = q.ActivateGroupMember(r.Context(), existing.ID)
			return err
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		_, err = q.CreateGroupMember(r.Context(), db.CreateGroupMemberParams{
			UserID:    lib.PGUUID(userID),
			GroupID:   inv.GroupID,
			Role:      db.GroupMemberRoleMember,
			Status:    db.GroupMemberStatusActive,
			InvitedBy: inv.InvitedBy,
		})
		return err
	})
	if err != nil {
		if errors.Is(err, errAlreadyMember) {
			response.Conflict(w, "You are already a member of this group")
			return
		}
		response.InternalServerError(w, "Failed to accept invitation")
		return
	}

	group, _ := s.db.Q.GetGroupByID(r.Context(), inv.GroupID)

	response.OK(w, "Invitation accepted", group)
}

var errAlreadyMember = errors.New("already a member")

// rejectHandler declines an invitation addressed to the caller's email.
func (s *Service) rejectHandler(w http.ResponseWriter, r *http.Request) {
	userID := lib.UserIDFromContextWithUnauthorizedErr(r.Context(), w)

	var req struct {
		ID string `json:"id"`
	}
	if err := json.UnmarshalRead(r.Body, &req); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}
	id, err := uuid.Parse(req.ID)
	if err != nil {
		response.BadRequest(w, "id is invalid")
		return
	}

	inv, err := s.db.Q.GetInvitationByID(r.Context(), lib.PGUUID(id))
	if err != nil {
		response.NotFound(w, "Invitation not found")
		return
	}
	user, err := s.db.Q.GetUserByID(r.Context(), lib.PGUUID(userID))
	if err != nil {
		response.InternalServerError(w, "Failed to fetch user")
		return
	}
	if !strings.EqualFold(user.Email, inv.Email) {
		response.Forbidden(w, "This invitation was sent to a different email")
		return
	}
	if inv.Status != db.InvitationStatusPending {
		response.BadRequest(w, "Only pending invitations can be rejected")
		return
	}

	rejected, err := s.db.Q.RejectInvitation(r.Context(), inv.ID)
	if err != nil {
		response.InternalServerError(w, "Failed to reject invitation")
		return
	}

	response.OK(w, "Invitation rejected", rejected)
}
