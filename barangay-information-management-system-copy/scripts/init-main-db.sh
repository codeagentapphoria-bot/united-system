#!/usr/bin/env bash

set -euo pipefail

# Initialize a fresh PostgreSQL database and import schema from main-db.sql
# - Creates the database if it does not already exist (non-destructive by default)
# - Optionally supports --force to DROP and recreate the database
# - Imports the schema-only dump produced by scripts/export-main-db.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DUMP_FILE="$PROJECT_DIR/main-db.sql"

# Parse flags
FORCE=0
INSTALL_EXTENSIONS=0
EXTRA_EXTENSIONS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force|-f)
      FORCE=1
      shift
      ;;
    --install-extensions)
      INSTALL_EXTENSIONS=1
      shift
      ;;
    --extensions=*)
      EXTRA_EXTENSIONS="${1#*=}"
      shift
      ;;
    --)
      shift; break
      ;;
    *)
      # Unknown arg; ignore for forward-compat
      shift
      ;;
  esac
done

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

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql not found. Please install PostgreSQL client tools." >&2
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Error: $DUMP_FILE not found. Run scripts/export-main-db.sh first." >&2
  exit 1
fi

echo "Initializing database: $DB_NAME"

# Check if DB exists
EXISTS=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" || echo "")

if [[ "$EXISTS" == "1" ]]; then
  if [[ $FORCE -eq 1 ]]; then
    echo "Database $DB_NAME exists. Dropping (force mode)..."
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME';"
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE \"$DB_NAME\";"
  else
    echo "Database $DB_NAME already exists. Aborting to avoid destructive changes."
    echo "Pass --force to drop and recreate it, or use a new DB name via PGDATABASE/PG_DATABASE."
    exit 1
  fi
fi

# Create database
echo "Creating database $DB_NAME..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\";"

# Discover required extensions from dump
discover_extensions_from_dump() {
  local dump_file="$1"
  # Extract extension names from CREATE EXTENSION statements
  grep -Ei '^[[:space:]]*CREATE[[:space:]]+EXTENSION' "$dump_file" | \
    sed -E 's/.*CREATE[[:space:]]+EXTENSION[[:space:]]+(IF[[:space:]]+NOT[[:space:]]+EXISTS[[:space:]]+)?"?([a-zA-Z0-9_]+)"?.*/\2/i' | \
    tr '[:upper:]' '[:lower:]' | \
    sort -u
}

# Attempt to install OS packages for common extensions (Ubuntu/Debian only)
attempt_install_extension_packages() {
  local ext_names=("$@")
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "apt-get not available; skipping package installation."
    return 0
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo not available; skipping package installation."
    return 0
  fi
  # Determine major version
  local ver_num
  ver_num=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -Atc "SHOW server_version_num;" || true)
  local pg_major=0
  if [[ "$ver_num" =~ ^[0-9]+$ ]]; then
    pg_major=$(( ver_num / 10000 ))
  fi
  export DEBIAN_FRONTEND=noninteractive
  echo "Updating package index..."
  sudo -n apt-get update -y || true
  # Install contrib for generic extensions
  sudo -n apt-get install -y postgresql-contrib || true
  if [[ $pg_major -ge 9 ]]; then
    sudo -n apt-get install -y "postgresql-$pg_major-contrib" || true
  fi
  # Install PostGIS if requested
  for ext in "${ext_names[@]}"; do
    if [[ "$ext" == "postgis" || "$ext" == "postgis_raster" || "$ext" == "postgis_topology" ]]; then
      if [[ $pg_major -gt 0 ]]; then
        sudo -n apt-get install -y "postgresql-$pg_major-postgis-3" "postgresql-$pg_major-postgis-3-scripts" postgis || true
      else
        sudo -n apt-get install -y postgis || true
      fi
      break
    fi
  done
}

enable_extensions_in_db() {
  local db_name="$1"; shift
  local ext_names=("$@")
  if [[ ${#ext_names[@]} -eq 0 ]]; then
    return 0
  fi
  echo "Ensuring extensions in $db_name: ${ext_names[*]}"
  local failed=0
  for ext in "${ext_names[@]}"; do
    # Check availability
    local available
    available=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db_name" -Atc "SELECT 1 FROM pg_available_extensions WHERE name = '$ext';" || echo "")
    if [[ "$available" != "1" ]]; then
      echo "Extension '$ext' is not available on server."
      failed=1
      continue
    fi
    # Enable extension
    if ! PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db_name" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS \"$ext\";" >/dev/null; then
      echo "Failed to enable extension '$ext' in database '$db_name'"
      failed=1
    fi
  done
  return $failed
}

# Build extension list: discovered + optional extras
readarray -t DISCOVERED_EXTS < <(discover_extensions_from_dump "$DUMP_FILE" || true)
IFS=',' read -r -a EXTRA_EXTS_ARR <<< "$EXTRA_EXTENSIONS"
REQUIRED_EXTS=("${DISCOVERED_EXTS[@]}" "${EXTRA_EXTS_ARR[@]}")

# Optionally install OS packages for extensions
if [[ $INSTALL_EXTENSIONS -eq 1 && ${#REQUIRED_EXTS[@]} -gt 0 ]]; then
  attempt_install_extension_packages "${REQUIRED_EXTS[@]}"
fi

# Enable extensions before schema import
if [[ ${#REQUIRED_EXTS[@]} -gt 0 ]]; then
  if ! enable_extensions_in_db "$DB_NAME" "${REQUIRED_EXTS[@]}"; then
    echo "Warning: Some extensions could not be enabled. Schema import may fail if they are required."
  fi
fi

# Import schema
echo "Importing schema from $DUMP_FILE..."
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

echo "Database initialization completed successfully."


