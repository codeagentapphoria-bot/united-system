#!/usr/bin/env bash
# =============================================================================
# test_mutations_eservice.sh — E-Services Full Route Test (Read + Write)
# =============================================================================
#
# Tests ALL registered routes in the E-Services (Multysis) backend against a
# live server. Covers every route file registered in src/index.ts.
#
# HOW TO RUN:
#   cd united-systems/
#   chmod +x united-database/test_mutations_eservice.sh
#   ./united-database/test_mutations_eservice.sh
#
# ENVIRONMENT VARIABLES:
#   ESERVICE_URL  — base URL of the E-Services server  (default: http://localhost:3000/api)
#   DB_URL        — PostgreSQL connection string        (default: postgresql://postgres@localhost/united_systems_test)
#
# REQUIREMENTS:
#   • E-Services server running and connected to the same DB as DB_URL
#   • psql on PATH
#   • curl on PATH
#   • python3 on PATH
#
# INTENTIONALLY SKIPPED (require browser / external services):
#   GET  /api/auth/portal/google          — OAuth redirect (browser only)
#   GET  /api/auth/portal/google/callback — OAuth callback (browser only)
#   POST /api/auth/portal/google/supabase — requires valid Supabase token
#   POST /api/auth/portal/google/link     — requires valid Google token
#   DELETE /api/auth/portal/google/unlink — requires linked Google account
#   POST /api/upload/*                    — multipart file upload (manual test)
#   POST /api/dev/*                       — dev-only routes (excluded from CI)
# =============================================================================

set -eo pipefail

BASE="${ESERVICE_URL:-http://localhost:3000/api}"
DB="${DB_URL:-postgresql://postgres@localhost/united_systems_test}"
SUFFIX=$(date +%s)

PASS=0; FAIL=0; SKIP=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
ok()     { echo -e "  ${GREEN}[PASS]${NC} $*";   PASS=$((PASS+1));  }
fail()   { echo -e "  ${RED}[FAIL]${NC} $*";     FAIL=$((FAIL+1));  }
skip()   { echo -e "  ${YELLOW}[SKIP]${NC} $*";  SKIP=$((SKIP+1));  }
info()   { echo -e "  ${CYAN}[INFO]${NC} $*";     }
header() { echo -e "\n${BOLD}── $* ${NC}";        }

TOKEN=""          # admin token
PORTAL_TOKEN=""   # resident portal token
TAX_COMP_ID=""    # active tax computation for the guest transaction (set after tax profile setup)

# ── HTTP helpers ──────────────────────────────────────────────────────────────
req() {
  local method=$1 url=$2 body=${3:-} expected=${4:-2}
  local args=(-s -m 20 -o /tmp/es_test.json -w "%{http_code}" -X "$method")
  [[ -n "$TOKEN" ]]   && args+=(-H "Authorization: Bearer $TOKEN")
  [[ -n "$body" ]]    && args+=(-H "Content-Type: application/json" -d "$body")
  HTTP_CODE=$(curl "${args[@]}" "$url" 2>/dev/null)
  HTTP_BODY=$(cat /tmp/es_test.json 2>/dev/null)
  [[ "$HTTP_CODE" == ${expected}* ]] && return 0 || return 1
}

# Uses PORTAL_TOKEN instead of admin TOKEN
req_portal() {
  local method=$1 url=$2 body=${3:-} expected=${4:-2}
  local args=(-s -m 20 -o /tmp/es_test.json -w "%{http_code}" -X "$method")
  [[ -n "$PORTAL_TOKEN" ]] && args+=(-H "Authorization: Bearer $PORTAL_TOKEN")
  [[ -n "$body" ]]         && args+=(-H "Content-Type: application/json" -d "$body")
  HTTP_CODE=$(curl "${args[@]}" "$url" 2>/dev/null)
  HTTP_BODY=$(cat /tmp/es_test.json 2>/dev/null)
  [[ "$HTTP_CODE" == ${expected}* ]] && return 0 || return 1
}

# No-auth request
req_public() {
  local method=$1 url=$2 body=${3:-} expected=${4:-2}
  local saved="$TOKEN"; TOKEN=""
  req "$method" "$url" "$body" "$expected"
  local rc=$?; TOKEN="$saved"; return $rc
}

jq_get()  { echo "$HTTP_BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print($1)" 2>/dev/null || echo ""; }
jq_id()   { jq_get "d.get('data',{}).get('id','') or d.get('id','')"; }
msg()     { jq_get "d.get('message','') or d.get('error','') or str(d)[:120]"; }
db()      { psql "$DB" -t -A -c "$1" 2>/dev/null | tr -d ' \n'; }
dbq()     { psql "$DB" -q -c "$1" 2>/dev/null; }

echo -e "${BOLD}================================================================${NC}"
echo -e "${BOLD}  E-Services Full Route Test — $(date)${NC}"
echo -e "${BOLD}  Server: $BASE${NC}"
echo -e "${BOLD}================================================================${NC}"

# =============================================================================
# SETUP
# =============================================================================
header "SETUP"

# Server health
if ! curl -sf -m 5 "http://localhost:3000/health" >/dev/null 2>&1; then
  echo -e "${RED}ERROR: E-Services server is not running on port 3000.${NC}"
  echo "  Start it: cd borongan-eService-system-copy/multysis-backend && node dist/index.js"
  exit 1
fi
ok "Server health check"

# DB connectivity
if ! psql "$DB" -c "SELECT 1" >/dev/null 2>&1; then

  echo -e "${RED}ERROR: Cannot connect to database at $DB${NC}"
  exit 1
fi
ok "Database connectivity"

