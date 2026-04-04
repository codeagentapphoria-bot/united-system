# BIMS Open API Reference

- Base URL: `/api`
- Authentication: API Key via `x-api-key` header, `Authorization: Bearer <api_key>`, or `api_key` query parameter
- Scope: Read-only, municipality-scoped

## Endpoints

- GET `/openapi/residents` (scope: `residents.read`)
  - Params: `page`, `limit`, `q`
  - Returns residents in authorized municipality with pagination

- GET `/openapi/households` (scope: `households.read`)
  - Params: `page`, `limit`

- GET `/openapi/families` (scope: `families.read`)
  - Params: `page`, `limit`

- GET `/openapi/barangays` (scope: `barangays.read`)
  - Params: `page`, `limit`

- GET `/openapi/statistics` (scope: `statistics.read`)
  - Returns counts for residents (male/female), households, and families

## Response Envelope

```
{
  "success": true,
  "data": {},
  "pagination": { "page": 1, "limit": 20, "total": 0, "pages": 0 }
}
```

## Errors

- 401: Missing/invalid API key
- 403: Forbidden
  - Missing required scope returns: `{ "success": false, "message": "Insufficient permissions" }`
- 429: Rate limit exceeded (per-key, `<rate>/min`)
- 5xx: Server errors

## Notes

- Keys are issued by municipal HR under Admin → Open API.
- Keep keys secure; rotate upon suspicion of compromise.
