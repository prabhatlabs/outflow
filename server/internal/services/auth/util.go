package auth

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/lib"
	googleoauth "google.golang.org/api/oauth2/v2"
)

func generateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)

	return state
}

func normalizeEmail(raw string) string {
	return strings.ToLower(strings.TrimSpace(raw))
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

func (s *Service) issueSession(w http.ResponseWriter, userID pgtype.UUID) error {
	id := uuid.UUID(userID.Bytes)
	accessToken, err := lib.GenerateAccessToken(id)
	if err != nil {
		return err
	}
	refreshToken, err := lib.GenerateRefreshToken(id)
	if err != nil {
		return err
	}

	lib.SetAuthCookies(w, accessToken, refreshToken)
	return nil
}
