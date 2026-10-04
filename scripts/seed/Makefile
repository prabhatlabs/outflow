include ../../prod.env
export

SEED_USER ?= 01a10592-db73-7d05-99a6-3cfe63e7aec2
DAYS ?= 90
MIN ?= 5
MAX ?= 8
GROUPS ?= 4
MEMBERS ?=
CLEAN ?=

SEED_FLAGS := --user $(SEED_USER) --days $(DAYS) --min $(MIN) --max $(MAX) --groups $(GROUPS)
ifneq ($(strip $(MEMBERS)),)
SEED_FLAGS += --members $(MEMBERS)
endif
ifeq ($(CLEAN),1)
SEED_FLAGS += --clean
endif
ifneq ($(strip $(ARGS)),)
SEED_FLAGS += $(ARGS)
endif

.PHONY: help seed seed-clean build vet

help:
	@echo "Usage: DATABASE_URL=... make [target] [VARS] [ARGS=\"...\"]"
	@echo ""
	@echo "Targets:"
	@echo "  seed        run seed (4 groups x 5-8/day x 90 days by default)"
	@echo "  seed-clean  same as seed but with --clean (deletes last --days window first)"
	@echo "  build       build binary to ./seed"
	@echo "  vet         go vet"
	@echo ""
	@echo "Vars (override with VAR=value):"
	@echo "  SEED_USER target user UUID (default $(SEED_USER))"
	@echo "  MEMBERS  comma-separated extra member UUIDs"
	@echo "  DAYS     days back inclusive (default $(DAYS))"
	@echo "  MIN/MAX  per-group per-day range (default $(MIN)/$(MAX))"
	@echo "  GROUPS   number of groups (default $(GROUPS))"
	@echo "  CLEAN=1  add --clean flag"
	@echo "  ARGS     extra flags forwarded verbatim (e.g. ARGS=\"--clean\")"
	@echo ""
	@echo "Examples:"
	@echo "  DATABASE_URL=... make seed"
	@echo "  DATABASE_URL=... make seed MEMBERS=<uuid1>,<uuid2>"
	@echo "  DATABASE_URL=... make seed CLEAN=1"
	@echo "  DATABASE_URL=... make seed-clean"
	@echo "  DATABASE_URL=... make seed ARGS=\"--clean --days 30\""

seed:
	@if [ -z "$(DATABASE_URL)" ]; then echo "DATABASE_URL is required" >&2; exit 1; fi
	go run . $(SEED_FLAGS)

seed-clean:
	@if [ -z "$(DATABASE_URL)" ]; then echo "DATABASE_URL is required" >&2; exit 1; fi
	go run . --user $(SEED_USER) --days $(DAYS) --min $(MIN) --max $(MAX) --groups $(GROUPS) $(if $(strip $(MEMBERS)),--members $(MEMBERS)) --clean $(ARGS)

build:
	go build -o seed .

vet:
	go vet ./...
