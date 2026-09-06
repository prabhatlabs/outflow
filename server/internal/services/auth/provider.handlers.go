package auth

import (
	"encoding/json/v2"
	"errors"
	"log"
	"net/http"
	"net/mail"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
	"github.com/prabhatlabs/outflow/internal/lib/email"
	"github.com/prabhatlabs/outflow/internal/lib/response"
	"golang.org/x/oauth2"
	googleoauth "google.golang.org/api/oauth2/v2"
	"google.golang.org/api/option"
)

func (s *Service) oauthGoogleLogin(w http.ResponseWriter, r *http.Request) {
	oauthState := generateState()
	u := newOauthConfig().AuthCodeURL(oauthState, oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	http.Redirect(w, r, u, http.StatusTemporaryRedirect)
}

func (s *Service) oauthGoogleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Code not found", http.StatusBadRequest)
		return
	}

	googleOauthConfig := newOauthConfig()

	token, err := googleOauthConfig.Exchange(ctx, code)
	if err != nil {
		http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
		return
	}

	client := googleOauthConfig.Client(ctx, token)

	oauth2Service, err := googleoauth.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		http.Error(w, "Failed to create OAuth service: "+err.Error(), http.StatusInternalServerError)
		return
	}

	userInfo, err := oauth2Service.Userinfo.V2.Me.Get().Do()
	if err != nil {
		http.Error(w, "Failed to get user info: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if userInfo.Email == "" || userInfo.Id == "" {
		response.BadRequest(w, "Google account is missing email or id")
		return
	}

	user, err := s.createUserIfNotExists(ctx, createUserIfNotExistsInput{
		Email:             userInfo.Email,
		FirstName:         googleFirstName(userInfo),
		LastName:          userInfo.FamilyName,
		AvatarURL:         userInfo.Picture,
		Provider:          db.LoginProviderGoogle,
		ProviderAccountID: userInfo.Id,
		EmailVerified:     userInfo.VerifiedEmail != nil && *userInfo.VerifiedEmail,
	})
	if err != nil {
		response.InternalServerError(w, "Failed to create user")
		return
	}

	if err := s.issueSession(w, user.ID); err != nil {
		response.InternalServerError(w, "Failed to create session")
		return
	}

	http.Redirect(w, r, lib.Envs.FRONTEND_URL, http.StatusFound)
}

func (s *Service) emailMagicLinkLogin(w http.ResponseWriter, r *http.Request) {
	var reqData struct {
		Email string `json:"email"`
	}

	if err := json.UnmarshalRead(r.Body, &reqData); err != nil {
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	// checking if the email address is valid
	emailAddr := normalizeEmail(reqData.Email)
	if _, err := mail.ParseAddress(emailAddr); err != nil || !strings.Contains(emailAddr, "@") {
		response.BadRequest(w, "Invalid email address")
		return
	}

	code, err := s.createEmailLoginCode(r.Context(), emailAddr)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		// an unexpired code is still on file for this email; keep the old
		// link working instead of sending a fresh email
		response.OK(w, "Sign-in link sent to your email", nil)
		return
	case err != nil:
		log.Printf("auth: create email login code for %s: %v", emailAddr, err)
		response.InternalServerError(w, "Failed to create login code")
		return
	}

	link := strings.TrimRight(lib.Envs.SERVER_URL, "/") + "/auth/callback/email?code=" + code.String()
	if err := email.SendMagicLink(emailAddr, link, int(EmailLoginCodeTTL.Minutes())); err != nil {
		log.Printf("auth: send magic link to %s: %v", emailAddr, err)
		response.InternalServerError(w, "Failed to send login email")
		return
	}

	response.OK(w, "Sign-in link sent to your email", nil)
}

func (s *Service) emailMagicLinkCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	code, err := uuid.Parse(r.URL.Query().Get("code"))
	if err != nil {
		response.Unauthorized(w, "Invalid or expired code")
		return
	}

	emailAddr, err := s.consumeEmailLoginCode(ctx, code)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			log.Printf("auth: consume email login code: %v", err)
		}
		response.Unauthorized(w, "Invalid or expired code")
		return
	}

	user, err := s.createUserIfNotExists(ctx, createUserIfNotExistsInput{
		Email:             emailAddr,
		FirstName:         emailLocal(emailAddr),
		Provider:          db.LoginProviderEmail,
		ProviderAccountID: emailAddr,
		EmailVerified:     true,
	})
	if err != nil {
		log.Printf("auth: magic link login for %s: %v", emailAddr, err)
		response.InternalServerError(w, "Failed to create user")
		return
	}

	if err := s.issueSession(w, user.ID); err != nil {
		response.InternalServerError(w, "Failed to create session")
		return
	}

	http.Redirect(w, r, lib.Envs.FRONTEND_URL, http.StatusFound)
}
