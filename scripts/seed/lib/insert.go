package lib

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SplitRow struct {
	UserID     uuid.UUID
	AmountOwed float64
	Percentage *float64
	Shares     *float64
}

func CreateExpenseTx(ctx context.Context, pool *pgxpool.Pool, groupID, createdBy, paidBy, categoryID uuid.UUID, amount float64, description, note, splitType string, expenseDate time.Time, splits []SplitRow) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var expenseID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO expenses (group_id, created_by, paid_by, category_id, amount, description, note, split_type, expense_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8::split_type, $9)
		RETURNING id
	`, PGUUID(groupID), PGUUID(createdBy), PGUUID(paidBy), PGUUID(categoryID),
			Numeric(amount), OptionalText(description), OptionalText(note), splitType, Date(expenseDate)).Scan(&expenseID)
	if err != nil {
		return fmt.Errorf("create expense: %w", err)
	}

	if len(splits) > 0 {
		rows := make([][]interface{}, 0, len(splits))
		for _, s := range splits {
			var pct interface{}
			if s.Percentage != nil {
				pct = Numeric(*s.Percentage)
			}
			var sh interface{}
			if s.Shares != nil {
				sh = Numeric(*s.Shares)
			}
			rows = append(rows, []interface{}{PGUUID(expenseID), PGUUID(s.UserID), Numeric(s.AmountOwed), pct, sh})
		}
		// CopyFrom requires (table, columns, rows)
		_, err = tx.CopyFrom(ctx,
			pgx.Identifier{"expense_splits"},
			[]string{"expense_id", "user_id", "amount_owed", "percentage", "shares"},
			pgx.CopyFromRows(rows),
		)
		if err != nil {
			return fmt.Errorf("copy splits: %w", err)
		}
	}

	_, err = tx.Exec(ctx, `UPDATE expenses SET splits_count=$1 WHERE id=$2`, len(splits), PGUUID(expenseID))
	if err != nil {
		return fmt.Errorf("update splits_count: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}


