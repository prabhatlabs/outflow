package lib

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

func EnsureUserExists(ctx context.Context, pool *pgxpool.Pool, userID uuid.UUID) error {
	var isActive bool
	err := pool.QueryRow(ctx, `SELECT is_active FROM users WHERE id=$1`, PGUUID(userID)).Scan(&isActive)
	if err != nil {
		if err == pgx.ErrNoRows {
			return fmt.Errorf("user %s not found", userID)
		}
		return fmt.Errorf("lookup user: %w", err)
	}
	if !isActive {
		return fmt.Errorf("user %s is not active", userID)
	}
	return nil
}

func EnsureMembersExist(ctx context.Context, pool *pgxpool.Pool, members []uuid.UUID) error {
	if len(members) == 0 {
		return nil
	}
	for _, m := range members {
		var isActive bool
		err := pool.QueryRow(ctx, `SELECT is_active FROM users WHERE id=$1`, PGUUID(m)).Scan(&isActive)
		if err != nil {
			return fmt.Errorf("member %s not found: %w", m, err)
		}
		if !isActive {
			return fmt.Errorf("member %s is not active", m)
		}
	}
	return nil
}

type GroupInfo struct {
	ID   uuid.UUID
	Name string
}

func EnsureGroups(ctx context.Context, pool *pgxpool.Pool, cfg Config) ([]GroupInfo, error) {
	// Load existing active groups for user
	rows, err := pool.Query(ctx, `
		SELECT g.id, g.name FROM groups g
		INNER JOIN group_members gm ON gm.group_id = g.id
		WHERE gm.user_id = $1 AND gm.status = 'active'
		ORDER BY g.created_at DESC
		LIMIT $2
	`, PGUUID(cfg.UserID), cfg.Groups)
	if err != nil {
		return nil, fmt.Errorf("list groups: %w", err)
	}
	var existing []GroupInfo
	for rows.Next() {
		var id pgtype.UUID
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			rows.Close()
			return nil, err
		}
		if !id.Valid {
			continue
		}
		u := uuid.UUID(id.Bytes)
		existing = append(existing, GroupInfo{ID: u, Name: name})
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	need := cfg.Groups - len(existing)
	if need <= 0 {
		return existing[:cfg.Groups], nil
	}

	defs := GroupDefs()
	created := make([]GroupInfo, 0, need)
	for i := 0; i < need; i++ {
		def := defs[(len(existing)+i)%len(defs)]
		name := def.Name
		// ensure unique if we cycle
		if len(existing)+i >= len(defs) {
			name = fmt.Sprintf("%s %d", def.Name, len(existing)+i+1)
		}
		var gid uuid.UUID
		err := pool.QueryRow(ctx, `
			INSERT INTO groups (name, description, type, default_currency, created_by)
			VALUES ($1, $2, $3::group_type, $4, $5)
			RETURNING id
		`, name, OptionalText(def.Desc), def.Type, "INR", PGUUID(cfg.UserID)).Scan(&gid)
		if err != nil {
			return nil, fmt.Errorf("create group %q: %w", name, err)
		}
		// owner membership
		_, err = pool.Exec(ctx, `
			INSERT INTO group_members (user_id, group_id, role, status, invited_by, joined_at)
			VALUES ($1, $2, 'owner'::group_member_role, 'active'::group_member_status, $1, NOW())
			ON CONFLICT (user_id, group_id) DO UPDATE SET status='active'::group_member_status, joined_at=NOW(), role='owner'::group_member_role
		`, PGUUID(cfg.UserID), PGUUID(gid))
		if err != nil {
			return nil, fmt.Errorf("add owner to group %s: %w", gid, err)
		}
		created = append(created, GroupInfo{ID: gid, Name: name})
	}

	// Merge existing + created
	result := append(existing, created...)
	if len(result) > cfg.Groups {
		result = result[:cfg.Groups]
	}
	return result, nil
}

func EnsureMembersInGroups(ctx context.Context, pool *pgxpool.Pool, groups []GroupInfo, target uuid.UUID, extras []uuid.UUID) error {
	for _, g := range groups {
		for _, m := range extras {
			_, err := pool.Exec(ctx, `
				INSERT INTO group_members (user_id, group_id, role, status, invited_by, joined_at)
				VALUES ($1, $2, 'member'::group_member_role, 'active'::group_member_status, $3, NOW())
				ON CONFLICT (user_id, group_id) DO UPDATE SET status='active'::group_member_status, joined_at=NOW()
			`, PGUUID(m), PGUUID(g.ID), PGUUID(target))
			if err != nil {
				return fmt.Errorf("add member %s to group %s: %w", m, g.ID, err)
			}
		}
	}
	return nil
}

type CategoryInfo struct {
	ID   uuid.UUID
	Name string
}

func EnsureCategories(ctx context.Context, pool *pgxpool.Pool, groups []GroupInfo, createdBy uuid.UUID) (map[uuid.UUID][]CategoryInfo, error) {
	out := map[uuid.UUID][]CategoryInfo{}
	defs := CategoryDefs()
	for _, g := range groups {
		rows, err := pool.Query(ctx, `SELECT id, name FROM categories WHERE group_id=$1 ORDER BY name ASC`, PGUUID(g.ID))
		if err != nil {
			return nil, fmt.Errorf("list categories group %s: %w", g.ID, err)
		}
		var cats []CategoryInfo
		for rows.Next() {
			var id pgtype.UUID
			var name string
			if err := rows.Scan(&id, &name); err != nil {
				rows.Close()
				return nil, err
			}
			if !id.Valid {
				continue
			}
			cats = append(cats, CategoryInfo{ID: uuid.UUID(id.Bytes), Name: name})
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, err
		}
		if len(cats) == 0 {
			for _, d := range defs {
				var cid uuid.UUID
				err := pool.QueryRow(ctx, `
					INSERT INTO categories (group_id, created_by, name, icon, color)
					VALUES ($1, $2, $3, $4, $5)
					RETURNING id
				`, PGUUID(g.ID), PGUUID(createdBy), d.Name, OptionalText(d.Icon), d.Color).Scan(&cid)
				if err != nil {
					return nil, fmt.Errorf("create category %q group %s: %w", d.Name, g.ID, err)
				}
				cats = append(cats, CategoryInfo{ID: cid, Name: d.Name})
			}
		}
		out[g.ID] = cats
	}
	return out, nil
}

func LoadActiveMembers(ctx context.Context, pool *pgxpool.Pool, groupID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := pool.Query(ctx, `SELECT user_id FROM group_members WHERE group_id=$1 AND status='active'`, PGUUID(groupID))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []uuid.UUID
	for rows.Next() {
		var id pgtype.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		if !id.Valid {
			continue
		}
		out = append(out, uuid.UUID(id.Bytes))
	}
	return out, rows.Err()
}


