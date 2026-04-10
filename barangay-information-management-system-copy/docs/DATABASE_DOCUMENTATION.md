# Database Documentation

**Status:** Current

---

## v2 Unified Schema

The current database schema is defined in:

**`united-database/schema.sql`** - Canonical v2 schema

### Key Changes from v1

| v1 (Superseded) | v2 (Current) |
|-----------------|--------------|
| Puroks table | 2-tier address (municipality → barangay) |
| Citizens / Non-citizens | Unified `residents` table |
| Subscribers | Direct portal via `eservice_users` |
| `citizen_resident_mapping` | `resident_classifications` |

### Quick Reference

| Table | Purpose |
|-------|---------|
| `municipalities` | Top-level geographic units |
| `barangays` | Second-level units (no puroks) |
| `residents` | All residents (citizens + non-citizens unified) |
| `households` | Households with 2-tier address |
| `resident_classifications` |分类 (senior, PWD, etc.) |

### Documentation

- [UNIFIED_MIGRATION_GUIDE.md](UNIFIED_MIGRATION_GUIDE.md) - Migration overview
- [REPORTS.md](../../REPORTS.md) - Detailed review

*Last updated: 2026-03-25*
