package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/prabhatlabs/outflow/internal/db"
	"github.com/prabhatlabs/outflow/internal/lib"
)

type createUserIfNotExistsInput struct {
	Email             string
	FirstName         string
	LastName          string
	AvatarURL         string
	Provider          db.LoginProvider
	ProviderAccountID string
	EmailVerified     bool
}

func (s *Service) createUserIfNotExists(ctx context.Context, in createUserIfNotExistsInput) (db.User, error) {
	var user db.User

	err := s.db.WithTx(ctx, func(q *db.Queries) error {
		provider := db.NullLoginProvider{LoginProvider: in.Provider, Valid: true}

		// fetch auth
		// 1. got auth with this provider -> get the user & update last login
		// 2. got error other then NoRow -> return err
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

		// checking if user exists by email(different provider probably)
		// if not, create a new user
		// if yes, update last login and return
		user, err = q.GetUserByEmail(ctx, in.Email)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if errors.Is(err, pgx.ErrNoRows) {
			now := pgtype.Timestamptz{Time: time.Now(), Valid: true}
			params := db.CreateUserParams{
				Email:         in.Email,
				FirstName:     in.FirstName,
				LastName:      lib.OptionalText(in.LastName),
				AvatarUrl:     lib.OptionalText(in.AvatarURL),
				Timezone:      "IST",
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

			// seeding group
			var grpname string
			if in.LastName != "" {
				grpname = fmt.Sprintf("%s's", in.LastName)
			} else if in.FirstName != "" {
				grpname = fmt.Sprintf("%s's", in.FirstName)
			} else {
				grpname = "My Group"
			}

			grp, err := q.CreateGroup(ctx, db.CreateGroupParams{
				Name:            grpname,
				Description:     pgtype.Text{String: "", Valid: false},
				AvatarUrl:       pgtype.Text{String: "", Valid: false},
				Type:            db.GroupType("household"),
				DefaultCurrency: "INR",
				CreatedBy:       user.ID,
			})
			if err != nil {
				return err
			}

			_, err = q.CreateGroupMember(ctx, db.CreateGroupMemberParams{
				UserID:  user.ID,
				GroupID: grp.ID,
				Role:    db.GroupMemberRole("owner"),
				Status:  db.GroupMemberStatus("active"),
			})
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

		// if no auth exists, create a new one
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
