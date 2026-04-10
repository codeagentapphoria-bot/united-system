# Unified Database Migration Guide

**Status:** Migration Complete (2026-03-25)

---

## Quick Reference

The unified database migration has been completed. Both BIMS and E-Services now connect to the same PostgreSQL database.

**Canonical documentation:**
- [Migration Plan (united-database/MIGRATION_PLAN.md)](../../united-database/MIGRATION_PLAN.md) — Complete migration documentation
- [Schema (united-database/schema.sql)](../../united-database/schema.sql) — Current v2 schema
- [Seed Data (united-database/seed.sql)](../../united-database/seed.sql) — Initial seed data

---

## Migration Summary

| Phase | Status | Notes |
|-------|--------|-------|
| Schema v1 → v2 | ✅ Complete | Direct schema merge |
| Puroks removed | ✅ Complete | 2-tier address (municipality → barangay) |
| Citizens/Non-citizens → Residents | ✅ Complete | Unified residents table |
| Subscribers → eservice_users | ✅ Complete | Direct portal access |
| Seed data | ✅ Complete | Roles, permissions, services |

---

## Key Changes from v1

### Dropped Tables
- `puroks` — Neighborhood zone lookup table removed
- `citizens` — Replaced by unified `residents`
- `non_citizens` — Replaced by unified `residents`
- `subscribers` — Residents have direct portal access
- `citizen_resident_mapping` — Replaced by `resident_classifications`

### New Architecture
- **2-tier address:** municipality → barangay (no puroks)
- **Unified residents:** Single table for all residents (citizens and non-citizens)
- **Direct portal auth:** Username/password via `eservice_users` table

---

## Setup Commands

```bash
# 1. Apply schema
psql "$DB_URL" -f united-database/schema.sql

# 2. Load seed data
psql "$DB_URL" -f united-database/seed.sql

# 3. Load GIS geometry (Eastern Samar)
psql "$DB_URL" -f united-database/seed_gis.sql

# 4. (Optional) Load BIMS-specific seed
psql "$DB_URL" -f united-database/seed_bims.sql
```

---

## Troubleshooting

**Q: The migration scripts reference tables that don't exist in schema.sql**
A: The migration scripts (01-04) were designed for the transitional migration from v1. They are historical reference only. The current schema is defined in `schema.sql`.

**Q: Where are the fuzzy matching scripts?**
A: Fuzzy matching was used during the v1→v2 migration to link citizens to residents. This is complete and the scripts are historical reference only.

---

*Last updated: 2026-03-25*
