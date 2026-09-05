package lib

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prabhatlabs/outflow/internal/db"
)

type DB struct {
	Pool *pgxpool.Pool
	Q    *db.Queries
}

func ConnectDB(ctx context.Context, databaseURL string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &DB{
		Pool: pool,
		Q:    db.New(pool),
	}, nil
}

func (d *DB) Close() {
	d.Pool.Close()
}

func (d *DB) WithTx(ctx context.Context, fn func(*db.Queries) error) error {
	tx, err := d.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if err := fn(d.Q.WithTx(tx)); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
