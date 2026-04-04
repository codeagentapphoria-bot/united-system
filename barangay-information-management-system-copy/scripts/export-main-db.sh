#!/usr/bin/env bash

set -euo pipefail

# Export a comprehensive schema-only dump of the main-db database to main-db.sql
# Includes tables, columns, indexes, functions, triggers, constraints, and other
# schema objects. No data is exported. The operation is read-only and non-destructive.

# Resolve project directory (repo root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load env vars safely (only KEY=VALUE lines), avoiding execution of commands
load_env_file_safe() {
  local file="$1"
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and blank lines
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    # Strip leading/trailing whitespace (portable)
    line="$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    # Remove optional 'export ' prefix
    if [[ "$line" =~ ^export[[:space:]]+ ]]; then
      line="${line#export }"
    fi
    # Only process KEY=VALUE assignments
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      local key="${line%%=*}"
      local value="${line#*=}"
      # Preserve quoted values, or use as-is
      # Remove surrounding single/double quotes if present
      if [[ "$value" =~ ^\".*\"$ || "$value" =~ ^\'.*\'$ ]]; then
        value="${value:1:${#value}-2}"
      fi
      export "$key=$value"
    fi
  done < "$file"
}

# Optionally load env vars from server/.env.production or server/.env if present
if [[ -f "$PROJECT_DIR/server/.env.production" ]]; then
  load_env_file_safe "$PROJECT_DIR/server/.env.production"
elif [[ -f "$PROJECT_DIR/server/.env" ]]; then
  load_env_file_safe "$PROJECT_DIR/server/.env"
fi

# Prefer standard libpq vars, fall back to app-specific PG_* names, then defaults
DB_HOST="${PGHOST:-${PG_HOST:-${DB_HOST:-localhost}}}"
DB_PORT="${PGPORT:-${PG_PORT:-${DB_PORT:-5432}}}"
DB_USER="${PGUSER:-${PG_USER:-${DB_USER:-postgres}}}"
DB_PASS="${PGPASSWORD:-${PG_PASSWORD:-${DB_PASSWORD:-}}}"
DB_NAME="${PGDATABASE:-${PG_DATABASE:-${DB_NAME:-main-db}}}"

OUTPUT_FILE="$PROJECT_DIR/main-db.sql"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump not found. Please install PostgreSQL client tools." >&2
  exit 1
fi

echo "Creating schema-only dump for database: $DB_NAME"
echo "Output file: $OUTPUT_FILE"

# Export schema-only, excluding ownership and privileges for portability
# This captures all schema objects (tables, indexes, sequences, functions, triggers, etc.)
PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --format=plain \
  --encoding=UTF8 \
  -f "$OUTPUT_FILE" \
  "$DB_NAME"

echo "Schema export completed successfully."


