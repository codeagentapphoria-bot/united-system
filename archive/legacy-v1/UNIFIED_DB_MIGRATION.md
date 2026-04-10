# Borongan E-Services → Unified Database Migration

**Project:** Borongan E-Services Integration with Unified Database  
**Created:** Mar 19, 2026 15:27 UTC  
**Status:** ✅ Phase 1 Complete - Setup & Checkpoint  
**Team Lead:** Kim  
**Head:** Eugene (iannnn)

---

## 🎯 Mission

Migrate Borongan E-Services backend from its own PostgreSQL database to the **Borongan Unified System** Supabase project, enabling:
- Single database for BOTH BIMS + E-Services
- Unified citizen-resident mapping
- Shared data ownership rules
- Cross-system data access

---

## ✅ Phase 1 - Setup & Safety (COMPLETE)

**Date:** Mar 19, 2026 15:27 UTC

### Deliverables

1. **New Repository Created** ✅
   - Name: `Borongan-E-Services`
   - Account: codeagentapphoria-bot
   - URL: https://github.com/codeagentapphoria-bot/Borongan-E-Services
   - Type: Private
   - Source: Mirrored from Borongan-Database (full history preserved)

2. **Checkpoint Created** ✅
   - Tag: `checkpoint/unified-db-start`
   - Purpose: Safe revert point before DB integration
   - Command to revert: `git reset --hard checkpoint/unified-db-start`

3. **Baseline State Documented** ✅
   - **Current Stack:**
     - Frontend: React 19 + TypeScript
     - Backend: Node.js + Express + Prisma ORM
     - Database: PostgreSQL (old Borongan-Database)
   
   - **Current Structure:**
     ```
     multysis-backend/
       - src/controllers, services, routes
       - prisma/schema.prisma (OLD SCHEMA)
       - .env (uses old DB connection)
     
     multysis-frontend/
       - React 19 + TypeScript
       - Vite bundler
     ```

---

## 📋 Phase 2 - Analysis (NEXT)

**Goals:**
- [ ] Map old E-Services schema → unified schema
- [ ] Identify breaking changes
- [ ] Create migration checklist
- [ ] Review Prisma/ORM changes needed
- [ ] Document API endpoint changes

**Tasks:**
1. List all old E-Services tables & fields
2. Map to unified schema (62 tables)
3. Identify missing/extra fields
4. Plan Prisma schema update
5. Plan API response changes

**Owner:** Marcus (Backend Dev) + Kim (Lead)  
**Estimate:** 8-12 hours

---

## 🔧 Phase 3 - Implementation (TBD)

**Goals:**
- [ ] Update `.env` & connection strings
- [ ] Update Prisma schema
- [ ] Update API endpoints
- [ ] Local testing

**Scope:**
- Database connection → Unified Supabase
- Prisma models → Unified schema
- API endpoints → New table mappings
- Error handling → New conflict/sync patterns

**Owner:** Marcus (Backend) + Sam (DevOps)  
**Estimate:** 20-30 hours
**Testing:** Local + staging

---

## 🚀 Phase 4 - Integration & Validation (TBD)

**Goals:**
- [ ] Test E-Services with unified DB
- [ ] Verify data access & permissions
- [ ] Run integration tests with BIMS
- [ ] Deploy to staging

**Owner:** Jordan (QA) + Sam (DevOps)  
**Estimate:** 12-16 hours

---

## 📊 Unified Database Info

**Project:** Borongan Unified System  
**URL:** https://vcmerzrpegwfebgmhjwh.supabase.co  
**Tables:** 62  
**Status:** ✅ Schema ready (created by Archie on Mar 19)

**Key Tables for E-Services:**
- `citizens` (unified)
- `citizen_resident_mapping` (NEW - links to residents)
- `transactions`, `services`, `appointments`
- `permissions`, `user_roles`, `users`
- `conflict_log`, `sync_queue` (for offline sync)

---

## 🔄 Revert Procedure

If issues occur, revert to checkpoint:

```bash
# Option 1: Soft reset (keep changes in staging)
git reset --soft checkpoint/unified-db-start

# Option 2: Hard reset (discard all changes)
git reset --hard checkpoint/unified-db-start

# Push to remote
git push origin main --force
```

---

## 📝 Team Communication

**Slack/Telegram Updates:**
- Phase 2 start: "Analysis phase starting for E-Services migration"
- Phase 2 end: "Migration plan ready - 42 schema changes identified"
- Phase 3 start: "Backend modifications begin"
- Phase 4 end: "E-Services live on unified DB"

**Risk Flags:**
- ⚠️ Data conflicts during mapping
- ⚠️ API response format changes
- ⚠️ Permission/authorization logic
- ⚠️ Offline sync queue integration

---

## 🎓 Learning Objectives

**For Marcus (Backend):**
- Prisma schema migration patterns
- Data mapping strategies
- Unified DB design principles

**For Sam (DevOps):**
- Zero-downtime migration strategies
- Database connection pooling
- Supabase infrastructure

**For Jordan (QA):**
- Integration testing with unified DB
- Data integrity verification
- Cross-system testing (BIMS ↔ E-Services)

---

## ✅ Success Criteria

Migration is complete when:
1. ✅ E-Services backend connects to unified Supabase
2. ✅ All old API endpoints map to new schema
3. ✅ Data integrity verified (sample records checked)
4. ✅ Integration tests pass (E-Services ↔ BIMS)
5. ✅ No data loss during migration
6. ✅ Performance acceptable (query times < 500ms)
7. ✅ Documentation updated
8. ✅ Team trained on new architecture

---

**Next Step:** Notify team → Begin Phase 2 Analysis  
**Checkpoint Safe?** ✅ Yes - all history preserved, revert possible anytime
