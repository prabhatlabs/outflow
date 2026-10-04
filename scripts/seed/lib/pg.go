package lib

import (
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func PGUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func Numeric(v float64) pgtype.Numeric {
	var n pgtype.Numeric
	if err := n.Scan(strconv.FormatFloat(v, 'f', -1, 64)); err != nil {
		return pgtype.Numeric{}
	}
	return n
}

func OptionalText(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

func Date(t time.Time) pgtype.Date {
	return pgtype.Date{Time: t, Valid: true}
}
