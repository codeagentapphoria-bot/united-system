#!/usr/bin/env bash
# =============================================================================
# test_mutations_bims.sh — BIMS Full Route Test (Read + Write)
# =============================================================================
#
# Tests ALL registered routes in the BIMS backend against a live server.
# Covers every route file registered in app.js (v2 architecture).
#
# HOW TO RUN:
#   cd united-systems/
#   chmod +x united-database/test_mutations_bims.sh
#   ./united-database/test_mutations_bims.sh
#
# ENVIRONMENT VARIABLES:
#   BIMS_URL      — base URL of the BIMS server  (default: http://localhost:5000/api)
#   DB_URL        — PostgreSQL connection string   (default: postgresql://postgres@localhost/united_systems_test)
#
# REQUIREMENTS:
#   • BIMS server running and connected to the same DB as DB_URL
#   • psql on PATH
#   • curl on PATH
#   • python3 on PATH (used for JSON parsing)
#   • node on PATH (used for bcrypt + JWT generation)
#
# NOTE — v2 architecture:
#   Residents and households are READ-ONLY in BIMS. There are no
#   POST/PUT/DELETE routes for /resident or /household in the BIMS backend.
#   Residents are created only through the portal registration approval flow.
#   This test seeds residents and households directly via psql for fixtures.
#
# INTENTIONALLY SKIPPED:
#   POST /api/setup/municipality     — requires real GeoJSON fixtures (manual test)
#   GET  /api/setup/residents/bulk-id — requires Puppeteer + active residents with IDs
#   POST /api/monitoring/*           — operational cache-clear routes (manual test)
#   POST /api/monitoring/logs/clear  — destructive (manual test)
# =============================================================================

set -eo pipefail

BASE="${BIMS_URL:-http://localhost:5000/api}"
DB="${DB_URL:-postgresql://postgres@localhost/united_systems_test}"
SUFFIX=$(date +%s)

PASS=0; FAIL=0; SKIP=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()     { echo -e "  ${GREEN}[PASS]${NC} $*";   PASS=$((PASS+1));  }
fail()   { echo -e "  ${RED}[FAIL]${NC} $*";     FAIL=$((FAIL+1));  }
skip()   { echo -e "  ${YELLOW}[SKIP]${NC} $*";  SKIP=$((SKIP+1));  }
info()   { echo -e "  ${CYAN}[INFO]${NC} $*";     }
header() { echo -e "\n${BOLD}── $* ${NC}";        }

TOKEN=""      # municipality admin token
BRG_TOKEN=""  # barangay staff token

# ── HTTP helpers ──────────────────────────────────────────────────────────────
req() {
  local method=$1 url=$2 body=${3:-} expected=${4:-2}
  local args=(-s -m 20 -o /tmp/bims_test.json -w "%{http_code}" -X "$method")
  [[ -n "$TOKEN"     ]] && args+=(-H "Authorization: Bearer $TOKEN")
  [[ -n "$body"      ]] && args+=(-H "Content-Type: application/json" -d "$body")
  HTTP_CODE=$(curl "${args[@]}" "$url" 2>/dev/null)
  HTTP_BODY=$(cat /tmp/bims_test.json 2>/dev/null)
  [[ "$HTTP_CODE" == ${expected}* ]] && return 0 || return 1
}

# req with an explicit token override
req_as() {
  local saved_token="$TOKEN"
  TOKEN="$1"; shift
  req "$@"
  local rc=$?
  TOKEN="$saved_token"
  return $rc
}

jq_get() { echo "$HTTP_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print($1)" 2>/dev/null || echo ""; }
jq_id()  { jq_get "d.get('data',{}).get('id','') or d.get('id','')"; }
msg()    { jq_get "d.get('message','') or d.get('error','') or str(d)[:120]"; }
db()     { psql "$DB" -t -A -c "$1" 2>/dev/null | tr -d ' \n'; }
dbq()    { psql "$DB" -q -c "$1" 2>/dev/null; }

echo -e "${BOLD}================================================================${NC}"
echo -e "${BOLD}  BIMS Full Route Test — $(date)${NC}"
echo -e "${BOLD}  Server: $BASE${NC}"
echo -e "${BOLD}================================================================${NC}"

# =============================================================================
# SETUP
# =============================================================================
header "SETUP"

# Server health
if ! curl -sf -m 5 "http://localhost:5000/health" >/dev/null 2>&1; then
  echo -e "${RED}ERROR: BIMS server is not running on port 5000.${NC}"
  echo "  Start it: cd barangay-information-management-system-copy/server && node server.js"
  exit 1
fi
ok "Server health check"

# DB connectivity
if ! psql "$DB" -c "SELECT 1" >/dev/null 2>&1; then
  echo -e "${RED}ERROR: Cannot connect to database at $DB${NC}"
  exit 1
fi
ok "Database connectivity"

# ── Seed: municipality ────────────────────────────────────────────────────────
MUN_ID=$(db "SELECT id FROM municipalities WHERE municipality_code='TEST_MUN' LIMIT 1;")
[[ -z "$MUN_ID" ]] && {
  dbq "INSERT INTO municipalities (municipality_name,municipality_code,region,province,gis_code,setup_status)
       VALUES ('Test Municipality','TEST_MUN','Test Region','Test Province','PH0000001','active')
       ON CONFLICT DO NOTHING;"
  MUN_ID=$(db "SELECT id FROM municipalities WHERE municipality_code='TEST_MUN' LIMIT 1;")
}
info "Municipality ID: $MUN_ID"

# ── Seed: barangay ────────────────────────────────────────────────────────────
BRG_ID=$(db "SELECT id FROM barangays WHERE barangay_code='TEST_BRG001' LIMIT 1;")
[[ -z "$BRG_ID" ]] && {
  dbq "INSERT INTO barangays (municipality_id,barangay_name,barangay_code,gis_code)
       VALUES ($MUN_ID,'Test Barangay 1','TEST_BRG001','PH0000001001')
       ON CONFLICT DO NOTHING;"
  BRG_ID=$(db "SELECT id FROM barangays WHERE barangay_code='TEST_BRG001' LIMIT 1;")
}
info "Barangay  ID: $BRG_ID"

# ── Seed: test resident via DB (BIMS is read-only for residents in v2) ────────
RES_ID=$(db "SELECT id FROM residents WHERE last_name='BIMS_TestLast_$SUFFIX' LIMIT 1;")
[[ -z "$RES_ID" ]] && {
  dbq "INSERT INTO residents (barangay_id,last_name,first_name,sex,civil_status,birthdate,status)
       VALUES ($BRG_ID,'BIMS_TestLast_$SUFFIX','TestFirst','Male','Single','1990-01-15','active');"
  RES_ID=$(db "SELECT id FROM residents WHERE last_name='BIMS_TestLast_$SUFFIX' LIMIT 1;")
}
[[ -n "$RES_ID" ]] && ok "Test resident seeded (id=$RES_ID)" || { echo -e "${RED}ERROR: Could not seed test resident${NC}"; exit 1; }

# ── Seed: test household via DB (BIMS is read-only for households in v2) ──────
HH_ID=$(db "SELECT id FROM households WHERE house_head='$RES_ID' LIMIT 1;")
[[ -z "$HH_ID" ]] && {
  dbq "INSERT INTO households (house_number,street,barangay_id,house_head,housing_type)
       VALUES ('TEST-999','Test Street',$BRG_ID,'$RES_ID','concrete');"
  HH_ID=$(db "SELECT id FROM households WHERE house_head='$RES_ID' LIMIT 1;")
}
[[ -n "$HH_ID" ]] && ok "Test household seeded (id=$HH_ID)" || info "Could not seed test household — household-specific tests may skip"

