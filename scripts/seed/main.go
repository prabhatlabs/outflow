package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"seed/lib"
)

func main() {
	cfg, err := lib.ParseFlags()
	if err != nil {
		log.Fatalf("flags: %v", err)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	if err := lib.EnsureUserExists(ctx, pool, cfg.UserID); err != nil {
		log.Fatalf("user check: %v", err)
	}
	if err := lib.EnsureMembersExist(ctx, pool, cfg.Members); err != nil {
		log.Fatalf("members check: %v", err)
	}

	groups, err := lib.EnsureGroups(ctx, pool, cfg)
	if err != nil {
		log.Fatalf("ensure groups: %v", err)
	}
	fmt.Printf("Groups (%d):\n", len(groups))
	for _, g := range groups {
		fmt.Printf("  - %s  %s\n", g.ID, g.Name)
	}

	if err := lib.EnsureMembersInGroups(ctx, pool, groups, cfg.UserID, cfg.Members); err != nil {
		log.Fatalf("ensure members in groups: %v", err)
	}

	catsByGroup, err := lib.EnsureCategories(ctx, pool, groups, cfg.UserID)
	if err != nil {
		log.Fatalf("ensure categories: %v", err)
	}

	membersByGroup := map[uuid.UUID][]uuid.UUID{}
	for _, g := range groups {
		members, err := lib.LoadActiveMembers(ctx, pool, g.ID)
		if err != nil {
			log.Fatalf("load members group %s: %v", g.ID, err)
		}
		if len(members) == 0 {
			log.Fatalf("group %s has no active members", g.ID)
		}
		membersByGroup[g.ID] = members
	}

	if cfg.Clean {
		gids := make([]string, len(groups))
		for i, g := range groups {
			gids[i] = g.ID.String()
		}
		startDate := time.Now().UTC().AddDate(0, 0, -cfg.Days+1)
		y, m, d := startDate.Date()
		startDate = time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
		tag, err := pool.Exec(ctx, `DELETE FROM expenses WHERE group_id = ANY($1::uuid[]) AND expense_date >= $2 AND created_by = $3`,
			gids, startDate, lib.PGUUID(cfg.UserID))
		if err != nil {
			log.Fatalf("clean: %v", err)
		}
		fmt.Printf("Clean: deleted %d expenses from %s onward\n", tag.RowsAffected(), startDate.Format("2006-01-02"))
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	today := lib.ExpenseDay(time.Now().UTC())
	total := 0

	for dayOffset := cfg.Days - 1; dayOffset >= 0; dayOffset-- {
		day := today.AddDate(0, 0, -dayOffset)
		for _, g := range groups {
			n := cfg.Min
			if cfg.Max > cfg.Min {
				n = cfg.Min + r.Intn(cfg.Max-cfg.Min+1)
			}
			cats := catsByGroup[g.ID]
			members := membersByGroup[g.ID]
			for i := 0; i < n; i++ {
				catIdx := lib.RandomCategoryIndex(r)
				if catIdx >= len(cats) {
					catIdx = r.Intn(len(cats))
				}
				cat := cats[catIdx]
				amount := lib.RandomAmount(r)
				splitType := lib.RandomSplitType(r)
				paidBy := lib.RandomPaidBy(r, cfg.UserID, members)
				desc := lib.RandomDescription(r, cat.Name)
				note := lib.RandomNote(r)
				splitUserIDs := lib.RandomSplits(r, paidBy, members)
				amounts, pcts, shares := lib.SplitAmounts(r, amount, splitType, splitUserIDs)
				var splits []lib.SplitRow
				for idx, uid := range splitUserIDs {
					splits = append(splits, lib.SplitRow{
						UserID:     uid,
						AmountOwed: amounts[idx],
						Percentage: pctsForIdx(pcts, idx),
						Shares:     sharesForIdx(shares, idx),
					})
				}
				err := lib.CreateExpenseTx(ctx, pool, g.ID, cfg.UserID, paidBy, cat.ID, amount, desc, note, splitType, day, splits)
				if err != nil {
					log.Fatalf("create expense group=%s day=%s: %v", g.ID, day.Format("2006-01-02"), err)
				}
				total++
				if total%200 == 0 {
					fmt.Printf("  ... %d expenses inserted (day %s group %s)\n", total, day.Format("2006-01-02"), g.Name)
				}
			}
		}
	}

	fmt.Printf("Done: %d expenses across %d groups over %d days (%d per group per day avg)\n", total, len(groups), cfg.Days, total/len(groups)/cfg.Days)
	fmt.Printf("Per group per day: %d..%d. Run with --clean to replace.\n", cfg.Min, cfg.Max)
}

func pctsForIdx(pcts []*float64, idx int) *float64 {
	if pcts == nil || idx >= len(pcts) {
		return nil
	}
	return pcts[idx]
}
func sharesForIdx(shares []*float64, idx int) *float64 {
	if shares == nil || idx >= len(shares) {
		return nil
	}
	return shares[idx]
}
