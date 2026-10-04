package lib

import (
	"flag"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

type Config struct {
	UserID  uuid.UUID
	Members []uuid.UUID
	Days    int
	Min     int
	Max     int
	Groups  int
	Clean   bool
}

func ParseFlags() (Config, error) {
	userStr := flag.String("user", "01a10592-db73-7d05-99a6-3cfe63e7aec2", "target user UUID (owner/payer)")
	membersStr := flag.String("members", "", "comma-separated extra member UUIDs (existing users, added to groups)")
	days := flag.Int("days", 90, "number of days back from today (inclusive)")
	min := flag.Int("min", 5, "min expenses per group per day")
	max := flag.Int("max", 8, "max expenses per group per day")
	groups := flag.Int("groups", 4, "number of groups to create/seed")
	clean := flag.Bool("clean", false, "delete last --days expenses for seeded groups before inserting")
	flag.Parse()

	uid, err := uuid.Parse(strings.TrimSpace(*userStr))
	if err != nil {
		return Config{}, fmt.Errorf("invalid --user: %w", err)
	}

	var members []uuid.UUID
	if strings.TrimSpace(*membersStr) != "" {
		for _, s := range strings.Split(*membersStr, ",") {
			s = strings.TrimSpace(s)
			if s == "" {
				continue
			}
			m, err := uuid.Parse(s)
			if err != nil {
				return Config{}, fmt.Errorf("invalid --members entry %q: %w", s, err)
			}
			if m == uid {
				continue
			}
			members = append(members, m)
		}
	}

	if *days < 1 || *days > 365 {
		return Config{}, fmt.Errorf("--days must be 1..365, got %d", *days)
	}
	if *min < 1 || *max < *min {
		return Config{}, fmt.Errorf("--min/--max invalid: min=%d max=%d", *min, *max)
	}
	if *groups < 1 || *groups > 20 {
		return Config{}, fmt.Errorf("--groups must be 1..20, got %d", *groups)
	}

	return Config{
		UserID:  uid,
		Members: members,
		Days:    *days,
		Min:     *min,
		Max:     *max,
		Groups:  *groups,
		Clean:   *clean,
	}, nil
}
