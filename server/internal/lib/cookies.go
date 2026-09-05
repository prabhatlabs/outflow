package lib

import (
	"net/http"
	"time"
)

const (
	AccessCookieName  = "access_token"
	RefreshCookieName = "refresh_token"
)

func SetAuthCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	http.SetCookie(w, authCookie(AccessCookieName, accessToken, AccessTokenTTL))
	http.SetCookie(w, authCookie(RefreshCookieName, refreshToken, RefreshTokenTTL))
}

func ClearAuthCookies(w http.ResponseWriter) {
	http.SetCookie(w, authCookie(AccessCookieName, "", -time.Hour))
	http.SetCookie(w, authCookie(RefreshCookieName, "", -time.Hour))
}

func authCookie(name, value string, ttl time.Duration) *http.Cookie {
	cookie := &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(ttl),
		MaxAge:   int(ttl.Seconds()),
	}

	if IsProd() {
		cookie.Secure = true
		if Envs.AUTH_COOKIE_DOMAIN != "" {
			cookie.Domain = Envs.AUTH_COOKIE_DOMAIN
		}
	}

	return cookie
}
