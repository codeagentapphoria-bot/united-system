# Developer Portal Redesign Spec

## Goal

Redesign `DeveloperPortal.jsx` from a flat vertical-stack layout to a two-panel left-sidebar + scrollable-content layout, fix stale/incorrect documentation (remove the `Authorization: Bearer` auth method, correct the base URL), add missing scopes documentation, and drop Python code examples in favor of curl + JavaScript fetch only.

---

## Decisions Made

| Question | Decision |
|---|---|
| Layout | Left sidebar nav (sticky, `h-screen`) + scrollable right content |
| Theme | Light — white background, slate-50 sidebar, blue-600 accents (matches BIMS admin UI) |
| Try It placement | Dedicated sidebar section at the bottom of the nav |
| Code examples | curl + JavaScript fetch (Python removed) |
| Implementation | Single component full rewrite — `DeveloperPortal.jsx` |

---

## Architecture

Single component: `client/src/pages/public/DeveloperPortal.jsx` — complete rewrite of the existing file.

Two-panel flex layout:
- **Left sidebar** (`w-60`, sticky, `h-screen overflow-y-auto`): BIMS API title, two nav groups (GUIDES, ENDPOINTS), and a TRY IT link at the bottom.
- **Right content** (`flex-1 overflow-y-auto`): `<section id="...">` blocks that sidebar anchor links scroll to.

Active section tracking via `IntersectionObserver`: watches each section's heading element; when a section enters the viewport the corresponding sidebar link gets a blue left border + blue text.

Existing Shadcn primitives (Card, Input, Button, Tabs, Label, useToast) are retained where they fit. No new dependencies.

---

## Sidebar Navigation Structure

```
BIMS API
─────────────
GUIDES
  Overview
  Authentication
  Rate Limits
  Scopes
  Error Codes
─────────────
ENDPOINTS
  GET /residents
  GET /households
  GET /families
  GET /barangays
  GET /statistics
─────────────
  Try It
```

Each entry is an `<a href="#section-id">` anchor. The active link shows `border-l-2 border-blue-600 text-blue-600 bg-blue-50`.

---

## Content Sections

### Overview
- What the API is: read-only REST API for accessing BIMS population data
- Base URL: `https://<your-domain>/api/openapi` (corrected from the stale `/api`)
- Quickstart: 3 steps — generate key (Admin → Municipality → Open API) → authenticate → fetch

### Authentication
Two supported methods only — the `Authorization: Bearer` method is **removed** (it is not supported and was misleading):

```
X-API-KEY: <your_api_key>
```
```
GET /api/openapi/residents?api_key=<your_api_key>
```

Note: Keys are municipality-scoped, read-only, and may carry expiration and rate limits.

### Rate Limits
- Default: 60 requests/minute per key
- On 429: `Retry-After` response header may indicate seconds to wait
- Higher limits available on request to municipal admin

### Scopes
Table mapping each endpoint to its required scope:

| Endpoint | Required Scope |
|---|---|
| GET /residents | `residents.read` |
| GET /households | `households.read` |
| GET /families | `families.read` |
| GET /barangays | `barangays.read` |
| GET /statistics | `statistics.read` |

API keys are provisioned with specific scopes. A 403 response means the key lacks the required scope.

### Error Codes

| Code | Meaning |
|---|---|
| 401 | Missing or invalid API key |
| 403 | Key revoked or lacks required scope |
| 429 | Rate limit exceeded — check `Retry-After` header |

### Endpoints (×5)

Each endpoint gets its own `<section id="ep-{name}">` with:
- Method badge (`GET` in blue)
- Full path: `GET /api/openapi/{resource}`
- Short description
- **Query Parameters** table: name, type, required/optional, notes
- **Response Schema**: formatted JSON block
- **Code Examples**: Tabs with `curl` and `JavaScript` (no Python)

#### GET /residents
- Params: `page` (int, optional), `limit` (int, optional), `q` (string, optional — resident ID partial match)
- Scope: `residents.read`
- Response: `{ success, data: [...], pagination: { page, limit, total, pages } }`
- Response fields: `id`, `first_name`, `last_name`, `middle_name`, `sex`, `civil_status`, `birthdate`, `email`, `contact_number`, `occupation`, `status`, `barangay_id`

#### GET /households
- Params: `page`, `limit`
- Scope: `households.read`
- Response fields: `id`, `house_number`, `street`, `barangay_id`, `house_head`, `housing_type`, `structure_type`

#### GET /families
- Params: `page`, `limit`
- Scope: `families.read`
- Response fields: `id`, `household_id`, `family_group`, `family_head`

#### GET /barangays
- Params: `page`, `limit`
- Scope: `barangays.read`
- Response fields: `id`, `barangay_name`, `barangay_code`, `contact_number`, `email`

#### GET /statistics
- Params: none
- Scope: `statistics.read`
- Response: `{ success, data: { residents: { total, male, female }, households: { total }, families: { total } } }`

### Try It (dedicated section)

At the bottom of the sidebar and as the final content section:
- Endpoint dropdown (all 5 endpoints)
- Dynamic param fields: `page` and `limit` for all; `q` (resident ID) shown only when `/residents` selected
- API key input with "Save" button (persists to `sessionStorage` under `devPortalApiKey`)
- "Send" button triggers fetch with `X-API-KEY` header
- Response display: read-only textarea showing formatted JSON
- Status line: HTTP status code + `Retry-After` if present on 429

---

## Response Contract (inline note in Overview)

All endpoints return a standard envelope:
```json
{ "success": true, "data": [...], "pagination": { ... } }
```
Errors return HTTP status + `{ "success": false, "message": "..." }`.

---

## What Does NOT Change

- `sessionStorage` for API key (already correct after the security fix)
- The `EX_BASE` dynamic origin computation
- Shadcn component imports (Card, Input, Button, Tabs, Label, useToast, Check icon)
- The actual fetch logic in `runTry`
- Route: `DeveloperPortal.jsx` stays at the same file path and router path

---

## What Changes (Summary)

| Change | Detail |
|---|---|
| Layout | Flat stack → two-panel left sidebar |
| Base URL copy | `/api` → `/api/openapi` |
| Auth docs | Remove `Authorization: Bearer` snippet |
| Scopes | New section added |
| Code examples | Remove Python tab, keep curl + JS |
| Try It | Stays at bottom, now has its own sidebar nav entry |
| Active nav | IntersectionObserver highlights current section |
