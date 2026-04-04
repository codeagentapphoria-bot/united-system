#!/usr/bin/env bash
# =============================================================================
# prepare.sh — Phase 0: Pre-Migration Preparation
# =============================================================================
# Run this script BEFORE executing any migration SQL.
# It performs:
#   1. Environment variable validation
#   2. Backup of both source databases
#   3. git tag on both repos (pre-merge)
#   4. Supabase unified DB readiness checks
#      a. Connectivity
#      b. PostGIS extension
#      c. pg_trgm extension
#      d. Required tables from schema.sql are present
#      e. dblink extension (needed by migration scripts)
#   5. Disk / size checks (source DB sizes vs Supabase plan)
#   6. Final go / no-go checklist
#
# HOW TO RUN:
#   chmod +x united-database/prepare.sh
#   cd united-systems/
#   ./united-database/prepare.sh
#
# REQUIRED ENV VARS (set these before running, or export them in your shell):
#   BIMS_DB_URL        — psql connection string for bims_production
#                        e.g. postgresql://postgres:pass@localhost:5432/bims_production
#   ESERVICE_DB_URL    — psql connection string for multysis
#                        e.g. postgresql://postgres:pass@localhost:5432/multysis
#   UNIFIED_DB_URL     — psql connection string for the Supabase unified DB
#                        e.g. postgresql://postgres.xxxx:pass@db.xxxx.supabase.co:5432/postgres
#   BIMS_REPO          — path to BIMS repo root (default: ./barangay-information-management-system-copy)
#   ESERVICE_REPO      — path to E-Services repo root (default: ./borongan-eService-system-copy)
#   BACKUP_DIR         — directory to store backups (default: ./united-database/backups)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Colour

ok()   { echo -e "  ${GREEN}[OK]${NC}   $*"; }
fail() { echo -e "  ${RED}[FAIL]${NC} $*"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "  ${YELLOW}[WARN]${NC} $*"; WARNINGS=$((WARNINGS + 1)); }
info() { echo -e "  ${BLUE}[INFO]${NC} $*"; }
header() { echo -e "\n${BOLD}── $* ──────────────────────────────────────────────${NC}"; }

FAILURES=0
WARNINGS=0
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
BIMS_REPO="${BIMS_REPO:-$ROOT_DIR/barangay-information-management-system-copy}"
ESERVICE_REPO="${ESERVICE_REPO:-$ROOT_DIR/borongan-eService-system-copy}"
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo ""
echo -e "${BOLD}============================================================${NC}"
echo -e "${BOLD}  Borongan Unified System — Phase 0: Preparation Check${NC}"
echo -e "${BOLD}  $(date)${NC}"
echo -e "${BOLD}============================================================${NC}"

# =============================================================================
# STEP 1 — Environment variable validation
# =============================================================================
header "STEP 1: Environment Variable Validation"

MISSING_VARS=0
for var in BIMS_DB_URL ESERVICE_DB_URL UNIFIED_DB_URL; do
  if [[ -z "${!var:-}" ]]; then
    fail "Required env var \$$var is not set"
    MISSING_VARS=$((MISSING_VARS + 1))
  else
    ok "\$$var is set"
  fi
done

if [[ $MISSING_VARS -gt 0 ]]; then
  echo ""
  echo -e "${RED}Cannot continue: $MISSING_VARS required environment variable(s) missing.${NC}"
  echo ""
  echo "Export the following before running this script:"
  echo ""
  echo "  export BIMS_DB_URL='postgresql://postgres:<pass>@<host>:5432/bims_production'"
  echo "  export ESERVICE_DB_URL='postgresql://postgres:<pass>@<host>:5432/multysis'"
  echo "  export UNIFIED_DB_URL='postgresql://postgres.<ref>:<pass>@db.<ref>.supabase.co:5432/postgres'"
  echo ""
  exit 1
fi

# Check required tools
for tool in psql pg_dump git date; do
  if command -v "$tool" &>/dev/null; then
    ok "$tool is available ($(command -v "$tool"))"
  else
    fail "$tool is not installed or not in PATH"
  fi
done

# =============================================================================
# STEP 2 — Backup both source databases
# =============================================================================
header "STEP 2: Database Backups"

mkdir -p "$BACKUP_DIR"
info "Backup directory: $BACKUP_DIR"

# Backup BIMS
BIMS_BACKUP="$BACKUP_DIR/bims_production_${TIMESTAMP}.sql"
info "Backing up bims_production → $BIMS_BACKUP"
if pg_dump "$BIMS_DB_URL" --no-owner --no-acl -f "$BIMS_BACKUP" 2>/dev/null; then
  BIMS_SIZE=$(du -sh "$BIMS_BACKUP" | cut -f1)
  ok "BIMS backup complete ($BIMS_SIZE)"
else
  fail "BIMS pg_dump failed — check \$BIMS_DB_URL"
