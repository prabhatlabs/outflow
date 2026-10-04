# Seed — 3 months × 4 groups × 5–8 expenses/day

Standalone Go seed (no `server/internal` import). Uses `DATABASE_URL`.

## Run

```sh
DATABASE_URL=postgresql://user:pass@localhost:5432/outflow?sslmode=disable \
  go run ./scripts/seed --user 01a10592-db73-7d05-99a6-3cfe63e7aec2

# with extra members (adds them to all 4 groups, splits sample them)
DATABASE_URL=... go run ./scripts/seed --user 01a10592-db73-7d05-99a6-3cfe63e7aec2 \
  --members <uuid1>,<uuid2>

# clean last 90 days then reseed
DATABASE_URL=... go run ./scripts/seed --clean

# custom range / density
DATABASE_URL=... go run ./scripts/seed --days 90 --min 5 --max 8 --groups 4
```

Or build:

```sh
go build -o /tmp/seed ./scripts/seed
DATABASE_URL=... /tmp/seed --clean
```

## Behavior

- Verifies `--user` exists & `is_active`.
- Ensures `--groups` (default 4) active groups for that user; creates missing ones (`household/trip/roommates/project`) with owner membership.
- Ensures 8 categories per group if none exist.
- If `--members` provided, adds each as `member/active` to all groups.
- For each of last `--days` days (inclusive of today) and each group, inserts `min..max` expenses with weighted categories/amounts, `equal 70% / exact|percentage|shares 10% each`, cent-exact splits (1–4 participants, always includes `paid_by`).
- Each expense is `BEGIN → INSERT expenses → CopyFrom expense_splits → UPDATE splits_count → COMMIT` (mirrors `handlers.go:248`).
- `--clean` deletes `expenses` for seeded groups in window before inserting.

Expected total: ~4×90×6.5 ≈ 2340 rows (1800–2880).
