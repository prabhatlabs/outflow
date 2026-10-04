package lib

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/google/uuid"
)

var categoryDefs = []struct {
	Name  string
	Color string
	Icon  string
}{
	{"Groceries", "#22c55e", "shopping-cart"},
	{"Dining", "#f59e0b", "utensils"},
	{"Transport", "#3b82f6", "car"},
	{"Rent", "#ef4444", "home"},
	{"Utilities", "#8b5cf6", "zap"},
	{"Entertainment", "#ec4899", "film"},
	{"Healthcare", "#14b8a6", "heart"},
	{"Other", "#6b7280", "package"},
}

var groupDefs = []struct {
	Name string
	Type string
	Desc string
}{
	{"Home Base", "household", "Daily household expenses"},
	{"Weekend Crew", "trip", "Weekend trips and outings"},
	{"Flat Share", "roommates", "Shared flat expenses"},
	{"Side Project", "project", "Project-related spends"},
}

var descriptionPool = map[string][]string{
	"Groceries":     {"Grocery run", "Supermarket", "Vegetable market", "Kirana store", "Weekly groceries"},
	"Dining":        {"Lunch out", "Zomato order", "Dinner with friends", "Cafe bill", "Swiggy delivery"},
	"Transport":     {"Auto fare", "Cab ride", "Metro recharge", "Fuel", "Bus pass"},
	"Rent":          {"Monthly rent", "Rent share", "Maintenance charges"},
	"Utilities":     {"Electricity bill", "Internet bill", "Water bill", "Gas refill", "Mobile recharge"},
	"Entertainment": {"Movie tickets", "Concert pass", "Game night", "Streaming subscription", "Books"},
	"Healthcare":    {"Pharmacy", "Doctor visit", "Lab tests", "Gym membership"},
	"Other":         {"Misc expense", "Stationery", "Repairs", "Gifts", "Donation"},
}

var notes = []string{
	"", "", "", // 70% empty
	"Paid via UPI",
	"Cash payment",
	"Card payment",
	"Reimbursable",
	"Monthly recurring",
}

func CategoryDefs() []struct {
	Name  string
	Color string
	Icon  string
} {
	return categoryDefs
}

func GroupDefs() []struct {
	Name string
	Type string
	Desc string
} {
	return groupDefs
}

func RandomDescription(r *rand.Rand, categoryName string) string {
	pool := descriptionPool[categoryName]
	if len(pool) == 0 {
		pool = descriptionPool["Other"]
	}
	base := pool[r.Intn(len(pool))]
	// small variation suffix 20%
	if r.Float64() < 0.2 {
		base = fmt.Sprintf("%s #%d", base, r.Intn(900)+100)
	}
	return strings.TrimSpace(base)
}

func RandomNote(r *rand.Rand) string {
	return notes[r.Intn(len(notes))]
}

func RandomAmount(r *rand.Rand) float64 {
	p := r.Float64()
	var low, high float64
	switch {
	case p < 0.6:
		low, high = 80, 600
	case p < 0.9:
		low, high = 600, 2500
	default:
		low, high = 2500, 8000
	}
	v := low + r.Float64()*(high-low)
	// round to 2 decimals without cents bias
	return float64(int(v*100+0.5)) / 100
}

func RandomCategoryIndex(r *rand.Rand) int {
	// weighted: Groceries 25, Dining 20, Transport 15, rest uniform 40/5=8 each
	p := r.Float64()
	switch {
	case p < 0.25:
		return 0 // Groceries
	case p < 0.45:
		return 1 // Dining
	case p < 0.60:
		return 2 // Transport
	default:
		// remaining 5 equally
		return 3 + r.Intn(5) // 3..7
	}
}

var splitTypes = []string{"equal", "equal", "equal", "equal", "equal", "equal", "equal", "exact", "percentage", "shares"}

func RandomSplitType(r *rand.Rand) string {
	return splitTypes[r.Intn(len(splitTypes))]
}

func RandomPaidBy(r *rand.Rand, targetID uuid.UUID, members []uuid.UUID) uuid.UUID {
	if len(members) == 0 {
		return targetID
	}
	if r.Float64() < 0.5 {
		return targetID
	}
	return members[r.Intn(len(members))]
}

// RandomSplits returns k distinct user_ids including payer when possible.
func RandomSplits(r *rand.Rand, payer uuid.UUID, members []uuid.UUID) []uuid.UUID {
	if len(members) == 0 {
		return []uuid.UUID{payer}
	}
	// Build pool of unique ids
	pool := make([]uuid.UUID, 0, len(members))
	seen := map[uuid.UUID]bool{payer: true}
	pool = append(pool, payer)
	for _, m := range members {
		if !seen[m] {
			seen[m] = true
			pool = append(pool, m)
		}
	}
	maxK := len(pool)
	if maxK > 4 {
		maxK = 4
	}
	k := 1
	if maxK > 1 {
		k = 1 + r.Intn(maxK) // 1..maxK
		if k > maxK {
			k = maxK
		}
	}
	// shuffle and take k, ensure payer is included
	r.Shuffle(len(pool), func(i, j int) { pool[i], pool[j] = pool[j], pool[i] })
	// force payer in selection
	hasPayer := false
	for i := 0; i < k; i++ {
		if pool[i] == payer {
			hasPayer = true
			break
		}
	}
	if !hasPayer {
		// replace last with payer
		pool[k-1] = payer
	}
	out := make([]uuid.UUID, k)
	copy(out, pool[:k])
	return out
}

func SplitAmounts(r *rand.Rand, total float64, splitType string, userIDs []uuid.UUID) ([]float64, []*float64, []*float64) {
	n := len(userIDs)
	amounts := make([]float64, n)
	var percentages []*float64
	var shares []*float64

	switch splitType {
	case "equal":
		per := total / float64(n)
		for i := range amounts {
			amounts[i] = per
		}
	case "exact":
		// random positive parts summing to total
		cuts := make([]float64, n)
		var sum float64
		for i := range cuts {
			cuts[i] = r.Float64() + 0.1
			sum += cuts[i]
		}
		for i := range amounts {
			amounts[i] = total * cuts[i] / sum
		}
	case "percentage":
		percentages = make([]*float64, n)
		cuts := make([]float64, n)
		var sum float64
		for i := range cuts {
			cuts[i] = r.Float64() + 0.5
			sum += cuts[i]
		}
		for i := range amounts {
			pct := cuts[i] / sum * 100
			v := pct
			percentages[i] = &v
			amounts[i] = total * pct / 100
		}
	case "shares":
		shares = make([]*float64, n)
		sVals := make([]float64, n)
		var sum float64
		for i := range sVals {
			sVals[i] = float64(r.Intn(5) + 1) // 1..5
			sum += sVals[i]
		}
		for i := range amounts {
			v := sVals[i]
			shares[i] = &v
			amounts[i] = total * sVals[i] / sum
		}
	}

	// round to 2 decimals and fix residual on last so sum==total exactly
	for i := range amounts {
		amounts[i] = float64(int(amounts[i]*100+0.5)) / 100
	}
	var sum float64
	for _, a := range amounts {
		sum += a
	}
	diff := total - sum
	if n > 0 {
		amounts[n-1] = float64(int((amounts[n-1]+diff)*100+0.5)) / 100
		if amounts[n-1] <= 0 {
			amounts[n-1] = 0.01
		}
	}
	return amounts, percentages, shares
}

func ExpenseDay(t time.Time) time.Time {
	// truncate to date only (UTC)
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}
