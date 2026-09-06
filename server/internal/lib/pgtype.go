package lib

import (
	"github.com/jackc/pgx/v5/pgtype"
)

// OptionalText maps an empty string to NULL, otherwise to a valid text value.
func OptionalText(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}
