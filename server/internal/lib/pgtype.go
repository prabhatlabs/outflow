package lib

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// OptionalText maps an empty string to NULL, otherwise to a valid text value.
func OptionalText(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

// RequiredText maps a (possibly empty) string to a valid text value. Use when
// NULL is not the intent, e.g. explicit clears are handled via OptionalText.
func RequiredText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: true}
}

// PGUUID converts a uuid.UUID to a valid pgtype.UUID.
func PGUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

// Numeric converts a float64 to a pgtype.Numeric; the zero value (NULL) is
// returned on failure.
func Numeric(v float64) pgtype.Numeric {
	var n pgtype.Numeric
	if err := n.Scan(v); err != nil {
		return pgtype.Numeric{}
	}
	return n
}

// Timestamp converts a time.Time to a valid pgtype.Timestamptz.
func Timestamp(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}

// Now is Timestamp(time.Now()).
func Now() pgtype.Timestamptz {
	return Timestamp(time.Now())
}

// Date converts a time.Time to a valid pgtype.Date.
func Date(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: true}
}

// Int4 converts an int32 to a valid pgtype.Int4.
func Int4(v int32) pgtype.Int4 {
	return pgtype.Int4{Int32: v, Valid: true}
}

// Bool converts a bool to a valid pgtype.Bool.
func Bool(v bool) pgtype.Bool {
	return pgtype.Bool{Bool: v, Valid: true}
}
