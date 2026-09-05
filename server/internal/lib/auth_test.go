package lib

import (
	"net/http/httptest"
	"testing"
)

func TestTokenRoundTrip(t *testing.T) {
	Envs = &EnvsType{
		JWT_ACCESS_SECRET:  "test-access-secret",
		JWT_REFRESH_SECRET: "test-refresh-secret",
	}

	id := mustUUID()

	access, err := GenerateAccessToken(id)
	if err != nil {
		t.Fatalf("GenerateAccessToken: %v", err)
	}
	refresh, err := GenerateRefreshToken(id)
	if err != nil {
		t.Fatalf("GenerateRefreshToken: %v", err)
	}

	accClaims, err := ParseAccessToken(access)
	if err != nil {
		t.Fatalf("ParseAccessToken: %v", err)
	}
	if accClaims.UserID != id {
		t.Fatalf("user id mismatch: got %v want %v", accClaims.UserID, id)
	}
	if accClaims.Type != TokenTypeAccess {
		t.Fatalf("expected access type, got %q", accClaims.Type)
	}

	refClaims, err := ParseRefreshToken(refresh)
	if err != nil {
		t.Fatalf("ParseRefreshToken: %v", err)
	}
	if refClaims.UserID != id {
		t.Fatalf("refresh user id mismatch: got %v want %v", refClaims.UserID, id)
	}

	if _, err := ParseAccessToken(refresh); err == nil {
		t.Fatal("expected error parsing refresh token as access token")
	}
	if _, err := ParseRefreshToken(access); err == nil {
		t.Fatal("expected error parsing access token as refresh token")
	}
}

func TestAuthCookiesDev(t *testing.T) {
	Envs = &EnvsType{ENV: "dev"}
	w := httptest.NewRecorder()
	SetAuthCookies(w, "access-value", "refresh-value")

	cookies := w.Result().Cookies()
	if len(cookies) != 2 {
		t.Fatalf("expected 2 cookies, got %d", len(cookies))
	}
	for _, c := range cookies {
		if !c.HttpOnly {
			t.Errorf("cookie %q should be HttpOnly", c.Name)
		}
		if c.Secure {
			t.Errorf("cookie %q should not be Secure in dev", c.Name)
		}
		if c.Domain != "" {
			t.Errorf("cookie %q should not have Domain in dev", c.Name)
		}
	}
}

func TestAuthCookiesProd(t *testing.T) {
	Envs = &EnvsType{ENV: "prod", AUTH_COOKIE_DOMAIN: "example.com"}
	w := httptest.NewRecorder()
	SetAuthCookies(w, "access-value", "refresh-value")

	cookies := w.Result().Cookies()
	for _, c := range cookies {
		if !c.Secure {
			t.Errorf("cookie %q should be Secure in prod", c.Name)
		}
		if c.Domain != "example.com" {
			t.Errorf("cookie %q Domain = %q, want example.com", c.Name, c.Domain)
		}
	}
}

func mustUUID() (u [16]byte) {
	for i := range u {
		u[i] = byte(i)
	}
	return u
}
