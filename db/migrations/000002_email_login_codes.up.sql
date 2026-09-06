-- Email Login Codes Scheme
-- The row id (uuidv7) doubles as the magic-link code sent in the email.
-- One row per email: issuing a new link replaces (and invalidates) the old one.
CREATE TABLE IF NOT EXISTS email_login_codes (
    id          UUID PRIMARY KEY DEFAULT uuidv7(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
