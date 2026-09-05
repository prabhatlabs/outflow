package auth

import (
	"github.com/prabhatlabs/outflow/internal/lib"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func newOauthConfig() *oauth2.Config {
	Envs := lib.Envs

	return &oauth2.Config{
		ClientID:     Envs.GOOGLE_CLIENT_ID,
		ClientSecret: Envs.GOOGLE_CLIENT_SECRET,
		RedirectURL:  Envs.AUTH_REDIRECT_URL, // <- callback url
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"},
		Endpoint:     google.Endpoint,
	}
}
