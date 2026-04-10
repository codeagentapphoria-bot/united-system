# GIS Code Migration Guide

**Status:** Historical - Superseded by Unified Database

---

## GIS Migration Complete

The GIS setup is now part of the unified database setup process.

### Current Setup

GIS geometry data is loaded via:

```bash
psql "$DB_URL" -f united-database/seed_gis.sql
```

This loads Eastern Samar municipality and barangay geometries.

### For Different Province

See [DEPLOYMENT.md](../../DEPLOYMENT.md) for instructions on generating new GIS data for other provinces.

### Historical Reference

The GIS code migration (adding `gis_code` to municipalities) was a v1 migration step. This is now part of the standard setup process documented in the deployment guide.

*Last updated: 2026-03-25*