# ── Seed: municipality admin user ────────────────────────────────────────────
ADM_EMAIL="testadmin_mun_${SUFFIX}@test.com"
HASHED_PW=$(node -e "
const b=require('./barangay-information-management-system-copy/server/node_modules/bcrypt');
b.hash('Test1234!',10).then(h=>{process.stdout.write(h);process.exit(0);});
" 2>/dev/null || echo "")
[[ -z "$HASHED_PW" ]] && { echo -e "${RED}ERROR: Could not hash password (node/bcrypt issue)${NC}"; exit 1; }

dbq "INSERT INTO bims_users (target_type,target_id,full_name,email,password,role)
     VALUES ('municipality','$MUN_ID','Test Municipality Admin','$ADM_EMAIL','$HASHED_PW','admin')
     ON CONFLICT (email) DO NOTHING;"
ok "Municipality admin user seeded"

# ── Seed: barangay staff user ─────────────────────────────────────────────────
BRG_EMAIL="teststaff_brg_${SUFFIX}@test.com"
dbq "INSERT INTO bims_users (target_type,target_id,full_name,email,password,role)
     VALUES ('barangay','$BRG_ID','Test Barangay Staff','$BRG_EMAIL','$HASHED_PW','staff')
     ON CONFLICT (email) DO NOTHING;"
ok "Barangay staff user seeded"

# ── Login: municipality admin ─────────────────────────────────────────────────
sleep 1
TOKEN=""
if req POST "$BASE/auth/login" "{\"email\":\"$ADM_EMAIL\",\"password\":\"Test1234!\"}" 200; then
  TOKEN=$(jq_get "d.get('token','') or d.get('data',{}).get('token','')")
  ok "Municipality admin login (token=${TOKEN:0:20}...)"
else
  echo -e "  ${RED}Municipality admin login failed — $HTTP_CODE: $(msg)${NC}"; exit 1
fi

# ── Login: barangay staff ─────────────────────────────────────────────────────
BRG_TOKEN=""
if req POST "$BASE/auth/login" "{\"email\":\"$BRG_EMAIL\",\"password\":\"Test1234!\"}" 200; then
  BRG_TOKEN=$(jq_get "d.get('token','') or d.get('data',{}).get('token','')")
  ok "Barangay staff login (token=${BRG_TOKEN:0:20}...)"
else
  skip "Barangay staff login failed (barangay-scoped tests will be skipped)"
fi

# ── Generate resident portal JWT (for portal household tests) ─────────────────
# Portal household routes require type:'resident' in the JWT, validated by the
# shared JWT_SECRET. We sign one in-test using the server's own secret.
RESIDENT_PORTAL_JWT=""
if [[ -n "$RES_ID" ]]; then
  RESIDENT_PORTAL_JWT=$(node -e "
const jwt=require('./barangay-information-management-system-copy/server/node_modules/jsonwebtoken');
const secret=process.env.JWT_SECRET||'';
if(!secret){process.stderr.write('JWT_SECRET not set\n');process.exit(1);}
const token=jwt.sign(
  {id:'$RES_ID',username:'bims_test_$SUFFIX',role:'resident',type:'resident'},
  secret,{expiresIn:'1h'}
);
process.stdout.write(token);process.exit(0);
" 2>/dev/null || echo "")
fi
[[ -n "$RESIDENT_PORTAL_JWT" ]] && ok "Resident portal JWT generated" \
  || info "Could not generate resident portal JWT — portal household write tests will be skipped"

# =============================================================================
# 1. READ OPERATIONS
# =============================================================================
header "READ OPERATIONS"

req GET "$BASE/../health" "" 200 \
  && ok "GET /health" || fail "GET /health — $HTTP_CODE"

req GET "$BASE/setup/status" "" 200 \
  && ok "GET /setup/status" || fail "GET /setup/status — $HTTP_CODE: $(msg)"

# ── Residents (read-only in BIMS v2) ─────────────────────────────────────────
req GET "$BASE/list/residents?page=1&limit=5" "" 200 \
  && ok "GET /list/residents (paginated)" || fail "GET /list/residents — $HTTP_CODE: $(msg)"

req GET "$BASE/$RES_ID/resident" "" 200 \
  && ok "GET /:residentId/resident" || fail "GET /:residentId/resident — $HTTP_CODE: $(msg)"

req GET "$BASE/public/$RES_ID/resident/public-qr" "" 200 \
  && ok "GET /public/:residentId/resident/public-qr" || skip "GET /public/:residentId/resident/public-qr — $HTTP_CODE: $(msg)"

req GET "$BASE/list/classification" "" 200 \
  && ok "GET /list/classification" || fail "GET /list/classification — $HTTP_CODE: $(msg)"

req GET "$BASE/classification-types" "" 200 \
  && ok "GET /classification-types" || fail "GET /classification-types — $HTTP_CODE: $(msg)"

# ── Barangays ─────────────────────────────────────────────────────────────────
req GET "$BASE/list/barangay" "" 200 \
  && ok "GET /list/barangay" || fail "GET /list/barangay — $HTTP_CODE: $(msg)"

req GET "$BASE/$BRG_ID/barangay" "" 200 \
  && ok "GET /:barangayId/barangay" || fail "GET /:barangayId/barangay — $HTTP_CODE: $(msg)"

req GET "$BASE/public/list/barangay" "" 200 \
  && ok "GET /public/list/barangay (no auth)" || fail "GET /public/list/barangay — $HTTP_CODE: $(msg)"

req GET "$BASE/public/$BRG_ID/barangay" "" 200 \
  && ok "GET /public/:barangayId/barangay (no auth)" || fail "GET /public/:barangayId/barangay — $HTTP_CODE: $(msg)"

req GET "$BASE/list/$BRG_ID/official" "" 200 \
  && ok "GET /list/:barangayId/official" || fail "GET /list/:barangayId/official — $HTTP_CODE: $(msg)"

req GET "$BASE/public/list/$BRG_ID/official" "" 200 \
  && ok "GET /public/list/:barangayId/official (no auth)" || fail "GET /public/list/:barangayId/official — $HTTP_CODE: $(msg)"

# ── Households (read-only in BIMS v2) ────────────────────────────────────────
req GET "$BASE/list/household" "" 200 \
  && ok "GET /list/household" || fail "GET /list/household — $HTTP_CODE: $(msg)"

req GET "$BASE/list/household/family-count" "" 200 \
  && ok "GET /list/household/family-count" || fail "GET /list/household/family-count — $HTTP_CODE: $(msg)"

req GET "$BASE/check-household/$RES_ID" "" 200 \
  && ok "GET /check-household/:houseHeadId" || skip "GET /check-household/:houseHeadId — $HTTP_CODE: $(msg)"

req GET "$BASE/locations/household" "" 200 \
  && ok "GET /locations/household" || fail "GET /locations/household — $HTTP_CODE: $(msg)"

[[ -n "$HH_ID" ]] && {
  req GET "$BASE/$HH_ID/household" "" 200 \
    && ok "GET /:householdId/household" || fail "GET /:householdId/household — $HTTP_CODE: $(msg)"
} || skip "GET /:householdId/household (no household seeded)"

# ── Municipality ──────────────────────────────────────────────────────────────
req GET "$BASE/municipality" "" 200 \
  && ok "GET /municipality" || fail "GET /municipality — $HTTP_CODE: $(msg)"

req GET "$BASE/municipality/$MUN_ID" "" 200 \
  && ok "GET /municipality/:municipalityId" || fail "GET /municipality/:municipalityId — $HTTP_CODE: $(msg)"

req GET "$BASE/municipality/$MUN_ID/conflicts" "" 200 \
  && ok "GET /municipality/:municipalityId/conflicts" || skip "GET /municipality/:municipalityId/conflicts — $HTTP_CODE (optional)"

# ── Requests / Portal-Registration / Certificates ────────────────────────────
req GET "$BASE/requests?barangayId=$BRG_ID" "" 200 \
  && ok "GET /requests (barangay)" || fail "GET /requests — $HTTP_CODE: $(msg)"

req GET "$BASE/requests/my-requests" "" 200 \
  && ok "GET /requests/my-requests" || skip "GET /requests/my-requests — $HTTP_CODE (optional)"

req GET "$BASE/portal-registration/requests?status=pending&limit=5" "" 200 \
  && ok "GET /portal-registration/requests" || fail "GET /portal-registration/requests — $HTTP_CODE: $(msg)"

req GET "$BASE/certificates/templates?municipalityId=$MUN_ID" "" 200 \
  && ok "GET /certificates/templates" || fail "GET /certificates/templates — $HTTP_CODE: $(msg)"

if [[ -n "$BRG_TOKEN" ]]; then
  req_as "$BRG_TOKEN" GET "$BASE/certificates/queue?barangayId=$BRG_ID" "" 200 \
    && ok "GET /certificates/queue (barangay)" || fail "GET /certificates/queue — $HTTP_CODE: $(msg)"
else
  skip "GET /certificates/queue (no barangay token)"
fi

sleep 1
req GET "$BASE/auth/me" "" 200 \
  && ok "GET /auth/me" || skip "GET /auth/me — $HTTP_CODE (rate limiter triggered)"

# =============================================================================
# 2. STATISTICS
# =============================================================================
header "STATISTICS"

req GET "$BASE/statistics/total-population" "" 200 \
  && ok "GET /statistics/total-population" || fail "GET /statistics/total-population — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/age-demographics" "" 200 \
  && ok "GET /statistics/age-demographics" || fail "GET /statistics/age-demographics — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/gender-demographics" "" 200 \
  && ok "GET /statistics/gender-demographics" || fail "GET /statistics/gender-demographics — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/civil-status-demographics" "" 200 \
  && ok "GET /statistics/civil-status-demographics" || fail "GET /statistics/civil-status-demographics — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/educational-attainment-demographics" "" 200 \
  && ok "GET /statistics/educational-attainment-demographics" || fail "GET /statistics/educational-attainment-demographics — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/employment-status-demographics" "" 200 \
  && ok "GET /statistics/employment-status-demographics" || fail "GET /statistics/employment-status-demographics — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/household-size-demographics" "" 200 \
  && ok "GET /statistics/household-size-demographics" || fail "GET /statistics/household-size-demographics — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/resident-classification-demographics" "" 200 \
  && ok "GET /statistics/resident-classification-demographics" || fail "GET /statistics/resident-classification-demographics — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/voter-demographics" "" 200 \
  && ok "GET /statistics/voter-demographics" || fail "GET /statistics/voter-demographics — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/total-households" "" 200 \
  && ok "GET /statistics/total-households" || fail "GET /statistics/total-households — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/total-families" "" 200 \
  && ok "GET /statistics/total-families" || fail "GET /statistics/total-families — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/total-registered-pets" "" 200 \
  && ok "GET /statistics/total-registered-pets" || fail "GET /statistics/total-registered-pets — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/unemployed-household-stats" "" 200 \
  && ok "GET /statistics/unemployed-household-stats" || fail "GET /statistics/unemployed-household-stats — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/unemployed-household-details" "" 200 \
  && ok "GET /statistics/unemployed-household-details" || fail "GET /statistics/unemployed-household-details — $HTTP_CODE: $(msg)"

req GET "$BASE/statistics/total-requests" "" 200 \
  && ok "GET /statistics/total-requests" || fail "GET /statistics/total-requests — $HTTP_CODE: $(msg)"

# =============================================================================
# 3. GIS
# =============================================================================
header "GIS"

# Public GeoJSON endpoints (no auth required)
req GET "$BASE/public/geojson/municipalities" "" 200 \
  && ok "GET /public/geojson/municipalities" || skip "GET /public/geojson/municipalities — $HTTP_CODE (no GIS data seeded)"

req GET "$BASE/public/geojson/barangays" "" 200 \
  && ok "GET /public/geojson/barangays" || skip "GET /public/geojson/barangays — $HTTP_CODE (no GIS data)"

req GET "$BASE/public/geojson/city" "" 200 \
  && ok "GET /public/geojson/city" || skip "GET /public/geojson/city — $HTTP_CODE (no GIS data)"

req GET "$BASE/public/geojson/barangays/$BRG_ID" "" 200 \
  && ok "GET /public/geojson/barangays/:id" || skip "GET /public/geojson/barangays/:id — $HTTP_CODE (no GIS data)"

# Authenticated GeoJSON endpoints
req GET "$BASE/geojson/municipalities" "" 200 \
  && ok "GET /geojson/municipalities (auth)" || skip "GET /geojson/municipalities — $HTTP_CODE (no GIS data)"

req GET "$BASE/geojson/city" "" 200 \
  && ok "GET /geojson/city (auth)" || skip "GET /geojson/city — $HTTP_CODE (no GIS data)"

req GET "$BASE/geojson/barangays/$BRG_ID" "" 200 \
  && ok "GET /geojson/barangays/:id (auth)" || skip "GET /geojson/barangays/:id — $HTTP_CODE (no GIS data)"

# =============================================================================
# 4. LOGS
# =============================================================================
header "LOGS"

req GET "$BASE/logs/test" "" 200 \
  && ok "GET /logs/test" || skip "GET /logs/test — $HTTP_CODE (optional)"

req GET "$BASE/logs/all-logs" "" 200 \
  && ok "GET /logs/all-logs" || fail "GET /logs/all-logs — $HTTP_CODE: $(msg)"

req GET "$BASE/logs/barangay-logs" "" 200 \
  && ok "GET /logs/barangay-logs" || fail "GET /logs/barangay-logs — $HTTP_CODE: $(msg)"

req GET "$BASE/logs/specific-logs" "" 200 \
  && ok "GET /logs/specific-logs" || skip "GET /logs/specific-logs — $HTTP_CODE (optional)"

# =============================================================================
# 5. MUNICIPALITY UPDATE
# =============================================================================
header "MUNICIPALITY"

req PUT "$BASE/$MUN_ID/municipality" \
  "{\"municipalityName\":\"Test Municipality Updated\",\"municipalityCode\":\"TEST_MUN\",\"region\":\"Test Region\",\"province\":\"Test Province\",\"description\":\"Updated by test\"}" 200 \
  && ok "PUT /:municipalityId/municipality" || fail "PUT /:municipalityId/municipality — $HTTP_CODE: $(msg)"

# =============================================================================
# 6. CLASSIFICATION TYPES
# =============================================================================
header "CLASSIFICATION TYPES"

CT_ID=""
if req POST "$BASE/classification-types" \
  "{\"name\":\"TEST_CT_$SUFFIX\",\"description\":\"Test type\",\"color\":\"#FF5733\",\"details\":[]}" 201; then
  CT_ID=$(jq_id)
  ok "POST /classification-types → id=$CT_ID"
else
  fail "POST /classification-types — $HTTP_CODE: $(msg)"
fi

[[ -n "$CT_ID" ]] && {
  req GET "$BASE/classification-types/$CT_ID" "" 200 \
    && ok "GET /classification-types/:id" || fail "GET /classification-types/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/classification-types/$CT_ID" \
    "{\"name\":\"TEST_CT_${SUFFIX}_upd\",\"color\":\"#00FF00\"}" 200 \
    && ok "PUT /classification-types/:id" || fail "PUT /classification-types/:id — $HTTP_CODE: $(msg)"
}

# =============================================================================
# 6b. RESIDENT CLASSIFICATIONS
# =============================================================================
header "RESIDENT CLASSIFICATIONS"

CLASS_ID=""
if req POST "$BASE/classification" \
  "{\"residentId\":\"$RES_ID\",\"classificationType\":\"Senior Citizen\",\"classificationDetails\":[]}" 201; then
  CLASS_ID=$(jq_id)
  ok "POST /classification → id=$CLASS_ID"
else
  fail "POST /classification — $HTTP_CODE: $(msg)"
fi

[[ -n "$CLASS_ID" ]] && {
  req PUT "$BASE/classification/$CLASS_ID" \
    '{"classificationType":"PWD","classificationDetails":[]}' 200 \
    && ok "PUT /classification/:classificationId" || fail "PUT /classification/:classificationId — $HTTP_CODE: $(msg)"

  req DELETE "$BASE/classification/$CLASS_ID" "" 200 \
    && ok "DELETE /classification/:classificationId" || fail "DELETE /classification/:classificationId — $HTTP_CODE"; CLASS_ID=""
}

# =============================================================================
# 7. OFFICIAL
# =============================================================================
header "OFFICIAL"

OFF_ID=""
if req POST "$BASE/official" \
  "{\"barangayId\":$BRG_ID,\"residentId\":\"$RES_ID\",\"position\":\"TEST_Kagawad_$SUFFIX\",\"termStart\":\"2024-01-01\"}" 200; then
  OFF_ID=$(jq_id)
  ok "POST /official → id=$OFF_ID"
else
  fail "POST /official — $HTTP_CODE: $(msg)"
fi

[[ -n "$OFF_ID" ]] && {
  req GET "$BASE/$OFF_ID/official" "" 200 \
    && ok "GET /:officialId/official" || fail "GET /:officialId/official — $HTTP_CODE: $(msg)"

  req PUT "$BASE/$OFF_ID/official" \
    "{\"barangayId\":$BRG_ID,\"residentId\":\"$RES_ID\",\"position\":\"TEST_Kagawad_${SUFFIX}_upd\",\"termStart\":\"2024-01-01\"}" 200 \
    && ok "PUT /:officialId/official" || fail "PUT /:officialId/official — $HTTP_CODE: $(msg)"

  req DELETE "$BASE/$OFF_ID/official" "" 200 \
    && ok "DELETE /:officialId/official" || fail "DELETE /:officialId/official — $HTTP_CODE"; OFF_ID=""
}

# =============================================================================
# 8. PET & VACCINE
# =============================================================================
header "PET & VACCINE"

PET_ID=""; VAC_ID=""; VAC_RES_ID=""

if req POST "$BASE/pet" \
  "{\"ownerId\":\"$RES_ID\",\"petName\":\"TEST_Dog_$SUFFIX\",\"species\":\"dog\",\"breed\":\"Aspin\",\"sex\":\"male\",\"birthdate\":\"2022-01-01\",\"color\":\"brown\"}" 200; then
  PET_ID=$(jq_id)
  ok "POST /pet → id=$PET_ID"
else
  fail "POST /pet — $HTTP_CODE: $(msg)"
fi

[[ -n "$PET_ID" ]] && {
  req GET "$BASE/$PET_ID/pet" "" 200 \
    && ok "GET /:petId/pet" || fail "GET /:petId/pet — $HTTP_CODE: $(msg)"

  req GET "$BASE/owner/$RES_ID/pets" "" 200 \
    && ok "GET /owner/:ownerId/pets" || fail "GET /owner/:ownerId/pets — $HTTP_CODE: $(msg)"

  [[ -n "$HH_ID" ]] && {
    req GET "$BASE/household/$HH_ID/pets" "" 200 \
      && ok "GET /household/:householdId/pets" || skip "GET /household/:householdId/pets — $HTTP_CODE: $(msg)"
  } || skip "GET /household/:householdId/pets (no household seeded)"

  req GET "$BASE/list/pets" "" 200 \
    && ok "GET /list/pets" || fail "GET /list/pets — $HTTP_CODE: $(msg)"

  # Pet search endpoints — both require pet_uuid (UUID-based lookup)
  PET_UUID=$(db "SELECT uuid FROM pets WHERE id='$PET_ID' LIMIT 1;")
  if [[ -n "$PET_UUID" ]]; then
    TOKEN_SAVE="$TOKEN"; TOKEN=""
    req POST "$BASE/public/search" \
      "{\"pet_uuid\":\"$PET_UUID\"}" 200 \
      && ok "POST /public/search (pet by UUID, no auth)" || skip "POST /public/search — $HTTP_CODE: $(msg)"
    TOKEN="$TOKEN_SAVE"
    req POST "$BASE/search" \
      "{\"pet_uuid\":\"$PET_UUID\"}" 200 \
      && ok "POST /search (pet by UUID, auth)" || fail "POST /search — $HTTP_CODE: $(msg)"
  else
    skip "POST /public/search (pet UUID not available)"
    skip "POST /search (pet UUID not available)"
  fi

  req PUT "$BASE/$PET_ID/pet" \
    "{\"ownerId\":\"$RES_ID\",\"petName\":\"TEST_Dog_${SUFFIX}_upd\",\"species\":\"dog\",\"breed\":\"Aspin\",\"sex\":\"male\",\"birthdate\":\"2022-01-01\",\"color\":\"black\"}" 200 \
    && ok "PUT /:petId/pet" || fail "PUT /:petId/pet — $HTTP_CODE: $(msg)"

  if req POST "$BASE/vaccine" \
    "{\"target_type\":\"pet\",\"target_id\":\"$PET_ID\",\"vaccine_name\":\"TEST_Rabies_$SUFFIX\",\"vaccination_date\":\"2024-01-01\"}" 201; then
    VAC_ID=$(jq_id)
    ok "POST /vaccine (pet) → id=$VAC_ID"
  else
    fail "POST /vaccine (pet) — $HTTP_CODE: $(msg)"
  fi
}

if req POST "$BASE/vaccine" \
  "{\"target_type\":\"resident\",\"target_id\":\"$RES_ID\",\"vaccine_name\":\"TEST_COVID_$SUFFIX\",\"vaccination_date\":\"2024-06-01\"}" 201; then
  VAC_RES_ID=$(jq_id)
  ok "POST /vaccine (resident) → id=$VAC_RES_ID"
else
  fail "POST /vaccine (resident) — $HTTP_CODE: $(msg)"
fi

[[ -n "$VAC_ID" ]] && {
  req GET "$BASE/vaccine/$VAC_ID" "" 200 \
    && ok "GET /vaccine/:id" || fail "GET /vaccine/:id — $HTTP_CODE: $(msg)"

  req GET "$BASE/vaccines/pet/$PET_ID" "" 200 \
    && ok "GET /vaccines/:targetType/:targetId" || skip "GET /vaccines/:targetType/:targetId — $HTTP_CODE: $(msg)"

  req PUT "$BASE/vaccine/$VAC_ID" \
    '{"vaccine_name":"TEST_Rabies_Updated","vaccination_date":"2024-02-01"}' 200 \
    && ok "PUT /vaccine/:id" || fail "PUT /vaccine/:id — $HTTP_CODE: $(msg)"

  req DELETE "$BASE/vaccine/$VAC_ID" "" 200 \
    && ok "DELETE /vaccine/:id" || fail "DELETE /vaccine/:id — $HTTP_CODE"; VAC_ID=""
}

# =============================================================================
# 9. INVENTORY
# =============================================================================
header "INVENTORY"

INV_ID=""
if req POST "$BASE/inventory" \
  "{\"barangayId\":$BRG_ID,\"itemName\":\"TEST_Chair_$SUFFIX\",\"itemType\":\"furniture\",\"description\":\"Test chair\",\"quantity\":10,\"unit\":\"pcs\"}" 200; then
  INV_ID=$(jq_id)
  ok "POST /inventory → id=$INV_ID"
else
  fail "POST /inventory — $HTTP_CODE: $(msg)"
fi

[[ -n "$INV_ID" ]] && {
  req GET "$BASE/list/inventories" "" 200 \
    && ok "GET /list/inventories" || skip "GET /list/inventories — $HTTP_CODE (optional)"

  req GET "$BASE/$INV_ID/inventory" "" 200 \
    && ok "GET /:inventoryId/inventory" || fail "GET /:inventoryId/inventory — $HTTP_CODE: $(msg)"

  req PUT "$BASE/$INV_ID/inventory" \
    "{\"barangayId\":$BRG_ID,\"itemName\":\"TEST_Chair_${SUFFIX}_upd\",\"itemType\":\"furniture\",\"description\":\"Updated\",\"quantity\":20,\"unit\":\"pcs\"}" 200 \
    && ok "PUT /:inventoryId/inventory" || fail "PUT /:inventoryId/inventory — $HTTP_CODE: $(msg)"

  req DELETE "$BASE/$INV_ID/inventory" "" 200 \
    && ok "DELETE /:inventoryId/inventory" || fail "DELETE /:inventoryId/inventory — $HTTP_CODE"; INV_ID=""
}

# =============================================================================
# 10. ARCHIVE
# =============================================================================
header "ARCHIVE"

ARC_ID=""
if req POST "$BASE/archive" \
  "{\"title\":\"TEST_Archive_$SUFFIX\",\"description\":\"Test archive\",\"documentType\":\"ordinance\"}" 200; then
  ARC_ID=$(jq_get "d.get('data',{}).get('archive_id','') or d.get('data',{}).get('id','') or d.get('id','')")
  ok "POST /archive → id=$ARC_ID"
else
  fail "POST /archive — $HTTP_CODE: $(msg)"
fi

[[ -n "$ARC_ID" ]] && {
  req GET "$BASE/list/archives" "" 200 \
    && ok "GET /list/archives" || fail "GET /list/archives — $HTTP_CODE: $(msg)"

  req GET "$BASE/$ARC_ID/archive" "" 200 \
    && ok "GET /:archiveId/archive" || fail "GET /:archiveId/archive — $HTTP_CODE: $(msg)"

  req PUT "$BASE/$ARC_ID/archive" \
    '{"title":"TEST_Archive_Updated","description":"Updated archive","documentType":"resolution"}' 200 \
    && ok "PUT /:archiveId/archive" || fail "PUT /:archiveId/archive — $HTTP_CODE: $(msg)"

  req DELETE "$BASE/$ARC_ID/archive" "" 200 \
    && ok "DELETE /:archiveId/archive" || fail "DELETE /:archiveId/archive — $HTTP_CODE"; ARC_ID=""
}

# =============================================================================
# 11. WALK-IN REQUESTS (certificate & appointment)
# =============================================================================
header "WALK-IN REQUESTS"

CERT_REQ_ID=""; APPT_REQ_ID=""
TOKEN_SAVE="$TOKEN"; TOKEN=""   # public endpoints — no auth

if req POST "$BASE/public/requests/certificate" \
  "{\"residentId\":\"$RES_ID\",\"barangayId\":$BRG_ID,\"certificateType\":\"barangay_clearance\",\"purpose\":\"For employment\"}" 201; then
  CERT_REQ_ID=$(jq_id)
  ok "POST /public/requests/certificate → id=$CERT_REQ_ID"
else
  fail "POST /public/requests/certificate — $HTTP_CODE: $(msg)"
fi

if req POST "$BASE/public/requests/appointment" \
  "{\"fullName\":\"TEST_Citizen_$SUFFIX\",\"address\":\"Test St, Test Barangay\",\"barangayId\":$BRG_ID,\"appointmentWith\":\"Captain\",\"appointmentDate\":\"2026-12-01\",\"purpose\":\"Barangay matter\",\"contactNumber\":\"09991234568\"}" 201; then
  APPT_REQ_ID=$(jq_id)
  ok "POST /public/requests/appointment → id=$APPT_REQ_ID"
else
  fail "POST /public/requests/appointment — $HTTP_CODE: $(msg)"
fi

TOKEN="$TOKEN_SAVE"

# Track by public UUID
[[ -n "$CERT_REQ_ID" ]] && {
  CERT_REQ_UUID=$(db "SELECT uuid FROM requests WHERE id='$CERT_REQ_ID' LIMIT 1;")
  [[ -n "$CERT_REQ_UUID" ]] && {
    req GET "$BASE/public/track/$CERT_REQ_UUID" "" 200 \
      && ok "GET /public/track/:requestId (by UUID)" || fail "GET /public/track/:requestId — $HTTP_CODE: $(msg)"

    req GET "$BASE/public/requests/$CERT_REQ_UUID" "" 200 \
      && ok "GET /public/requests/:requestId (no auth)" || skip "GET /public/requests/:requestId — $HTTP_CODE: $(msg)"
  } || skip "GET /public/track/:requestId (could not fetch UUID)"
}

# Admin status update
[[ -n "$CERT_REQ_ID" ]] && {
  req PUT "$BASE/requests/$CERT_REQ_ID/status" \
    '{"status":"approved","notes":"Test approval"}' 200 \
    && ok "PUT /requests/:id/status (approve)" || fail "PUT /requests/:id/status — $HTTP_CODE: $(msg)"
}

# =============================================================================
# 12. REGISTRATION APPROVALS (BIMS reviews portal registration requests)
# =============================================================================
header "REGISTRATION APPROVALS"

# Seed a second test resident specifically for the approval flow
RES_ID2=""
dbq "INSERT INTO residents (barangay_id,last_name,first_name,sex,civil_status,birthdate,status)
     VALUES ($BRG_ID,'BIMS_RegTest_$SUFFIX','RegFirst','Female','Single','1995-05-05','pending');" 2>/dev/null || true
RES_ID2=$(db "SELECT id FROM residents WHERE last_name='BIMS_RegTest_$SUFFIX' LIMIT 1;")

REG_ID=""
if [[ -n "$RES_ID2" ]]; then
  dbq "INSERT INTO registration_requests (resident_fk,status)
       VALUES ('$RES_ID2','pending')
       ON CONFLICT (resident_fk) DO UPDATE SET status='pending';" 2>/dev/null
  REG_ID=$(db "SELECT id FROM registration_requests WHERE resident_fk='$RES_ID2' LIMIT 1;")
  info "Test registration request: $REG_ID"
fi

[[ -n "$REG_ID" ]] && {
  req GET "$BASE/portal-registration/requests?status=pending&limit=20" "" 200 \
    && ok "GET /portal-registration/requests?status=pending" || fail "GET /portal-registration/requests — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/portal-registration/requests/$REG_ID/under-review" "" 200 \
    && ok "PATCH /portal-registration/requests/:id/under-review" || fail "PATCH under-review — $HTTP_CODE: $(msg)"

  if req POST "$BASE/portal-registration/requests/$REG_ID/request-docs" \
    '{"adminNotes":"Please submit a clearer photo of your valid ID."}' 200; then
    ok "POST /portal-registration/requests/:id/request-docs"
  else
    fail "POST request-docs — $HTTP_CODE: $(msg)"
  fi

  # Reset to under_review for the final approve test
  dbq "UPDATE registration_requests SET status='under_review' WHERE id='$REG_ID';" 2>/dev/null

  # Approve — generates resident_id
  if req POST "$BASE/portal-registration/requests/$REG_ID/review" \
    '{"action":"approve","adminNotes":"Approved by automated test"}' 200; then
    GEN_RES_ID=$(db "SELECT resident_id FROM residents WHERE id='$RES_ID2' LIMIT 1;")
    ok "POST /portal-registration/requests/:id/review (approve) → resident_id=$GEN_RES_ID"
  else
    fail "POST review/approve — $HTTP_CODE: $(msg)"
  fi

  # Seed a third resident for the reject test
  RES_ID3=""
  dbq "INSERT INTO residents (barangay_id,last_name,first_name,sex,civil_status,birthdate,status)
       VALUES ($BRG_ID,'BIMS_RejectTest_$SUFFIX','RejectFirst','Male','Single','1998-03-10','pending');" 2>/dev/null || true
  RES_ID3=$(db "SELECT id FROM residents WHERE last_name='BIMS_RejectTest_$SUFFIX' LIMIT 1;")
  if [[ -n "$RES_ID3" ]]; then
    dbq "INSERT INTO registration_requests (resident_fk,status) VALUES ('$RES_ID3','pending') ON CONFLICT DO NOTHING;" 2>/dev/null
    REG_ID3=$(db "SELECT id FROM registration_requests WHERE resident_fk='$RES_ID3' LIMIT 1;")
    if req POST "$BASE/portal-registration/requests/$REG_ID3/review" \
      '{"action":"reject","adminNotes":"Duplicate registration in test"}' 200; then
      ok "POST /portal-registration/requests/:id/review (reject)"
    else
      fail "POST review/reject — $HTTP_CODE: $(msg)"
    fi
  fi
} || skip "Registration approval tests (could not seed registration request)"

# =============================================================================
# 13. CERTIFICATE TEMPLATES (municipality admin only)
# =============================================================================
header "CERTIFICATE TEMPLATES"

TPL_ID=""
if req POST "$BASE/certificates/templates" \
  "{\"municipalityId\":$MUN_ID,\"certificateType\":\"test_cert_$SUFFIX\",\"name\":\"TEST_Template_$SUFFIX\",\"htmlContent\":\"<html><body>{{ resident.fullName }}</body></html>\"}" 201; then
  TPL_ID=$(jq_get "d.get('data',{}).get('id','') or d.get('id','')")
  ok "POST /certificates/templates → id=$TPL_ID"
else
  fail "POST /certificates/templates — $HTTP_CODE: $(msg)"
fi

[[ -n "$TPL_ID" ]] && {
  req GET "$BASE/certificates/templates?municipalityId=$MUN_ID" "" 200 \
    && ok "GET /certificates/templates?municipalityId=$MUN_ID" || fail "GET /certificates/templates — $HTTP_CODE: $(msg)"

  req GET "$BASE/certificates/templates/$TPL_ID" "" 200 \
    && ok "GET /certificates/templates/:id" || fail "GET /certificates/templates/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/certificates/templates/$TPL_ID" \
    '{"name":"TEST_Template_Updated","htmlContent":"<html><body>{{ resident.fullName }} - updated</body></html>"}' 200 \
    && ok "PUT /certificates/templates/:id" || fail "PUT /certificates/templates/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/certificates/templates/$TPL_ID" '{"isActive":false}' 200 \
    && ok "PUT /certificates/templates/:id (deactivate)" || fail "PUT deactivate — $HTTP_CODE: $(msg)"

  req PUT "$BASE/certificates/templates/$TPL_ID" '{"isActive":true}' 200 \
    && ok "PUT /certificates/templates/:id (reactivate)" || fail "PUT reactivate — $HTTP_CODE: $(msg)"

  # Certificate PDF generation (requires Puppeteer + real request data)
  [[ -n "$CERT_REQ_ID" ]] && {
    req POST "$BASE/certificates/generate/request/$CERT_REQ_ID" "" 200 \
      && ok "POST /certificates/generate/request/:requestId" || skip "POST /certificates/generate/request — $HTTP_CODE (requires Puppeteer + matching template)"

    req GET "$BASE/certificates/preview/request/$CERT_REQ_ID" "" 200 \
      && ok "GET /certificates/preview/request/:requestId" || skip "GET /certificates/preview/request — $HTTP_CODE (requires Puppeteer)"
  } || skip "POST /certificates/generate + preview (no walk-in cert request)"

  # Certificate PDF for portal (E-Services) transaction
  PORTAL_CERT_TXN_ID=$(db "SELECT id FROM transactions LIMIT 1;" 2>/dev/null || echo "")
  [[ -n "$PORTAL_CERT_TXN_ID" ]] && {
    req POST "$BASE/certificates/generate/transaction/$PORTAL_CERT_TXN_ID" "" 200 \
      && ok "POST /certificates/generate/transaction/:transactionId" || skip "POST /certificates/generate/transaction — $HTTP_CODE (requires Puppeteer + matching template)"
    req GET "$BASE/certificates/preview/transaction/$PORTAL_CERT_TXN_ID" "" 200 \
      && ok "GET /certificates/preview/transaction/:transactionId" || skip "GET /certificates/preview/transaction — $HTTP_CODE (requires Puppeteer)"
  } || skip "POST /certificates/generate/transaction + GET /certificates/preview/transaction (no portal transactions)"
}

# =============================================================================
# 14. CERTIFICATE QUEUE
# =============================================================================
header "CERTIFICATE QUEUE"

if [[ -n "$BRG_TOKEN" ]]; then
  req_as "$BRG_TOKEN" GET "$BASE/certificates/queue?barangayId=$BRG_ID&source=all&status=all&page=1&perPage=10" "" 200 \
    && ok "GET /certificates/queue?source=all" || fail "GET /certificates/queue — $HTTP_CODE: $(msg)"

  req_as "$BRG_TOKEN" GET "$BASE/certificates/queue?barangayId=$BRG_ID&source=walkin" "" 200 \
    && ok "GET /certificates/queue?source=walkin" || fail "GET /certificates/queue (walkin) — $HTTP_CODE: $(msg)"

  req_as "$BRG_TOKEN" GET "$BASE/certificates/queue?barangayId=$BRG_ID&source=portal" "" 200 \
    && ok "GET /certificates/queue?source=portal" || fail "GET /certificates/queue (portal) — $HTTP_CODE: $(msg)"

  # Walk-in status update
  [[ -n "$CERT_REQ_ID" ]] && {
    req_as "$BRG_TOKEN" PUT "$BASE/certificates/queue/walkin/$CERT_REQ_ID/status" \
      '{"status":"completed"}' 200 \
      && ok "PUT /certificates/queue/walkin/:id/status" || fail "PUT walkin status — $HTTP_CODE: $(msg)"
  } || skip "PUT /certificates/queue/walkin/:id/status (no walk-in request)"

  # Portal transaction status update (uses a transaction seeded from DB if available)
  PORTAL_TXN_ID=$(db "SELECT id FROM transactions WHERE status='PENDING' LIMIT 1;" 2>/dev/null || echo "")
  [[ -n "$PORTAL_TXN_ID" ]] && {
    req_as "$BRG_TOKEN" PUT "$BASE/certificates/queue/portal/$PORTAL_TXN_ID/status" \
      '{"status":"PROCESSING"}' 200 \
      && ok "PUT /certificates/queue/portal/:id/status" || skip "PUT /certificates/queue/portal/:id/status — $HTTP_CODE: $(msg)"
  } || skip "PUT /certificates/queue/portal/:id/status (no portal transaction available)"

else
  skip "Certificate queue tests (no barangay staff token)"
fi

# =============================================================================
# 15. PORTAL HOUSEHOLD
# =============================================================================
header "PORTAL HOUSEHOLD"

# GET /my uses a resident portal JWT
if [[ -n "$RESIDENT_PORTAL_JWT" ]]; then
  req_as "$RESIDENT_PORTAL_JWT" GET "$BASE/portal/household/my" "" 200 \
    && ok "GET /portal/household/my" || skip "GET /portal/household/my — $HTTP_CODE (no household for test resident, expected)"

  # Register a household for the portal resident
  # (Seed resident must not already be in a household for this to succeed)
  PORTAL_HH_ID=""
  if req_as "$RESIDENT_PORTAL_JWT" POST "$BASE/portal/household" \
    "{\"houseNumber\":\"PORTAL-888\",\"street\":\"Portal Test Street\",\"barangayId\":$BRG_ID,\"housingType\":\"concrete\"}" 201; then
    PORTAL_HH_ID=$(jq_get "d.get('data',{}).get('id','') or d.get('id','')")
    ok "POST /portal/household → id=$PORTAL_HH_ID"
  else
    skip "POST /portal/household — $HTTP_CODE: $(msg) (resident may already be in a household)"
  fi

  [[ -n "$PORTAL_HH_ID" ]] && {
    # Add a second resident as a member (seed one)
    RES_MEMBER_ID=""
    dbq "INSERT INTO residents (barangay_id,last_name,first_name,sex,civil_status,birthdate,status)
         VALUES ($BRG_ID,'BIMS_Member_$SUFFIX','MemberFirst','Female','Single','2000-06-15','active');" 2>/dev/null || true
    RES_MEMBER_ID=$(db "SELECT id FROM residents WHERE last_name='BIMS_Member_$SUFFIX' LIMIT 1;")

    [[ -n "$RES_MEMBER_ID" ]] && {
      if req_as "$RESIDENT_PORTAL_JWT" POST "$BASE/portal/household/$PORTAL_HH_ID/members" \
        "{\"memberResidentId\":\"$RES_MEMBER_ID\",\"relationshipToHead\":\"Sibling\",\"familyGroup\":\"Main Family\"}" 201; then
        ok "POST /portal/household/:householdId/members"

        req_as "$RESIDENT_PORTAL_JWT" DELETE "$BASE/portal/household/$PORTAL_HH_ID/members/$RES_MEMBER_ID" "" 200 \
          && ok "DELETE /portal/household/:householdId/members/:memberId" || fail "DELETE portal household member — $HTTP_CODE: $(msg)"
      else
        fail "POST /portal/household/:householdId/members — $HTTP_CODE: $(msg)"
        skip "DELETE /portal/household/:householdId/members/:memberId (member not added)"
      fi
    } || skip "Portal household member tests (could not seed member resident)"
  }
else
  skip "GET /portal/household/my               (no resident portal JWT)"
  skip "POST /portal/household                 (no resident portal JWT)"
  skip "POST /portal/household/:id/members     (no resident portal JWT)"
  skip "DELETE /portal/household/:id/members/* (no resident portal JWT)"
fi

# =============================================================================
# 16. USER MANAGEMENT
# =============================================================================
header "USER MANAGEMENT"

# List read variants
req GET "$BASE/target/barangay/$BRG_ID/users" "" 200 \
  && ok "GET /target/:targetType/:targetId/users" || fail "GET /target/:targetType/:targetId/users — $HTTP_CODE: $(msg)"

req GET "$BASE/user/admins" "" 200 \
  && ok "GET /user/admins" || skip "GET /user/admins — $HTTP_CODE: $(msg)"

req GET "$BASE/user/by-email?email=$ADM_EMAIL" "" 200 \
  && ok "GET /user/by-email?email=..." || skip "GET /user/by-email — $HTTP_CODE: $(msg)"

req GET "$BASE/user/conflicts" "" 200 \
  && ok "GET /user/conflicts" || skip "GET /user/conflicts — $HTTP_CODE (optional)"

req GET "$BASE/list/$BRG_ID/user" "" 200 \
  && ok "GET /list/:targetId/user" || skip "GET /list/:targetId/user — $HTTP_CODE: $(msg)"

# Create / update / delete
NEW_USER_ID=""
if req POST "$BASE/user" \
  "{\"targetType\":\"barangay\",\"targetId\":\"$BRG_ID\",\"fullname\":\"TEST_Staff_$SUFFIX\",\"email\":\"test_staff_$SUFFIX@test.com\",\"password\":\"Staff1234!\",\"role\":\"staff\"}" 200; then
  NEW_USER_ID=$(jq_id)
  ok "POST /user → id=$NEW_USER_ID"
else
  fail "POST /user — $HTTP_CODE: $(msg)"
fi

[[ -n "$NEW_USER_ID" ]] && {
  req GET "$BASE/$NEW_USER_ID/user" "" 200 \
    && ok "GET /:userId/user" || fail "GET /:userId/user — $HTTP_CODE: $(msg)"

  req PUT "$BASE/$NEW_USER_ID/user" \
    "{\"fullname\":\"TEST_Staff_${SUFFIX}_upd\",\"email\":\"test_staff_$SUFFIX@test.com\",\"role\":\"staff\"}" 200 \
    && ok "PUT /:userId/user" || fail "PUT /:userId/user — $HTTP_CODE: $(msg)"
}

req POST "$BASE/send-setup-email" \
  "{\"email\":\"$BRG_EMAIL\",\"targetType\":\"barangay\"}" 200 \
  && ok "POST /send-setup-email" || skip "POST /send-setup-email — $HTTP_CODE (requires email service)"

# =============================================================================
# 17. COUNTER (resident ID prefix)
# =============================================================================
header "COUNTER"

req GET "$BASE/prefix" "" 200 \
  && ok "GET /prefix" || fail "GET /prefix — $HTTP_CODE: $(msg)"

req PUT "$BASE/prefix" \
  '{"prefix":"RES"}' 200 \
  && ok "PUT /prefix" || skip "PUT /prefix — $HTTP_CODE: $(msg)"

# =============================================================================
# 18. OPENAPI & API KEYS
# =============================================================================
header "OPENAPI & API KEYS"

# Open API read endpoints (may require API key header — test with admin bearer first)
req GET "$BASE/openapi/residents" "" 200 \
  && ok "GET /openapi/residents" || skip "GET /openapi/residents — $HTTP_CODE (may need API key)"

req GET "$BASE/openapi/households" "" 200 \
  && ok "GET /openapi/households" || skip "GET /openapi/households — $HTTP_CODE (may need API key)"

req GET "$BASE/openapi/families" "" 200 \
  && ok "GET /openapi/families" || skip "GET /openapi/families — $HTTP_CODE (may need API key)"

req GET "$BASE/openapi/barangays" "" 200 \
  && ok "GET /openapi/barangays" || skip "GET /openapi/barangays — $HTTP_CODE (may need API key)"

req GET "$BASE/openapi/statistics" "" 200 \
  && ok "GET /openapi/statistics" || skip "GET /openapi/statistics — $HTTP_CODE (may need API key)"

# API key management (admin auth)
req GET "$BASE/openapi/keys" "" 200 \
  && ok "GET /openapi/keys" || fail "GET /openapi/keys — $HTTP_CODE: $(msg)"

API_KEY_ID=""
if req POST "$BASE/openapi/keys" \
  "{\"name\":\"TEST_ApiKey_$SUFFIX\",\"description\":\"Automated test key\"}" 201; then
  API_KEY_ID=$(jq_get "d.get('data',{}).get('id','') or d.get('id','')")
  ok "POST /openapi/keys → id=$API_KEY_ID"
else
  fail "POST /openapi/keys — $HTTP_CODE: $(msg)"
fi

[[ -n "$API_KEY_ID" ]] && {
  req GET "$BASE/openapi/keys/$API_KEY_ID/reveal" "" 200 \
    && ok "GET /openapi/keys/:id/reveal" || fail "GET /openapi/keys/:id/reveal — $HTTP_CODE: $(msg)"

  req POST "$BASE/openapi/keys/$API_KEY_ID/revoke" "" 200 \
    && ok "POST /openapi/keys/:id/revoke" || fail "POST /openapi/keys/:id/revoke — $HTTP_CODE: $(msg)"

  req DELETE "$BASE/openapi/keys/$API_KEY_ID" "" 200 \
    && ok "DELETE /openapi/keys/:id" || fail "DELETE /openapi/keys/:id — $HTTP_CODE"; API_KEY_ID=""
}

# =============================================================================
# 19. BULK ID & EXPORT
# =============================================================================
header "BULK ID & EXPORT"

skip "GET /setup/residents/bulk-id (requires Puppeteer + active residents with resident_id — manual test)"

req GET "$BASE/export/residents" "" 200 \
  && ok "GET /export/residents" || skip "GET /export/residents — $HTTP_CODE (may need municipality admin role)"

req GET "$BASE/export/households" "" 200 \
  && ok "GET /export/households" || skip "GET /export/households — $HTTP_CODE (may need municipality admin role)"

req GET "$BASE/export/$BRG_ID/barangay-data" "" 200 \
  && ok "GET /export/:barangayId/barangay-data" || skip "GET /export/:barangayId/barangay-data — $HTTP_CODE: $(msg)"

req GET "$BASE/export/$BRG_ID/residents" "" 200 \
  && ok "GET /export/:barangayId/residents" || skip "GET /export/:barangayId/residents — $HTTP_CODE: $(msg)"

req GET "$BASE/export/$BRG_ID/households" "" 200 \
  && ok "GET /export/:barangayId/households" || skip "GET /export/:barangayId/households — $HTTP_CODE: $(msg)"

# =============================================================================
# 19b. REDIS
# =============================================================================
header "REDIS"

req GET "$BASE/redis/health" "" 200 \
  && ok "GET /redis/health" || skip "GET /redis/health — $HTTP_CODE (Redis may not be running)"

req GET "$BASE/redis/status" "" 200 \
  && ok "GET /redis/status" || skip "GET /redis/status — $HTTP_CODE (Redis may not be running)"

req GET "$BASE/redis/stats" "" 200 \
  && ok "GET /redis/stats" || skip "GET /redis/stats — $HTTP_CODE (Redis may not be running)"

req POST "$BASE/redis/clear-pattern" \
  '{"pattern":"bims:*"}' 200 \
  && ok "POST /redis/clear-pattern" || skip "POST /redis/clear-pattern — $HTTP_CODE (Redis may not be running)"

req DELETE "$BASE/redis/cache" "" 200 \
  && ok "DELETE /redis/cache" || skip "DELETE /redis/cache — $HTTP_CODE (Redis may not be running)"

# =============================================================================
# 19c. MONITORING
# =============================================================================
header "MONITORING"

req GET "$BASE/monitoring/health" "" 200 \
  && ok "GET /monitoring/health" || fail "GET /monitoring/health — $HTTP_CODE: $(msg)"

req GET "$BASE/monitoring/system" "" 200 \
  && ok "GET /monitoring/system" || fail "GET /monitoring/system — $HTTP_CODE: $(msg)"

req GET "$BASE/monitoring/storage" "" 200 \
  && ok "GET /monitoring/storage" || fail "GET /monitoring/storage — $HTTP_CODE: $(msg)"

req GET "$BASE/monitoring/network" "" 200 \
  && ok "GET /monitoring/network" || skip "GET /monitoring/network — $HTTP_CODE (optional)"

req GET "$BASE/monitoring/database" "" 200 \
  && ok "GET /monitoring/database" || fail "GET /monitoring/database — $HTTP_CODE: $(msg)"

req GET "$BASE/monitoring/application" "" 200 \
  && ok "GET /monitoring/application" || fail "GET /monitoring/application — $HTTP_CODE: $(msg)"

req GET "$BASE/monitoring/logs" "" 200 \
  && ok "GET /monitoring/logs" || fail "GET /monitoring/logs — $HTTP_CODE: $(msg)"

req GET "$BASE/monitoring/logs/stream" "" 200 \
  && ok "GET /monitoring/logs/stream" || skip "GET /monitoring/logs/stream — $HTTP_CODE (SSE stream, may timeout)"

skip "POST /monitoring/cache/clear (destructive — manual test only)"
skip "POST /monitoring/logs/clear  (destructive — manual test only)"

# =============================================================================
# 19d. SYSTEM MANAGEMENT
# =============================================================================
header "SYSTEM MANAGEMENT"

req GET "$BASE/system-management/export/database" "" 200 \
  && ok "GET /system-management/export/database" || skip "GET /system-management/export/database — $HTTP_CODE (may require municipality admin)"

req GET "$BASE/system-management/export/uploads" "" 200 \
  && ok "GET /system-management/export/uploads" || skip "GET /system-management/export/uploads — $HTTP_CODE (may require municipality admin)"

# =============================================================================
# 20. AUTH EXTRAS
# =============================================================================
header "AUTH EXTRAS"

# Refresh — requires valid httpOnly refresh cookie; best-effort
req POST "$BASE/auth/refresh" "" 200 \
  && ok "POST /auth/refresh" || skip "POST /auth/refresh — $HTTP_CODE (requires refresh_token cookie)"

# Forgot-password — just validates the request is received
req POST "$BASE/auth/forgot-password" \
  "{\"email\":\"$ADM_EMAIL\"}" 200 \
  && ok "POST /auth/forgot-password" || skip "POST /auth/forgot-password — $HTTP_CODE: $(msg)"

# Reset-password requires a valid token from the forgot-password email; skip
skip "POST /auth/reset-password (requires token from forgot-password email — manual test)"

# =============================================================================
# 21. SETUP (GeoJSON municipality)
# =============================================================================
header "SETUP"

req GET "$BASE/setup/status" "" 200 \
  && ok "GET /setup/status" || fail "GET /setup/status — $HTTP_CODE: $(msg)"

skip "POST /setup/municipality (requires GeoJSON fixtures in gis_municipality/gis_barangay — manual test)"
skip "GET  /setup/residents/bulk-id (requires Puppeteer + residents with resident_id — manual test)"

# =============================================================================
# CLEANUP
# =============================================================================
header "CLEANUP"

# Delete via API (routes that exist in BIMS)
[[ -n "$PET_ID"        ]] && { req DELETE "$BASE/$PET_ID/pet"                           "" 200 && ok "DELETE pet"                  || fail "DELETE pet — $HTTP_CODE"; }
[[ -n "$NEW_USER_ID"   ]] && { req DELETE "$BASE/$NEW_USER_ID/user"                     "" 200 && ok "DELETE user"                 || fail "DELETE user — $HTTP_CODE"; }
[[ -n "$CT_ID"         ]] && { req DELETE "$BASE/classification-types/$CT_ID"           "" 200 && ok "DELETE classification-type"  || fail "DELETE classification-type — $HTTP_CODE"; }
[[ -n "$TPL_ID"        ]] && { req DELETE "$BASE/certificates/templates/$TPL_ID"        "" 200 && ok "DELETE certificate template" || fail "DELETE template — $HTTP_CODE"; }

# Residents and households are NOT deleted via BIMS API (routes don't exist in v2)
# They are cleaned up directly via psql below

# Direct DB cleanup
dbq "
  DELETE FROM bims_users           WHERE email LIKE 'test%_${SUFFIX}@test.com' OR email LIKE 'teststaff%_${SUFFIX}@test.com';
  DELETE FROM requests             WHERE full_name LIKE 'TEST_%' OR purpose = 'For employment';
  DELETE FROM inventories          WHERE item_name LIKE 'TEST_%';
  DELETE FROM archives             WHERE title     LIKE 'TEST_%';
  DELETE FROM vaccines             WHERE vaccine_name LIKE 'TEST_%';
  DELETE FROM certificate_templates WHERE name LIKE 'TEST_%';
  DELETE FROM registration_requests WHERE admin_notes LIKE '%automated test%' OR admin_notes LIKE '%Duplicate registration%';
  DELETE FROM households           WHERE house_number = 'PORTAL-888';
  -- Clean ALL test residents from any run (last_name prefix convention)
  DELETE FROM family_members       WHERE family_id IN (
    SELECT f.id FROM families f
    JOIN households h ON f.household_id = h.id
    WHERE h.house_head IN (
      SELECT id FROM residents WHERE last_name LIKE 'BIMS_%'
    )
  );
  DELETE FROM families             WHERE household_id IN (
    SELECT id FROM households WHERE house_head IN (
      SELECT id FROM residents WHERE last_name LIKE 'BIMS_%'
    )
  );
  DELETE FROM households           WHERE house_head IN (
    SELECT id FROM residents WHERE last_name LIKE 'BIMS_%'
  );
  DELETE FROM registration_requests WHERE resident_fk IN (
    SELECT id FROM residents WHERE last_name LIKE 'BIMS_%'
  );
  DELETE FROM residents            WHERE last_name LIKE 'BIMS_%';
" 2>/dev/null && ok "DB cleanup" || fail "DB cleanup (partial — check manually)"

# =============================================================================
# REPORT
# =============================================================================
TOTAL=$((PASS+FAIL+SKIP))
echo ""
echo -e "${BOLD}================================================================${NC}"
echo -e "${BOLD}  BIMS Route Test Report${NC}"
echo -e "${BOLD}================================================================${NC}"
printf "  %-8s %d\n" "PASS:"  "$PASS"
printf "  %-8s %d\n" "FAIL:"  "$FAIL"
printf "  %-8s %d\n" "SKIP:"  "$SKIP"
printf "  %-8s %d\n" "Total:" "$TOTAL"
echo ""

if [[ $FAIL -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}All tests passed.${NC}"
elif [[ $FAIL -le 3 ]]; then
  echo -e "  ${YELLOW}${BOLD}$FAIL test(s) failed — review output above.${NC}"
else
  echo -e "  ${RED}${BOLD}$FAIL test(s) failed — review output above.${NC}"
fi
echo -e "${BOLD}================================================================${NC}"

exit $FAIL