fi

# Backup E-Services
ESERVICE_BACKUP="$BACKUP_DIR/multysis_${TIMESTAMP}.sql"
info "Backing up multysis → $ESERVICE_BACKUP"
if pg_dump "$ESERVICE_DB_URL" --no-owner --no-acl -f "$ESERVICE_BACKUP" 2>/dev/null; then
  ESERVICE_SIZE=$(du -sh "$ESERVICE_BACKUP" | cut -f1)
  ok "E-Services backup complete ($ESERVICE_SIZE)"
else
  fail "E-Services pg_dump failed — check \$ESERVICE_DB_URL"
fi

# Verify backups are non-empty
if [[ -f "$BIMS_BACKUP" && -s "$BIMS_BACKUP" ]]; then
  ok "BIMS backup file is non-empty"
else
  fail "BIMS backup file is missing or empty"
fi

if [[ -f "$ESERVICE_BACKUP" && -s "$ESERVICE_BACKUP" ]]; then
  ok "E-Services backup file is non-empty"
else
  fail "E-Services backup file is missing or empty"
fi

# =============================================================================
# STEP 3 — git tags
# =============================================================================
header "STEP 3: Git Tags (pre-merge)"

tag_repo() {
  local name="$1"
  local path="$2"
  if [[ ! -d "$path/.git" ]]; then
    warn "$name: not a git repo at $path — skipping tag"
    return
  fi
  cd "$path"
  if git tag "pre-merge-${TIMESTAMP}" 2>/dev/null; then
    ok "$name: tagged as pre-merge-${TIMESTAMP}"
  else
    warn "$name: tag already exists or git tag failed"
  fi
  cd "$ROOT_DIR"
}

tag_repo "BIMS"       "$BIMS_REPO"
tag_repo "E-Services" "$ESERVICE_REPO"

# =============================================================================
# STEP 4 — Supabase unified DB readiness checks
# =============================================================================
header "STEP 4: Supabase Unified DB Readiness"

psql_check() {
  # Run a SQL query against UNIFIED_DB_URL, return the trimmed result
  psql "$UNIFIED_DB_URL" -t -A -c "$1" 2>/dev/null | tr -d '[:space:]'
}

# 4a — Basic connectivity
info "Testing connectivity to Supabase unified DB..."
if psql "$UNIFIED_DB_URL" -c "SELECT NOW();" &>/dev/null; then
  DB_VERSION=$(psql_check "SELECT version();")
  ok "Connected to Supabase. Server: ${DB_VERSION:0:60}..."
else
  fail "Cannot connect to Supabase unified DB — check \$UNIFIED_DB_URL"
  echo ""
  echo -e "${RED}Cannot continue connectivity checks without a database connection.${NC}"
  # Don't exit — let rest of checks run and report
fi

# 4b — PostGIS
info "Checking PostGIS extension..."
POSTGIS=$(psql_check "SELECT COUNT(*) FROM pg_extension WHERE extname = 'postgis';")
if [[ "$POSTGIS" == "1" ]]; then
  POSTGIS_VER=$(psql_check "SELECT default_version FROM pg_available_extensions WHERE name='postgis';")
  ok "PostGIS is enabled (version $POSTGIS_VER)"
else
  fail "PostGIS extension is NOT enabled. Run in Supabase SQL editor: CREATE EXTENSION IF NOT EXISTS postgis;"
fi

# 4c — pg_trgm
info "Checking pg_trgm extension..."
TRGM=$(psql_check "SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_trgm';")
if [[ "$TRGM" == "1" ]]; then
  ok "pg_trgm is enabled"
else
  fail "pg_trgm extension is NOT enabled. Run: CREATE EXTENSION IF NOT EXISTS pg_trgm;"
fi

# 4d — dblink
info "Checking dblink extension..."
DBLINK=$(psql_check "SELECT COUNT(*) FROM pg_extension WHERE extname = 'dblink';")
if [[ "$DBLINK" == "1" ]]; then
  ok "dblink is enabled"
else
  warn "dblink is NOT enabled. Migration scripts 01 and 02 need it. Run: CREATE EXTENSION IF NOT EXISTS dblink;"
fi

# 4e — schema.sql already applied? Check for key tables
info "Checking whether schema.sql has been applied..."
REQUIRED_TABLES=(
  municipalities barangays residents bims_users
  citizens subscribers eservice_users transactions
  citizen_resident_mapping
)
SCHEMA_APPLIED=true
for table in "${REQUIRED_TABLES[@]}"; do
  COUNT=$(psql_check "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';")
  if [[ "$COUNT" != "1" ]]; then
    SCHEMA_APPLIED=false
    warn "Table '$table' not found in unified DB — schema.sql may not have been applied yet"
  fi
done
if [[ "$SCHEMA_APPLIED" == "true" ]]; then
  ok "All required tables are present — schema.sql has been applied"