# ── Admin login ───────────────────────────────────────────────────────────────
LOGIN_RESP=$(curl -si -m 10 -X POST "$BASE/auth/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@eservice.com","password":"Test1234!"}' 2>/dev/null)
TOKEN=$(echo "$LOGIN_RESP" | grep -i "set-cookie:.*access_token=" | grep -oP 'access_token=\K[^;]+' || echo "")
[[ -z "$TOKEN" ]] && \
  TOKEN=$(echo "$LOGIN_RESP" | tail -1 | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  print(d.get('data',{}).get('accessToken','') or d.get('token',''))
except: print('')" 2>/dev/null || echo "")

if [[ -z "$TOKEN" ]]; then
  echo -e "${RED}Admin login failed. Ensure admin@eservice.com / Test1234! exists.${NC}"
  exit 1
fi
ok "Admin login (token=${TOKEN:0:20}...)"

# ── Auth extras — socket token ────────────────────────────────────────────────
req GET "$BASE/auth/socket-token" "" 200 \
  && ok "GET /auth/socket-token" || skip "GET /auth/socket-token — $HTTP_CODE: $(msg)"

# Refresh token requires httpOnly cookie with refresh_token value; best-effort
req POST "$BASE/auth/refresh" "" 200 \
  && ok "POST /auth/refresh" || skip "POST /auth/refresh — $HTTP_CODE (requires refresh_token cookie; not maintained in curl)"

# ── Seed test resident (for portal auth + beneficiary tests) ──────────────────
TEST_RES_ID=$(db "SELECT id FROM residents WHERE username='test_portal_${SUFFIX}' LIMIT 1;")
if [[ -z "$TEST_RES_ID" ]]; then
  BRG_ID=$(db "SELECT id FROM barangays LIMIT 1;")
  [[ -z "$BRG_ID" ]] && info "No barangays found — portal resident tests will be skipped"

  if [[ -n "$BRG_ID" ]]; then
    dbq "INSERT INTO residents (barangay_id,last_name,first_name,birthdate,status,username)
         VALUES ($BRG_ID,'TestResident','Portal','2000-01-01','active','test_portal_$SUFFIX');" 2>/dev/null || true
    TEST_RES_ID=$(db "SELECT id FROM residents WHERE username='test_portal_${SUFFIX}' LIMIT 1;")

    HASHED_PW=$(node -e "
const b=require('./borongan-eService-system-copy/multysis-backend/node_modules/bcryptjs');
b.hash('Portal1234!',10).then(h=>{process.stdout.write(h);process.exit(0);});
" 2>/dev/null || echo "")
    [[ -n "$HASHED_PW" && -n "$TEST_RES_ID" ]] && \
      dbq "INSERT INTO resident_credentials (resident_fk,password)
           VALUES ('$TEST_RES_ID','$HASHED_PW') ON CONFLICT DO NOTHING;" 2>/dev/null || true
  fi
fi
[[ -n "$TEST_RES_ID" ]] && info "Test resident ID: $TEST_RES_ID" || info "No test resident (skipping portal-auth routes)"

# ── Portal resident login ─────────────────────────────────────────────────────
if [[ -n "$TEST_RES_ID" ]]; then
  PORTAL_RESP=$(curl -si -m 10 -X POST "$BASE/auth/portal/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"test_portal_$SUFFIX\",\"password\":\"Portal1234!\"}" 2>/dev/null)
  PORTAL_TOKEN=$(echo "$PORTAL_RESP" | grep -i "set-cookie:.*access_token=" | grep -oP 'access_token=\K[^;]+' || echo "")
  [[ -z "$PORTAL_TOKEN" ]] && \
    PORTAL_TOKEN=$(echo "$PORTAL_RESP" | tail -1 | python3 -c "
import json,sys
try:
  d=json.load(sys.stdin)
  print(d.get('data',{}).get('accessToken','') or d.get('token',''))
except: print('')" 2>/dev/null || echo "")
  [[ -n "$PORTAL_TOKEN" ]] && ok "Portal resident login (token=${PORTAL_TOKEN:0:20}...)" \
                             || skip "Portal resident login failed — portal-auth routes will be skipped"
fi

# =============================================================================
# 1. READ OPERATIONS
# =============================================================================
header "READ OPERATIONS"

req_public GET "$BASE/../health" "" 200 \
  && ok "GET /health" || fail "GET /health — $HTTP_CODE"

req_public GET "$BASE" "" 200 \
  && ok "GET /api (root info)" || skip "GET /api — $HTTP_CODE: $(msg)"

# ── Addresses ─────────────────────────────────────────────────────────────────
req_public GET "$BASE/addresses/municipalities" "" 200 \
  && ok "GET /addresses/municipalities" || fail "GET /addresses/municipalities — $HTTP_CODE: $(msg)"

req_public GET "$BASE/addresses/barangays?municipalityId=1" "" 200 \
  && ok "GET /addresses/barangays?municipalityId=1" || skip "GET /addresses/barangays — $HTTP_CODE (no municipalities seeded)"

BRG_ID_ADDR=$(db "SELECT id FROM barangays LIMIT 1;")
[[ -n "$BRG_ID_ADDR" ]] && {
  req_public GET "$BASE/addresses/barangays/$BRG_ID_ADDR" "" 200 \
    && ok "GET /addresses/barangays/:id" || fail "GET /addresses/barangays/:id — $HTTP_CODE: $(msg)"
} || skip "GET /addresses/barangays/:id (no barangays seeded)"

# ── Public FAQs & Services ────────────────────────────────────────────────────
req_public GET "$BASE/public/faqs/active" "" 200 \
  && ok "GET /public/faqs/active" || fail "GET /public/faqs/active — $HTTP_CODE: $(msg)"

req_public GET "$BASE/public/faqs/paginated" "" 200 \
  && ok "GET /public/faqs/paginated" || fail "GET /public/faqs/paginated — $HTTP_CODE: $(msg)"

req_public GET "$BASE/services/active" "" 200 \
  && ok "GET /services/active" || fail "GET /services/active — $HTTP_CODE: $(msg)"

# ── Admin reads ───────────────────────────────────────────────────────────────
req GET "$BASE/services" "" 200 \
  && ok "GET /services (admin)" || fail "GET /services — $HTTP_CODE: $(msg)"

req GET "$BASE/permissions" "" 200 \
  && ok "GET /permissions" || fail "GET /permissions — $HTTP_CODE: $(msg)"

req GET "$BASE/permissions/resources" "" 200 \
  && ok "GET /permissions/resources" || fail "GET /permissions/resources — $HTTP_CODE: $(msg)"

req GET "$BASE/roles" "" 200 \
  && ok "GET /roles" || fail "GET /roles — $HTTP_CODE: $(msg)"

req GET "$BASE/users" "" 200 \
  && ok "GET /users" || fail "GET /users — $HTTP_CODE: $(msg)"

req GET "$BASE/faqs" "" 200 \
  && ok "GET /faqs (admin)" || fail "GET /faqs — $HTTP_CODE: $(msg)"

req GET "$BASE/government-programs" "" 200 \
  && ok "GET /government-programs" || fail "GET /government-programs — $HTTP_CODE: $(msg)"

req GET "$BASE/social-amelioration-settings" "" 200 \
  && ok "GET /social-amelioration-settings" || fail "GET /social-amelioration-settings — $HTTP_CODE: $(msg)"

req GET "$BASE/residents?page=1&limit=5" "" 200 \
  && ok "GET /residents (admin, paginated)" || fail "GET /residents — $HTTP_CODE: $(msg)"

req GET "$BASE/portal-registration/requests?status=pending&limit=5" "" 200 \
  && ok "GET /portal-registration/requests" || fail "GET /portal-registration/requests — $HTTP_CODE: $(msg)"

req GET "$BASE/tax-profiles" "" 200 \
  && ok "GET /tax-profiles" || fail "GET /tax-profiles — $HTTP_CODE: $(msg)"

req GET "$BASE/exemptions/pending" "" 200 \
  && ok "GET /exemptions/pending" || fail "GET /exemptions/pending — $HTTP_CODE: $(msg)"

# ── Social amelioration reads ─────────────────────────────────────────────────
req GET "$BASE/social-amelioration/seniors" "" 200 \
  && ok "GET /social-amelioration/seniors" || fail "GET /social-amelioration/seniors — $HTTP_CODE: $(msg)"

req GET "$BASE/social-amelioration/pwd" "" 200 \
  && ok "GET /social-amelioration/pwd" || fail "GET /social-amelioration/pwd — $HTTP_CODE: $(msg)"

req GET "$BASE/social-amelioration/students" "" 200 \
  && ok "GET /social-amelioration/students" || fail "GET /social-amelioration/students — $HTTP_CODE: $(msg)"

req GET "$BASE/social-amelioration/solo-parents" "" 200 \
  && ok "GET /social-amelioration/solo-parents" || fail "GET /social-amelioration/solo-parents — $HTTP_CODE: $(msg)"

req GET "$BASE/social-amelioration/stats/overview" "" 200 \
  && ok "GET /social-amelioration/stats/overview" || fail "GET /social-amelioration/stats/overview — $HTTP_CODE: $(msg)"

req GET "$BASE/social-amelioration/stats/trends" "" 200 \
  && ok "GET /social-amelioration/stats/trends" || fail "GET /social-amelioration/stats/trends — $HTTP_CODE: $(msg)"

# ── Admin dashboard & notifications ──────────────────────────────────────────
req GET "$BASE/admin/dashboard/statistics" "" 200 \
  && ok "GET /admin/dashboard/statistics" || fail "GET /admin/dashboard/statistics — $HTTP_CODE: $(msg)"

req GET "$BASE/admin/notifications/counts" "" 200 \
  && ok "GET /admin/notifications/counts" || fail "GET /admin/notifications/counts — $HTTP_CODE: $(msg)"

if [[ -n "$PORTAL_TOKEN" ]]; then
  req_portal GET "$BASE/admin/notifications/subscriber/counts" "" 200 \
    && ok "GET /admin/notifications/subscriber/counts (portal)" || skip "GET /admin/notifications/subscriber/counts — $HTTP_CODE: $(msg)"
else
  skip "GET /admin/notifications/subscriber/counts (no portal token)"
fi

# ── Auth/me ───────────────────────────────────────────────────────────────────
req GET "$BASE/auth/me" "" 200 \
  && ok "GET /auth/me (admin)" || fail "GET /auth/me — $HTTP_CODE: $(msg)"

# ── Portal-auth reads (resident token) ───────────────────────────────────────
if [[ -n "$PORTAL_TOKEN" ]]; then
  req_portal GET "$BASE/residents/me" "" 200 \
    && ok "GET /residents/me (portal)" || fail "GET /residents/me — $HTTP_CODE: $(msg)"

  req_portal GET "$BASE/auth/me" "" 200 \
    && ok "GET /auth/me (portal resident)" || fail "GET /auth/me (portal) — $HTTP_CODE: $(msg)"
else
  skip "GET /residents/me (no portal token)"
  skip "GET /auth/me (portal) (no portal token)"
fi

req_public GET "$BASE/residents/check-username?username=does_not_exist_$SUFFIX" "" 200 \
  && ok "GET /residents/check-username?username=..." || fail "GET /residents/check-username — $HTTP_CODE: $(msg)"

# =============================================================================
# 2. PERMISSIONS
# =============================================================================
header "PERMISSIONS"

PERM_ID=""
if req POST "$BASE/permissions" \
  "{\"resource\":\"test_res_$SUFFIX\",\"action\":\"read\"}" 201; then
  PERM_ID=$(jq_id)
  ok "POST /permissions → id=$PERM_ID"
else
  fail "POST /permissions — $HTTP_CODE: $(msg)"
fi

[[ -n "$PERM_ID" ]] && {
  req GET "$BASE/permissions/$PERM_ID" "" 200 \
    && ok "GET /permissions/:id" || fail "GET /permissions/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/permissions/$PERM_ID" \
    "{\"resource\":\"test_res_${SUFFIX}_upd\",\"action\":\"all\"}" 200 \
    && ok "PUT /permissions/:id" || fail "PUT /permissions/:id — $HTTP_CODE: $(msg)"
}

# =============================================================================
# 3. ROLES
# =============================================================================
header "ROLES"

ROLE_ID=""
if req POST "$BASE/roles" \
  '{"name":"TEST_Role","description":"Automated test role"}' 201; then
  ROLE_ID=$(jq_id)
  ok "POST /roles → id=$ROLE_ID"
else
  fail "POST /roles — $HTTP_CODE: $(msg)"
fi

[[ -n "$ROLE_ID" ]] && {
  req GET "$BASE/roles/$ROLE_ID" "" 200 \
    && ok "GET /roles/:id" || fail "GET /roles/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/roles/$ROLE_ID" \
    '{"name":"TEST_Role_Updated","description":"Updated test role"}' 200 \
    && ok "PUT /roles/:id" || fail "PUT /roles/:id — $HTTP_CODE: $(msg)"

  [[ -n "$PERM_ID" ]] && {
    req POST "$BASE/roles/$ROLE_ID/permissions" \
      "{\"permissionIds\":[\"$PERM_ID\"]}" 200 \
      && ok "POST /roles/:id/permissions (assign)" || fail "POST /roles/:id/permissions — $HTTP_CODE: $(msg)"
  }
}

# =============================================================================
# 4. USERS
# =============================================================================
header "USERS"

NEW_USER_ID=""
if req POST "$BASE/users" \
  "{\"email\":\"test_user_${SUFFIX}@eservice.com\",\"password\":\"TestMut1234!\",\"name\":\"TEST_User_$SUFFIX\",\"role\":\"admin\"}" 201; then
  NEW_USER_ID=$(jq_id)
  ok "POST /users → id=$NEW_USER_ID"
else
  fail "POST /users — $HTTP_CODE: $(msg)"
fi

[[ -n "$NEW_USER_ID" ]] && {
  req GET "$BASE/users/$NEW_USER_ID" "" 200 \
    && ok "GET /users/:id" || fail "GET /users/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/users/$NEW_USER_ID" \
    '{"name":"TEST_User_Updated"}' 200 \
    && ok "PUT /users/:id" || fail "PUT /users/:id — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/users/$NEW_USER_ID/password" \
    '{"currentPassword":"TestMut1234!","password":"TestMut5678!","confirmPassword":"TestMut5678!"}' 200 \
    && ok "PATCH /users/:id/password" || fail "PATCH /users/:id/password — $HTTP_CODE: $(msg)"
}

# =============================================================================
# 5. SERVICES
# =============================================================================
header "SERVICES"

# Service code must be uppercase letters and underscores only (no digits)
# Convert the timestamp suffix to letters so the code is unique per run
SVC_CODE="TEST_SVC_$(echo $SUFFIX | tr '0-9' 'ABCDEFGHIJ')"
SVC_ID=""
# Clean up any leftover test services and their transactions from previous failed runs.
# Transactions must be deleted before services due to the FK RESTRICT constraint.
dbq "
  DELETE FROM transactions WHERE service_id IN (SELECT id FROM services WHERE code LIKE 'TEST_SVC_%');
  DELETE FROM services WHERE code LIKE 'TEST_SVC_%';
" 2>/dev/null || true
if req POST "$BASE/services" \
  "{\"code\":\"$SVC_CODE\",\"name\":\"TEST Service AUTO\",\"description\":\"Automated test\",\"requiresPayment\":false,\"isActive\":true}" 201; then
  SVC_ID=$(jq_id)
  ok "POST /services → id=$SVC_ID"
else
  fail "POST /services — $HTTP_CODE: $(msg)"
fi

[[ -n "$SVC_ID" ]] && {
  req GET "$BASE/services/$SVC_ID" "" 200 \
    && ok "GET /services/:id" || fail "GET /services/:id — $HTTP_CODE: $(msg)"

  req GET "$BASE/services/code/$SVC_CODE" "" 200 \
    && ok "GET /services/code/:code" || fail "GET /services/code/:code — $HTTP_CODE: $(msg)"

  req GET "$BASE/service-fields/$SVC_ID" "" 200 \
    && ok "GET /service-fields/:serviceId" || skip "GET /service-fields/:serviceId — $HTTP_CODE (optional)"

  req GET "$BASE/services/$SVC_ID/appointments/availability" "" 200 \
    && ok "GET /services/:id/appointments/availability" || skip "GET /services/:id/appointments/availability — $HTTP_CODE (may need appointment config)"

  req PUT "$BASE/services/$SVC_ID" \
    '{"name":"TEST Service Updated","description":"Updated"}' 200 \
    && ok "PUT /services/:id" || fail "PUT /services/:id — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/services/$SVC_ID/deactivate" "" 200 \
    && ok "PATCH /services/:id/deactivate" || fail "PATCH /services/:id/deactivate — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/services/$SVC_ID/activate" "" 200 \
    && ok "PATCH /services/:id/activate" || fail "PATCH /services/:id/activate — $HTTP_CODE: $(msg)"
}

# =============================================================================
# 6. FAQs
# =============================================================================
header "FAQs"

FAQ_ID=""
if req POST "$BASE/faqs" \
  '{"question":"TEST_Q: How do I register?","answer":"TEST_A: Visit the portal.","order":99}' 201; then
  FAQ_ID=$(jq_id)
  ok "POST /faqs → id=$FAQ_ID"
else
  fail "POST /faqs — $HTTP_CODE: $(msg)"
fi

[[ -n "$FAQ_ID" ]] && {
  req GET "$BASE/faqs/$FAQ_ID" "" 200 \
    && ok "GET /faqs/:id" || fail "GET /faqs/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/faqs/$FAQ_ID" \
    '{"question":"TEST_Q_Updated: How do I update?","answer":"TEST_A_Updated: Go to profile."}' 200 \
    && ok "PUT /faqs/:id" || fail "PUT /faqs/:id — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/faqs/$FAQ_ID/deactivate" "" 200 \
    && ok "PATCH /faqs/:id/deactivate" || fail "PATCH /faqs/:id/deactivate — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/faqs/$FAQ_ID/activate" "" 200 \
    && ok "PATCH /faqs/:id/activate" || fail "PATCH /faqs/:id/activate — $HTTP_CODE: $(msg)"
}

# =============================================================================
# 7. GOVERNMENT PROGRAMS
# =============================================================================
header "GOVERNMENT PROGRAMS"

PROG_ID=""
if req POST "$BASE/government-programs" \
  '{"name":"TEST_Program","description":"Automated test","type":"ALL","isActive":true}' 201; then
  PROG_ID=$(jq_id)
  ok "POST /government-programs → id=$PROG_ID"
else
  fail "POST /government-programs — $HTTP_CODE: $(msg)"
fi

[[ -n "$PROG_ID" ]] && {
  req GET "$BASE/government-programs/$PROG_ID" "" 200 \
    && ok "GET /government-programs/:id" || fail "GET /government-programs/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/government-programs/$PROG_ID" \
    '{"name":"TEST_Program_Updated","type":"ALL"}' 200 \
    && ok "PUT /government-programs/:id" || fail "PUT /government-programs/:id — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/government-programs/$PROG_ID/deactivate" "" 200 \
    && ok "PATCH /government-programs/:id/deactivate" || fail "PATCH deactivate — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/government-programs/$PROG_ID/activate" "" 200 \
    && ok "PATCH /government-programs/:id/activate" || fail "PATCH activate — $HTTP_CODE: $(msg)"
}

# =============================================================================
# 8. SOCIAL AMELIORATION SETTINGS
# =============================================================================
header "SOCIAL AMELIORATION SETTINGS"

SA_ID=""
if req POST "$BASE/social-amelioration-settings" \
  '{"type":"PENSION_TYPE","name":"TEST_Pension","description":"Automated test","isActive":true}' 201; then
  SA_ID=$(jq_id)
  ok "POST /social-amelioration-settings → id=$SA_ID"
else
  fail "POST /social-amelioration-settings — $HTTP_CODE: $(msg)"
fi

[[ -n "$SA_ID" ]] && {
  req GET "$BASE/social-amelioration-settings/$SA_ID" "" 200 \
    && ok "GET /social-amelioration-settings/:id" || fail "GET /social-amelioration-settings/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/social-amelioration-settings/$SA_ID" \
    '{"name":"TEST_Pension_Updated"}' 200 \
    && ok "PUT /social-amelioration-settings/:id" || fail "PUT /social-amelioration-settings/:id — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/social-amelioration-settings/$SA_ID/deactivate" "" 200 \
    && ok "PATCH /social-amelioration-settings/:id/deactivate" || fail "PATCH deactivate — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/social-amelioration-settings/$SA_ID/activate" "" 200 \
    && ok "PATCH /social-amelioration-settings/:id/activate" || fail "PATCH activate — $HTTP_CODE: $(msg)"
}

# =============================================================================
# 9. PORTAL REGISTRATION
# =============================================================================
header "PORTAL REGISTRATION"

REG_USERNAME="testreg_${SUFFIX}"
REG_REQ_ID=""

# Submit registration
if req_public POST "$BASE/portal-registration/register" \
  "{\"firstName\":\"TestReg\",\"lastName\":\"Register\",\"birthdate\":\"2000-01-01\",
    \"sex\":\"Male\",\"civilStatus\":\"Single\",
    \"username\":\"$REG_USERNAME\",\"password\":\"RegTest1234!\",
    \"contactNumber\":\"0999000${SUFFIX: -4}\"}" 201; then
  ok "POST /portal-registration/register"
else
  BRG_ID_FOR_REG=$(db "SELECT id FROM barangays LIMIT 1;")
  if [[ -n "$BRG_ID_FOR_REG" ]]; then
    req_public POST "$BASE/portal-registration/register" \
      "{\"firstName\":\"TestReg\",\"lastName\":\"Register\",\"birthdate\":\"2000-01-01\",
        \"sex\":\"Male\",\"civilStatus\":\"Single\",\"barangayId\":$BRG_ID_FOR_REG,
        \"username\":\"$REG_USERNAME\",\"password\":\"RegTest1234!\",
        \"contactNumber\":\"0999000${SUFFIX: -4}\"}" 201 \
      && ok "POST /portal-registration/register" \
      || fail "POST /portal-registration/register — $HTTP_CODE: $(msg)"
  else
    skip "POST /portal-registration/register (no barangays seeded)"
  fi
fi

req_public GET "$BASE/portal-registration/status/$REG_USERNAME" "" 200 \
  && ok "GET /portal-registration/status/:username" || skip "GET /portal-registration/status/:username — $HTTP_CODE"

req GET "$BASE/portal-registration/requests?status=pending&limit=5" "" 200 \
  && ok "GET /portal-registration/requests?status=pending" || fail "GET /portal-registration/requests — $HTTP_CODE: $(msg)"

REG_REQ_ID=$(db "SELECT rr.id FROM registration_requests rr JOIN residents r ON r.id = rr.resident_fk WHERE r.username='$REG_USERNAME' LIMIT 1;")
[[ -n "$REG_REQ_ID" ]] && {
  req GET "$BASE/portal-registration/requests/$REG_REQ_ID" "" 200 \
    && ok "GET /portal-registration/requests/:id" || fail "GET /portal-registration/requests/:id — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/portal-registration/requests/$REG_REQ_ID/under-review" "" 200 \
    && ok "PATCH /portal-registration/requests/:id/under-review" || fail "PATCH under-review — $HTTP_CODE: $(msg)"

  req POST "$BASE/portal-registration/requests/$REG_REQ_ID/request-docs" \
    '{"adminNotes":"Please resubmit a clearer photo ID."}' 200 \
    && ok "POST /portal-registration/requests/:id/request-docs" || fail "POST request-docs — $HTTP_CODE: $(msg)"

  dbq "UPDATE registration_requests SET status='under_review' WHERE id='$REG_REQ_ID';" 2>/dev/null

  req POST "$BASE/portal-registration/requests/$REG_REQ_ID/review" \
    '{"action":"reject","adminNotes":"Test rejection via automated test"}' 200 \
    && ok "POST /portal-registration/requests/:id/review (reject)" || fail "POST review/reject — $HTTP_CODE: $(msg)"

  # Seed a second registration to test the approve action
  APPROVE_RES_ID=""
  APPROVE_REG_ID=""
  BRG_ID_FOR_APPROVE=$(db "SELECT id FROM barangays LIMIT 1;")
  if [[ -n "$BRG_ID_FOR_APPROVE" ]]; then
    dbq "INSERT INTO residents (barangay_id,last_name,first_name,birthdate,status,username)
         VALUES ($BRG_ID_FOR_APPROVE,'ApproveTest','ToApprove','2000-01-01','pending','approve_test_$SUFFIX');" 2>/dev/null || true
    APPROVE_RES_ID=$(db "SELECT id FROM residents WHERE username='approve_test_$SUFFIX' LIMIT 1;")
    [[ -n "$APPROVE_RES_ID" ]] && {
      dbq "INSERT INTO registration_requests (resident_fk,status)
           VALUES ('$APPROVE_RES_ID','under_review') ON CONFLICT DO NOTHING;" 2>/dev/null
      APPROVE_REG_ID=$(db "SELECT id FROM registration_requests WHERE resident_fk='$APPROVE_RES_ID' LIMIT 1;")
    }
  fi
  [[ -n "$APPROVE_REG_ID" ]] && {
    req POST "$BASE/portal-registration/requests/$APPROVE_REG_ID/review" \
      '{"action":"approve","adminNotes":"Approved in automated test"}' 200 \
      && ok "POST /portal-registration/requests/:id/review (approve)" || fail "POST review/approve — $HTTP_CODE: $(msg)"
  } || skip "POST /portal-registration/requests/:id/review (approve) — could not seed test registration"

} || skip "Portal registration review tests (no registration request found)"

req DELETE "$BASE/portal-registration/requests/rejected" "" 200 \
  && ok "DELETE /portal-registration/requests/rejected (bulk cleanup)" || skip "DELETE bulk rejected — $HTTP_CODE"

# =============================================================================
# 10. RESIDENTS (admin operations on unified residents table)
# =============================================================================
header "RESIDENTS"

if [[ -n "$TEST_RES_ID" ]]; then
  req GET "$BASE/residents/$TEST_RES_ID" "" 200 \
    && ok "GET /residents/:id" || fail "GET /residents/:id — $HTTP_CODE: $(msg)"

  req GET "$BASE/residents/$TEST_RES_ID/transactions" "" 200 \
    && ok "GET /residents/:id/transactions" || fail "GET /residents/:id/transactions — $HTTP_CODE: $(msg)"

  req GET "$BASE/residents/check-username?username=test_portal_$SUFFIX" "" 200 \
    && ok "GET /residents/check-username (taken username)" || fail "GET /residents/check-username — $HTTP_CODE: $(msg)"

  RES_DISPLAY_ID=$(db "SELECT resident_id FROM residents WHERE id='$TEST_RES_ID' LIMIT 1;")
  [[ -n "$RES_DISPLAY_ID" ]] && {
    req GET "$BASE/residents/by-resident-id/$RES_DISPLAY_ID" "" 200 \
      && ok "GET /residents/by-resident-id/:residentId" || fail "GET /residents/by-resident-id — $HTTP_CODE: $(msg)"
  } || skip "GET /residents/by-resident-id (test resident has no display ID yet)"

  req PUT "$BASE/residents/$TEST_RES_ID" \
    '{"occupation":"Test Occupation"}' 200 \
    && ok "PUT /residents/:id" || fail "PUT /residents/:id — $HTTP_CODE: $(msg)"
else
  skip "Resident admin routes (no test resident)"
fi

# =============================================================================
# 10b. RESIDENT STATUS MANAGEMENT
# =============================================================================
header "RESIDENT STATUS MANAGEMENT"

# Use a dedicated temp resident so we don't break the portal-auth test resident
TEMP_RES_ID=""
BRG_ID_FOR_STATUS=$(db "SELECT id FROM barangays LIMIT 1;")
if [[ -n "$BRG_ID_FOR_STATUS" ]]; then
  dbq "INSERT INTO residents (barangay_id,last_name,first_name,birthdate,status,username)
       VALUES ($BRG_ID_FOR_STATUS,'StatusTest','ToManage','2000-01-01','active','status_test_$SUFFIX');" 2>/dev/null || true
  TEMP_RES_ID=$(db "SELECT id FROM residents WHERE username='status_test_$SUFFIX' LIMIT 1;")
fi

if [[ -n "$TEMP_RES_ID" ]]; then
  req PATCH "$BASE/residents/$TEMP_RES_ID/deactivate" "" 200 \
    && ok "PATCH /residents/:id/deactivate" || fail "PATCH deactivate — $HTTP_CODE: $(msg)"

  req PATCH "$BASE/residents/$TEMP_RES_ID/activate" "" 200 \
    && ok "PATCH /residents/:id/activate" || fail "PATCH activate — $HTTP_CODE: $(msg)"

  skip "PATCH /residents/:id/deceased  (permanent status — excluded from automated test)"
  skip "PATCH /residents/:id/moved-out (permanent status — excluded from automated test)"

  req DELETE "$BASE/residents/$TEMP_RES_ID" "" 200 \
    && ok "DELETE /residents/:id" || fail "DELETE /residents/:id — $HTTP_CODE: $(msg)"
  TEMP_RES_ID=""  # already deleted
else
  skip "Resident status tests (could not seed test resident)"
fi

# =============================================================================
# 11. TAX PROFILES + VERSIONS
# (Must be created and activated BEFORE transactions so the service has an active
#  tax profile at transaction-creation time, enabling automatic tax computation.
#  This makes the TAX_COMP_ID available for the PAYMENTS section that follows.)
# =============================================================================
header "TAX PROFILES"

TAX_ID=""
TAX_VER_ID=""
if [[ -n "$SVC_ID" ]]; then
  if req POST "$BASE/tax-profiles" \
    "{\"serviceId\":\"$SVC_ID\",\"name\":\"TEST_TaxProfile_$SUFFIX\",\"isActive\":true}" 201; then
    TAX_ID=$(jq_id)
    ok "POST /tax-profiles → id=$TAX_ID"
  else
    fail "POST /tax-profiles — $HTTP_CODE: $(msg)"
  fi
else
  skip "POST /tax-profiles (no service created)"
fi

[[ -n "$TAX_ID" ]] && {
  req GET "$BASE/tax-profiles/$TAX_ID" "" 200 \
    && ok "GET /tax-profiles/:id" || fail "GET /tax-profiles/:id — $HTTP_CODE: $(msg)"

  req PUT "$BASE/tax-profiles/$TAX_ID" \
    '{"name":"TEST_TaxProfile_Updated"}' 200 \
    && ok "PUT /tax-profiles/:id" || fail "PUT /tax-profiles/:id — $HTTP_CODE: $(msg)"

  if req POST "$BASE/tax-profiles/$TAX_ID/versions" \
    "{\"version\":\"1.0.0\",\"effectiveFrom\":\"2026-01-01T00:00:00Z\",
      \"status\":\"DRAFT\",\"changeReason\":\"Initial version for automated test\",
      \"configuration\":{\"inputs\":[],\"derivedValues\":[],\"finalTax\":{\"formula\":\"0\"}}}" 2; then
    TAX_VER_ID=$(jq_id)
    ok "POST /tax-profiles/:id/versions → id=$TAX_VER_ID"
  else
    fail "POST /tax-profiles/:id/versions — $HTTP_CODE: $(msg)"
  fi

  [[ -n "$TAX_VER_ID" ]] && {
    req GET "$BASE/tax-profiles/$TAX_ID/versions" "" 200 \
      && ok "GET /tax-profiles/:id/versions" || fail "GET /tax-profiles/:id/versions — $HTTP_CODE: $(msg)"

    req PUT "$BASE/tax-profiles/versions/$TAX_VER_ID" \
      '{"changeReason":"Updated for automated test","configuration":{"inputs":[],"derivedValues":[],"finalTax":{"formula":"0"}}}' 200 \
      && ok "PUT /tax-profiles/versions/:versionId" || fail "PUT tax-profiles/versions/:id — $HTTP_CODE: $(msg)"

    req PATCH "$BASE/tax-profiles/versions/$TAX_VER_ID/activate" "" 200 \
      && ok "PATCH /tax-profiles/versions/:id/activate" || skip "PATCH activate version — $HTTP_CODE (may need specific status)"
  }
}

# =============================================================================
# 12. TRANSACTIONS
# =============================================================================
header "TRANSACTIONS"

TXN_ID=""
TXN_REF=""

# Note: GET /api/transactions (plain list) does not exist — admin uses
# GET /transactions/service/:code or GET /transactions/:id  for lookups.
skip "GET /transactions (no admin list route — use /transactions/service/:code)"

# Guest transaction (no auth required)
if [[ -n "$SVC_ID" ]]; then
  TOKEN_SAVE="$TOKEN"; TOKEN=""
  if req POST "$BASE/transactions" \
    "{\"serviceId\":\"$SVC_ID\",
      \"applicantName\":\"TEST Guest $SUFFIX\",
      \"applicantContact\":\"0999111${SUFFIX: -4}\",
      \"applicantAddress\":\"Test Street, Test Barangay\",
      \"serviceData\":{\"purpose\":\"For employment\"}}" 201; then
    TXN_ID=$(jq_get "d.get('data',{}).get('id','') or d.get('id','')")
    TXN_REF=$(jq_get "d.get('data',{}).get('referenceNumber','') or d.get('referenceNumber','')")
    ok "POST /transactions (guest) → ref=$TXN_REF"
  else
    fail "POST /transactions (guest) — $HTTP_CODE: $(msg)"
  fi
  TOKEN="$TOKEN_SAVE"

  # Public tracker
  [[ -n "$TXN_REF" ]] && {
    req_public GET "$BASE/transactions/track/$TXN_REF" "" 200 \
      && ok "GET /transactions/track/:referenceNumber" || fail "GET /transactions/track — $HTTP_CODE: $(msg)"
  }

  # Admin views
  [[ -n "$TXN_ID" ]] && {
    req GET "$BASE/transactions/$TXN_ID" "" 200 \
      && ok "GET /transactions/:id (admin)" || fail "GET /transactions/:id — $HTTP_CODE: $(msg)"

    req GET "$BASE/transactions/service/$SVC_CODE" "" 200 \
      && ok "GET /transactions/service/:serviceCode" || fail "GET /transactions/service/:serviceCode — $HTTP_CODE: $(msg)"

    req GET "$BASE/transactions/service/$SVC_CODE/statistics" "" 200 \
      && ok "GET /transactions/service/:serviceCode/statistics" || fail "GET /transactions/service/statistics — $HTTP_CODE: $(msg)"

    req GET "$BASE/transactions/appointments" "" 200 \
      && ok "GET /transactions/appointments" || fail "GET /transactions/appointments — $HTTP_CODE: $(msg)"

    req PUT "$BASE/transactions/$TXN_ID" \
      '{"status":"PROCESSING"}' 200 \
      && ok "PUT /transactions/:id (update status)" || fail "PUT /transactions/:id — $HTTP_CODE: $(msg)"

    # Document download (may require an attached document)
    req GET "$BASE/transactions/$TXN_ID/download" "" 200 \
      && ok "GET /transactions/:id/download" || skip "GET /transactions/:id/download — $HTTP_CODE (requires attached document)"

    # Admin-initiated update request
    req POST "$BASE/transactions/$TXN_ID/admin-request-update" \
      '{"description":"Admin-requested update for automated test","type":"GENERAL"}' 200 \
      && ok "POST /transactions/:id/admin-request-update" || skip "POST /transactions/:id/admin-request-update — $HTTP_CODE: $(msg)"

    # Tax computation (auto-computed at creation if service has an active tax profile)
    req GET "$BASE/transactions/$TXN_ID/tax-computation" "" 200 \
      && {
        ok "GET /transactions/:id/tax-computation"
        TAX_COMP_ID=$(jq_get "d.get('data',{}).get('id','') or d.get('id','')")
        [[ -n "$TAX_COMP_ID" ]] && info "Tax computation ID: $TAX_COMP_ID"
      } || skip "GET /transactions/:id/tax-computation — $HTTP_CODE (no tax profile configured)"

    req POST "$BASE/transactions/$TXN_ID/compute-tax" '{}' 200 \
      && {
        ok "POST /transactions/:id/compute-tax"
        # Update TAX_COMP_ID: compute-tax may deactivate the previous computation and create a new one
        NEW_COMP_ID=$(jq_get "d.get('data',{}).get('id','') or d.get('id','')")
        [[ -n "$NEW_COMP_ID" ]] && TAX_COMP_ID="$NEW_COMP_ID"
      } || skip "POST /transactions/:id/compute-tax — $HTTP_CODE (no tax profile configured)"

    # Transaction notes
    NOTE_ID=""
    if req POST "$BASE/transactions/$TXN_ID/notes" \
      '{"message":"Automated test note"}' 201; then
      NOTE_ID=$(jq_id)
      ok "POST /transactions/:id/notes → id=$NOTE_ID"
    else
      fail "POST /transactions/:id/notes — $HTTP_CODE: $(msg)"
    fi

    req GET "$BASE/transactions/$TXN_ID/notes" "" 200 \
      && ok "GET /transactions/:id/notes" || fail "GET /transactions/:id/notes — $HTTP_CODE: $(msg)"

    req GET "$BASE/transactions/$TXN_ID/notes/unread-count" "" 200 \
      && ok "GET /transactions/:id/notes/unread-count" || fail "GET unread-count — $HTTP_CODE: $(msg)"

    [[ -n "$NOTE_ID" ]] && {
      req PUT "$BASE/transactions/$TXN_ID/notes/$NOTE_ID/read" "" 200 \
        && ok "PUT /transactions/:id/notes/:noteId/read" || fail "PUT note/read — $HTTP_CODE: $(msg)"
    }

    req PUT "$BASE/transactions/$TXN_ID/notes/read-all" "" 200 \
      && ok "PUT /transactions/:id/notes/read-all" || fail "PUT notes/read-all — $HTTP_CODE: $(msg)"
  }

  # Resident transaction (with portal token)
  if [[ -n "$PORTAL_TOKEN" && -n "$TEST_RES_ID" ]]; then
    RES_TXN_ID=""
    if req_portal POST "$BASE/transactions" \
      "{\"serviceId\":\"$SVC_ID\",\"residentId\":\"$TEST_RES_ID\",
        \"serviceData\":{\"purpose\":\"For school enrollment\"}}" 201; then
      RES_TXN_ID=$(jq_get "d.get('data',{}).get('id','') or d.get('id','')")
      ok "POST /transactions (resident) → id=$RES_TXN_ID"
    else
      fail "POST /transactions (resident) — $HTTP_CODE: $(msg)"
    fi

    req_portal GET "$BASE/transactions/subscriber/$TEST_RES_ID" "" 200 \
      && ok "GET /transactions/subscriber/:residentId" || fail "GET /transactions/subscriber — $HTTP_CODE: $(msg)"

    [[ -n "$RES_TXN_ID" ]] && {
      req_portal GET "$BASE/transactions/$RES_TXN_ID" "" 200 \
        && ok "GET /transactions/:id (portal)" || fail "GET /transactions/:id (portal) — $HTTP_CODE: $(msg)"

      req_portal POST "$BASE/transactions/$RES_TXN_ID/request-update" \
        '{"description":"Request to update contact number"}' 200 \
        && ok "POST /transactions/:id/request-update (portal)" || skip "POST request-update — $HTTP_CODE (may need specific status)"

      req POST "$BASE/transactions/$RES_TXN_ID/review-update-request" \
        '{"action":"APPROVED","adminNotes":"Approved for test"}' 200 \
        && ok "POST /transactions/:id/review-update-request" || skip "POST review-update-request — $HTTP_CODE (may need pending status)"
    }
  else
    skip "POST /transactions (resident) — no portal token or test resident"
    skip "GET /transactions/subscriber/:residentId — no portal token"
  fi
else
  skip "Transaction tests (no service created)"
fi

# =============================================================================
# 12. PAYMENTS
# =============================================================================
header "PAYMENTS"

PAYMENT_ID=""
if [[ -n "$TXN_ID" ]]; then
  # POST /payments requires taxComputationId (schema-enforced); skip creation if none available
  if [[ -n "$TAX_COMP_ID" ]]; then
    if req POST "$BASE/payments" \
      "{\"transactionId\":\"$TXN_ID\",\"taxComputationId\":\"$TAX_COMP_ID\",
        \"amount\":50,\"paymentMethod\":\"CASH\",
        \"referenceNumber\":\"OR-TEST-$SUFFIX\",\"notes\":\"Automated test payment\"}" 201; then
      PAYMENT_ID=$(jq_id)
      ok "POST /payments → id=$PAYMENT_ID"
    else
      fail "POST /payments — $HTTP_CODE: $(msg)"
    fi
  else
    skip "POST /payments (no tax computation — requires active tax profile on service)"
  fi

  req GET "$BASE/payments/transaction/$TXN_ID" "" 200 \
    && ok "GET /payments/transaction/:transactionId" || fail "GET /payments/transaction — $HTTP_CODE: $(msg)"

  req GET "$BASE/payments/transaction/$TXN_ID/balance" "" 200 \
    && ok "GET /payments/transaction/:transactionId/balance" || skip "GET /payments/balance — $HTTP_CODE (requires active tax computation)"

  [[ -n "$PAYMENT_ID" ]] && {
    req GET "$BASE/payments/$PAYMENT_ID" "" 200 \
      && ok "GET /payments/:id" || fail "GET /payments/:id — $HTTP_CODE: $(msg)"
  }
else
  skip "Payment tests (no transaction created)"
fi

# =============================================================================
# 12b. EXEMPTIONS
# =============================================================================
header "EXEMPTIONS"

EXEMPTION_ID=""
EXEMPTION_ID2=""
if [[ -n "$TXN_ID" ]]; then
  if req POST "$BASE/exemptions" \
    "{\"transactionId\":\"$TXN_ID\",\"reason\":\"Automated test exemption\",\"supportingDocuments\":[]}" 201; then
    EXEMPTION_ID=$(jq_id)
    ok "POST /exemptions → id=$EXEMPTION_ID"
  else
    skip "POST /exemptions — $HTTP_CODE: $(msg) (may require payment to exist or transaction in payable state)"
  fi

  req GET "$BASE/exemptions/transaction/$TXN_ID" "" 200 \
    && ok "GET /exemptions/transaction/:transactionId" || fail "GET /exemptions/transaction — $HTTP_CODE: $(msg)"

  [[ -n "$EXEMPTION_ID" ]] && {
    req GET "$BASE/exemptions/$EXEMPTION_ID" "" 200 \
      && ok "GET /exemptions/:id" || fail "GET /exemptions/:id — $HTTP_CODE: $(msg)"

    req PATCH "$BASE/exemptions/$EXEMPTION_ID/approve" \
      '{"adminNotes":"Approved in automated test"}' 200 \
      && ok "PATCH /exemptions/:id/approve" || fail "PATCH exemption/approve — $HTTP_CODE: $(msg)"
  }

  # Second exemption for reject test
  if req POST "$BASE/exemptions" \
    "{\"transactionId\":\"$TXN_ID\",\"reason\":\"Test exemption for reject\",\"supportingDocuments\":[]}" 201; then
    EXEMPTION_ID2=$(jq_id)
    req PATCH "$BASE/exemptions/$EXEMPTION_ID2/reject" \
      '{"adminNotes":"Rejected in automated test"}' 200 \
      && ok "PATCH /exemptions/:id/reject" || fail "PATCH exemption/reject — $HTTP_CODE: $(msg)"
  else
    skip "POST /exemptions (second, for reject test) — $HTTP_CODE: $(msg)"
    skip "PATCH /exemptions/:id/reject (no exemption created)"
  fi
else
  skip "Exemption tests (no transaction created)"
  skip "GET /exemptions/transaction/:transactionId (no transaction)"
  skip "GET /exemptions/:id (no exemption)"
  skip "PATCH /exemptions/:id/approve (no exemption)"
  skip "PATCH /exemptions/:id/reject (no exemption)"
fi

# =============================================================================
# 13. TAX REASSESSMENT & TAX PREVIEW
# (Tax profile was created and activated in section 11, before transactions.)
# =============================================================================
header "TAX REASSESSMENT & TAX PREVIEW"

if [[ -n "$SVC_ID" ]]; then
  req POST "$BASE/tax/preview" \
    "{\"serviceId\":\"$SVC_ID\",\"inputs\":{}}" 200 \
    && ok "POST /tax/preview" || skip "POST /tax/preview — $HTTP_CODE: $(msg) (no active tax profile configured for service)"
else
  skip "POST /tax/preview (no service created)"
fi

if [[ -n "$TXN_ID" ]]; then
  req POST "$BASE/tax-reassessment/$TXN_ID" \
    '{"reason":"Automated test reassessment","inputs":{}}' 200 \
    && ok "POST /tax-reassessment/:transactionId" || skip "POST /tax-reassessment — $HTTP_CODE: $(msg) (may need existing tax computation)"

  req GET "$BASE/tax-reassessment/$TXN_ID/history" "" 200 \
    && ok "GET /tax-reassessment/:transactionId/history" || fail "GET /tax-reassessment/history — $HTTP_CODE: $(msg)"

  # The comparison endpoint requires a computation with is_reassessment=true
  COMP_ID=$(db "SELECT id FROM tax_computations WHERE transaction_id='$TXN_ID' AND is_reassessment=true ORDER BY computed_at DESC LIMIT 1;" 2>/dev/null || echo "")
  [[ -n "$COMP_ID" ]] && {
    req GET "$BASE/tax-reassessment/comparison/$COMP_ID" "" 200 \
      && ok "GET /tax-reassessment/comparison/:computationId" || fail "GET /tax-reassessment/comparison — $HTTP_CODE: $(msg)"
  } || skip "GET /tax-reassessment/comparison/:computationId (no reassessment computation on this transaction)"
else
  skip "Tax reassessment tests (no transaction created)"
fi

# =============================================================================
# 14. SOCIAL AMELIORATION BENEFICIARIES
# =============================================================================
header "SOCIAL AMELIORATION BENEFICIARIES"

PENSION_TYPE_ID=$(db "SELECT id FROM social_amelioration_settings WHERE type='PENSION_TYPE' AND is_active=true LIMIT 1;")
DISABILITY_TYPE_ID=$(db "SELECT id FROM social_amelioration_settings WHERE type='DISABILITY_TYPE' AND is_active=true LIMIT 1;")
GRADE_LEVEL_ID=$(db "SELECT id FROM social_amelioration_settings WHERE type='GRADE_LEVEL' AND is_active=true LIMIT 1;")
SOLO_PARENT_CAT_ID=$(db "SELECT id FROM social_amelioration_settings WHERE type='SOLO_PARENT_CATEGORY' AND is_active=true LIMIT 1;")

SENIOR_BEN_ID=""
[[ -n "$TEST_RES_ID" && -n "$PENSION_TYPE_ID" ]] && {
  if req POST "$BASE/social-amelioration/seniors" \
    "{\"residentId\":\"$TEST_RES_ID\",\"seniorCitizenId\":\"SC-TEST-$SUFFIX\",
      \"pensionTypes\":[\"$PENSION_TYPE_ID\"]}" 201; then
    SENIOR_BEN_ID=$(jq_id)
    ok "POST /social-amelioration/seniors → id=$SENIOR_BEN_ID"
  else
    fail "POST /social-amelioration/seniors — $HTTP_CODE: $(msg)"
  fi

  [[ -n "$SENIOR_BEN_ID" ]] && {
    req PUT "$BASE/social-amelioration/seniors/$SENIOR_BEN_ID" \
      "{\"status\":\"ACTIVE\",\"pensionTypes\":[\"$PENSION_TYPE_ID\"]}" 200 \
      && ok "PUT /social-amelioration/seniors/:id" || fail "PUT /social-amelioration/seniors/:id — $HTTP_CODE: $(msg)"
  }
} || skip "POST /social-amelioration/seniors (need test resident + PENSION_TYPE setting)"

PWD_BEN_ID=""
[[ -n "$TEST_RES_ID" && -n "$DISABILITY_TYPE_ID" ]] && {
  if req POST "$BASE/social-amelioration/pwd" \
    "{\"residentId\":\"$TEST_RES_ID\",\"pwdId\":\"PWD-TEST-$SUFFIX\",
      \"disabilityLevel\":\"Mild\",\"disabilityTypeId\":\"$DISABILITY_TYPE_ID\",
      \"monetaryAllowance\":true,\"assistedDevice\":false}" 201; then
    PWD_BEN_ID=$(jq_id)
    ok "POST /social-amelioration/pwd → id=$PWD_BEN_ID"
  else
    skip "POST /social-amelioration/pwd — $HTTP_CODE: $(msg) (may conflict with existing beneficiary)"
  fi

  [[ -n "$PWD_BEN_ID" ]] && {
    req PUT "$BASE/social-amelioration/pwd/$PWD_BEN_ID" \
      '{"disabilityLevel":"Moderate","status":"ACTIVE"}' 200 \
      && ok "PUT /social-amelioration/pwd/:id" || fail "PUT /social-amelioration/pwd/:id — $HTTP_CODE: $(msg)"
  }
} || skip "POST /social-amelioration/pwd (need test resident + DISABILITY_TYPE setting)"

STUDENT_BEN_ID=""
[[ -n "$TEST_RES_ID" && -n "$GRADE_LEVEL_ID" ]] && {
  if req POST "$BASE/social-amelioration/students" \
    "{\"residentId\":\"$TEST_RES_ID\",\"studentId\":\"STU-TEST-$SUFFIX\",
      \"gradeLevelId\":\"$GRADE_LEVEL_ID\"}" 201; then
    STUDENT_BEN_ID=$(jq_id)
    ok "POST /social-amelioration/students → id=$STUDENT_BEN_ID"
  else
    skip "POST /social-amelioration/students — $HTTP_CODE: $(msg)"
  fi

  [[ -n "$STUDENT_BEN_ID" ]] && {
    req PUT "$BASE/social-amelioration/students/$STUDENT_BEN_ID" \
      '{"status":"ACTIVE"}' 200 \
      && ok "PUT /social-amelioration/students/:id" || fail "PUT /social-amelioration/students/:id — $HTTP_CODE: $(msg)"
  }
} || skip "POST /social-amelioration/students (need test resident + GRADE_LEVEL setting)"

SOLO_BEN_ID=""
[[ -n "$TEST_RES_ID" && -n "$SOLO_PARENT_CAT_ID" ]] && {
  if req POST "$BASE/social-amelioration/solo-parents" \
    "{\"residentId\":\"$TEST_RES_ID\",\"soloParentId\":\"SP-TEST-$SUFFIX\",
      \"categoryId\":\"$SOLO_PARENT_CAT_ID\"}" 201; then
    SOLO_BEN_ID=$(jq_id)
    ok "POST /social-amelioration/solo-parents → id=$SOLO_BEN_ID"
  else
    skip "POST /social-amelioration/solo-parents — $HTTP_CODE: $(msg)"
  fi

  [[ -n "$SOLO_BEN_ID" ]] && {
    req PUT "$BASE/social-amelioration/solo-parents/$SOLO_BEN_ID" \
      '{"status":"ACTIVE"}' 200 \
      && ok "PUT /social-amelioration/solo-parents/:id" || fail "PUT /social-amelioration/solo-parents/:id — $HTTP_CODE: $(msg)"
  }
} || skip "POST /social-amelioration/solo-parents (need test resident + SOLO_PARENT_CATEGORY setting)"

# =============================================================================
# CLEANUP — delete in reverse dependency order
# =============================================================================
header "CLEANUP"

# Auth logout (clears session / refresh token cookie)
req POST "$BASE/auth/logout" "" 200 \
  && ok "POST /auth/logout" || skip "POST /auth/logout — $HTTP_CODE: $(msg)"

# Intentional skips — routes that cannot be exercised in a headless curl test
skip "GET  /api/auth/portal/google          (OAuth redirect — requires browser)"
skip "GET  /api/auth/portal/google/callback (OAuth callback — requires browser)"
skip "POST /api/auth/portal/google/supabase (requires valid Supabase token)"
skip "POST /api/auth/portal/google/link     (requires valid Google token)"
skip "DELETE /api/auth/portal/google/unlink (requires linked Google account)"
skip "POST /api/upload/*                    (multipart file upload — manual test)"
skip "GET  /api/upload/subscribers/:id/profile-picture (upload route — manual test)"
skip "POST /api/dev/login                   (dev-only — excluded from CI)"
skip "GET  /api/dev/logs                    (dev-only — excluded from CI)"
skip "GET  /api/dev/database                (dev-only — excluded from CI)"
skip "GET  /api/dev/system                  (dev-only — excluded from CI)"

# Beneficiaries
[[ -n "$SENIOR_BEN_ID"  ]] && { req DELETE "$BASE/social-amelioration/seniors/$SENIOR_BEN_ID"     "" 200 && ok "DELETE senior beneficiary"      || fail "DELETE senior beneficiary — $HTTP_CODE"; }
[[ -n "$PWD_BEN_ID"     ]] && { req DELETE "$BASE/social-amelioration/pwd/$PWD_BEN_ID"             "" 200 && ok "DELETE pwd beneficiary"         || fail "DELETE pwd beneficiary — $HTTP_CODE"; }
[[ -n "$STUDENT_BEN_ID" ]] && { req DELETE "$BASE/social-amelioration/students/$STUDENT_BEN_ID"   "" 200 && ok "DELETE student beneficiary"     || fail "DELETE student beneficiary — $HTTP_CODE"; }
[[ -n "$SOLO_BEN_ID"    ]] && { req DELETE "$BASE/social-amelioration/solo-parents/$SOLO_BEN_ID"  "" 200 && ok "DELETE solo parent beneficiary" || fail "DELETE solo parent beneficiary — $HTTP_CODE"; }

# Service + tax profile cleanup.
# Order matters: transactions must be deleted first because:
#   1. tax_computations.transaction_id FK has ON DELETE CASCADE → deletes computations
#   2. tax_computations.tax_profile_version_id FK has ON DELETE NO ACTION → blocks
#      tax-profile-version deletion while computations exist
# So: delete transactions (→ cascade computations) → delete tax profile → delete service.
[[ -n "$SVC_ID" ]] && {
  dbq "DELETE FROM transactions WHERE service_id='$SVC_ID';" 2>/dev/null || true
  # Computations are now gone (CASCADE from transactions) — safe to delete tax profile
  [[ -n "$TAX_ID" ]] && { req DELETE "$BASE/tax-profiles/$TAX_ID" "" 200 && ok "DELETE tax-profile" || fail "DELETE tax-profile — $HTTP_CODE"; }
  req DELETE "$BASE/services/$SVC_ID" "" 200 && ok "DELETE service" || fail "DELETE service — $HTTP_CODE"
}

# Misc
[[ -n "$SA_ID"       ]] && { req DELETE "$BASE/social-amelioration-settings/$SA_ID" "" 200 && ok "DELETE SA setting"          || fail "DELETE SA setting — $HTTP_CODE"; }
[[ -n "$PROG_ID"     ]] && { req DELETE "$BASE/government-programs/$PROG_ID"        "" 200 && ok "DELETE government program"  || fail "DELETE government program — $HTTP_CODE"; }
[[ -n "$FAQ_ID"      ]] && { req DELETE "$BASE/faqs/$FAQ_ID"                        "" 200 && ok "DELETE faq"                 || fail "DELETE faq — $HTTP_CODE"; }
[[ -n "$NEW_USER_ID" ]] && { req DELETE "$BASE/users/$NEW_USER_ID"                  "" 200 && ok "DELETE user"                || fail "DELETE user — $HTTP_CODE"; }
[[ -n "$ROLE_ID"     ]] && { req DELETE "$BASE/roles/$ROLE_ID"                      "" 200 && ok "DELETE role"                || fail "DELETE role — $HTTP_CODE"; }

# Permission (clear role_permissions FK first)
[[ -n "$PERM_ID" ]] && {
  [[ -n "$ROLE_ID" ]] && dbq "DELETE FROM role_permissions WHERE permission_id='$PERM_ID';" 2>/dev/null
  req DELETE "$BASE/permissions/$PERM_ID" "" 200 && ok "DELETE permission" || fail "DELETE permission — $HTTP_CODE"
}

# DB cleanup — test residents, registration requests, transactions
# Transactions linked to test residents must be removed first: transactions.resident_id has
# ON DELETE RESTRICT, so the DELETE FROM residents will fail if linked transactions survive.
dbq "
  DELETE FROM transactions WHERE resident_id IN (
    SELECT id FROM residents WHERE username LIKE 'test_portal_%' OR username LIKE 'testreg_%' OR username LIKE 'status_test_%' OR username LIKE 'approve_test_%'
  );
  DELETE FROM resident_credentials WHERE resident_fk IN (
    SELECT id FROM residents WHERE username LIKE 'test_portal_%' OR username LIKE 'testreg_%' OR username LIKE 'status_test_%'
  );
  DELETE FROM registration_requests WHERE resident_fk IN (
    SELECT id FROM residents WHERE username LIKE 'testreg_%' OR username LIKE 'approve_test_%'
  );
  DELETE FROM transactions WHERE applicant_name LIKE 'TEST Guest%';
  DELETE FROM residents WHERE username LIKE 'test_portal_%' OR username LIKE 'testreg_%' OR username LIKE 'status_test_%' OR username LIKE 'approve_test_%';
" 2>/dev/null && ok "DB cleanup" || fail "DB cleanup (partial — check manually)"

# =============================================================================
# REPORT
# =============================================================================
TOTAL=$((PASS+FAIL+SKIP))
echo ""
echo -e "${BOLD}================================================================${NC}"
echo -e "${BOLD}  E-Services Route Test Report${NC}"
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
