package auth

import (
	"crypto/rand"
	"encoding/base64"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	googleoauth "google.golang.org/api/oauth2/v2"
)

func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)

	return state
}

func optionalText(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

func emailLocal(email string) string {
	if i := strings.IndexByte(email, '@'); i > 0 {
		return email[:i]
	}
	return email
}

func googleFirstName(userInfo *googleoauth.Userinfo) string {
	if userInfo.GivenName != "" {
		return userInfo.GivenName
	}
	if userInfo.Name != "" {
		return userInfo.Name
	}
	return emailLocal(userInfo.Email)
}
