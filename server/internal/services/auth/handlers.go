package auth

import (
	"encoding/json/v2"
	"net/http"

	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
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
		response.SendJsonResponse(w, http.StatusBadRequest, response.ErrorResponse{
			Error:   "Bad Request",
			Message: "Google account is missing email or id",
		})
		return
	}

	user, err := s.createUser(ctx, createUserInput{
		Email:             userInfo.Email,
		FirstName:         googleFirstName(userInfo),
		LastName:          userInfo.FamilyName,
		AvatarURL:         userInfo.Picture,
		Provider:          db.LoginProviderGoogle,
		ProviderAccountID: userInfo.Id,
		EmailVerified:     userInfo.VerifiedEmail != nil && *userInfo.VerifiedEmail,
	})
	if err != nil {
		response.SendJsonResponse(w, http.StatusInternalServerError, response.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to create user",
		})
		return
	}

	if err := s.issueSession(w, user.ID); err != nil {
		response.SendJsonResponse(w, http.StatusInternalServerError, response.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to create session",
		})
		return
	}

	http.Redirect(w, r, lib.Envs.FRONTEND_URL, http.StatusFound)
}

func (s *Service) emailMagicLinkLogin(w http.ResponseWriter, r *http.Request) {
	var reqData struct {
		Email string `json:"email"`
	}

	if err := json.UnmarshalRead(r.Body, &reqData); err != nil {
		response.SendJsonResponse(w, http.StatusBadRequest, response.ErrorResponse{
			Error:   "Bad Request",
			Message: "Invalid JSON payload",
		})
		return
	}

	// ---> generate code, save code with mail and send mail with resend <---
	// link = `/callback/email?code=<code>`

	response.SendJsonResponse(w, http.StatusOK, response.SuccessResponse{
		Message: "Magic link sent to your email",
		Data:    nil,
	})
}

func (s *Service) emailMagicLinkCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Code not found", http.StatusBadRequest)
		return
	}

	// ---> verify code <---
	email := ""
	if email == "" {
		response.SendJsonResponse(w, http.StatusUnauthorized, response.ErrorResponse{
			Error:   "Unauthorized",
			Message: "Invalid or expired code",
		})
		return
	}

	user, err := s.createUser(r.Context(), createUserInput{
		Email:             email,
		FirstName:         emailLocal(email),
		Provider:          db.LoginProviderEmail,
		ProviderAccountID: email,
		EmailVerified:     true,
	})
	if err != nil {
		response.SendJsonResponse(w, http.StatusInternalServerError, response.ErrorResponse{
			Error:   "Internal Server Error",
			Message: "Failed to create user",
		})
		return
	}

	response.SendJsonResponse(w, http.StatusOK, response.SuccessResponse{
		Message: "Logged in",
		Data:    user,
	})
}
