package auth

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/db"
)

type createUserInput struct {
	Email             string
	FirstName         string
	LastName          string
	AvatarURL         string
	Provider          db.LoginProvider
	ProviderAccountID string
	EmailVerified     bool
}

func (s *Service) createUser(ctx context.Context, in createUserInput) (db.User, error) {
	var user db.User

	err := s.db.WithTx(ctx, func(q *db.Queries) error {
		provider := db.NullLoginProvider{LoginProvider: in.Provider, Valid: true}

		authRow, err := q.GetAuthByProviderAccountID(ctx, db.GetAuthByProviderAccountIDParams{
			Provider:          provider,
			ProviderAccountID: in.ProviderAccountID,
		})
		if err == nil {
			user, err = q.GetUserByID(ctx, authRow.UserID)
			if err != nil {
				return err
			}
			user, err = q.UpdateUserLastLogin(ctx, db.UpdateUserLastLoginParams{
				ID:            user.ID,
				LastLoginMode: provider,
			})
			return err
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}

		user, err = q.GetUserByEmail(ctx, in.Email)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}

		if errors.Is(err, pgx.ErrNoRows) {
			now := pgtype.Timestamptz{Time: time.Now(), Valid: true}
			params := db.CreateUserParams{
				Email:         in.Email,
				FirstName:     in.FirstName,
				LastName:      optionalText(in.LastName),
				AvatarUrl:     optionalText(in.AvatarURL),
				Timezone:      "UTC",
				LastLoginMode: provider,
				LastLoginAt:   now,
			}
			if in.EmailVerified {
				params.EmailVerifiedAt = now
			}
			user, err = q.CreateUser(ctx, params)
			if err != nil {
				return err
			}
		} else {
			user, err = q.UpdateUserLastLogin(ctx, db.UpdateUserLastLoginParams{
				ID:            user.ID,
				LastLoginMode: provider,
			})
			if err != nil {
				return err
			}
			if in.EmailVerified && !user.EmailVerifiedAt.Valid {
				user, err = q.VerifyUserEmail(ctx, user.ID)
				if err != nil {
					return err
				}
			}
		}

		_, err = q.GetAuthByUserAndProvider(ctx, db.GetAuthByUserAndProviderParams{
			UserID:   user.ID,
			Provider: provider,
		})
		if errors.Is(err, pgx.ErrNoRows) {
			_, err = q.CreateAuth(ctx, db.CreateAuthParams{
				UserID:            user.ID,
				Provider:          provider,
				ProviderAccountID: in.ProviderAccountID,
			})
		}
		return err
	})

	return user, err
}