else
  info "To apply the schema: psql \"\$UNIFIED_DB_URL\" -f united-database/schema.sql"
fi

# =============================================================================
# STEP 5 — Size checks
# =============================================================================
header "STEP 5: Database Size Checks"

get_db_size() {
  psql "$1" -t -A -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | tr -d '[:space:]'
}

BIMS_DB_SIZE=$(get_db_size "$BIMS_DB_URL")
ESERVICE_DB_SIZE=$(get_db_size "$ESERVICE_DB_URL")
UNIFIED_DB_SIZE=$(get_db_size "$UNIFIED_DB_URL")

info "BIMS (bims_production) size:       ${BIMS_DB_SIZE:-unknown}"
info "E-Services (multysis) size:        ${ESERVICE_DB_SIZE:-unknown}"
info "Unified DB (Supabase) current:     ${UNIFIED_DB_SIZE:-unknown}"

# Row counts from source DBs
echo ""
info "Row counts in source databases:"
for table in municipalities barangays puroks residents households families bims_users; do
  COUNT=$(psql "$BIMS_DB_URL" -t -A -c "SELECT COUNT(*) FROM public.$table;" 2>/dev/null || echo "n/a")
  printf "    %-35s %s rows\n" "BIMS.$table" "$COUNT"
done
for table in citizens non_citizens subscribers transactions services; do
  COUNT=$(psql "$ESERVICE_DB_URL" -t -A -c "SELECT COUNT(*) FROM public.$table;" 2>/dev/null || echo "n/a")
  printf "    %-35s %s rows\n" "E-Services.$table" "$COUNT"
done

# =============================================================================
# STEP 6 — Final go/no-go checklist
# =============================================================================
header "STEP 6: Final Go / No-Go Checklist"

echo ""
echo "  The following must be confirmed manually before running migration scripts:"
echo ""

CHECKLIST=(
  "Supabase project tier can accommodate combined DB size (see sizes above)"
  "Supabase PgBouncer pooling is configured in project settings"
  "Both .env files updated: BIMS server/env.unified and E-Services .env.unified"
  "Maintenance window scheduled (both systems set to read-only / offline)"
  "Staff has been notified of the migration window"
  "backup files verified readable: $BACKUP_DIR/bims_production_${TIMESTAMP}.sql"
  "backup files verified readable: $BACKUP_DIR/multysis_${TIMESTAMP}.sql"
  "schema.sql applied to Supabase unified DB (psql \"\$UNIFIED_DB_URL\" -f united-database/schema.sql)"
  "seed.sql applied to Supabase unified DB   (psql \"\$UNIFIED_DB_URL\" -f united-database/seed.sql)"
)

i=1
for item in "${CHECKLIST[@]}"; do
  printf "  [  ] %d. %s\n" "$i" "$item"
  i=$((i + 1))
done

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BOLD}============================================================${NC}"
echo -e "${BOLD}  PREPARATION SUMMARY${NC}"
echo -e "${BOLD}============================================================${NC}"

if [[ $FAILURES -eq 0 && $WARNINGS -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}ALL CHECKS PASSED — Ready to run migration scripts.${NC}"
elif [[ $FAILURES -eq 0 ]]; then
  echo -e "  ${YELLOW}${BOLD}$WARNINGS warning(s) — review before proceeding.${NC}"
else
  echo -e "  ${RED}${BOLD}$FAILURES failure(s), $WARNINGS warning(s) — resolve before proceeding.${NC}"
fi

echo ""
echo "  Backups stored in: $BACKUP_DIR"
echo ""
echo "  Next steps (in order):"
echo "    1. Resolve any [FAIL] items above"
echo "    2. Apply schema:    psql \"\$UNIFIED_DB_URL\" -f united-database/schema.sql"
echo "    3. Apply seed:      psql \"\$UNIFIED_DB_URL\" -f united-database/seed.sql"
echo "    4. Migrate BIMS:    psql \"\$UNIFIED_DB_URL\" -v bims_conn=\"\$BIMS_DB_URL\" -f united-database/migrations/01_migrate_bims.sql"
echo "    5. Migrate E-Svc:   psql \"\$UNIFIED_DB_URL\" -v eservice_conn=\"\$ESERVICE_DB_URL\" -f united-database/migrations/02_migrate_eservices.sql"
echo "    6. Fuzzy match:     psql \"\$UNIFIED_DB_URL\" -f united-database/migrations/03_fuzzy_match.sql"
echo "    7. Verify:          psql \"\$UNIFIED_DB_URL\" -f united-database/migrations/04_verify_integrity.sql"
echo ""
echo -e "${BOLD}============================================================${NC}"
echo ""

# Exit with failure code if any hard failures
[[ $FAILURES -eq 0 ]] && exit 0 || exit 1
