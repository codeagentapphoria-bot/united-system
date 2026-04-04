# Documentation - Borongan Unified System Integration

**Version:** 2.0 - Integration Layer Architecture  
**Updated:** Mar 19, 2026 16:26 UTC  
**Status:** Phase 2 - Integration Service Design (Starting Tomorrow)

---

## 📖 Quick Navigation

### Project Overview
- **[UNIFIED_DB_MIGRATION_V2.md](UNIFIED_DB_MIGRATION_V2.md)** — NEW APPROACH: Integration layer architecture
  - Why we're NOT modifying BIMS/E-Services directly
  - Integration service architecture
  - Complete API design
  - Benefits & timeline

### Phase Documentation
- **Phase 2:** [PHASE_2_INTEGRATION_DESIGN.md](PHASE_2_INTEGRATION_DESIGN.md)
  - 7 design tasks for Marcus
  - Integration service architecture
  - API specifications
  - Database schema planning
  - Fuzzy matching algorithm
  - Offline sync design
  - Conflict resolution strategy
  - Phase 3 implementation roadmap

---

## 🎯 Architecture Overview

```
BIMS Backend (UNCHANGED) ──┐
                           │
E-Services Backend         ├─→ Integration Service (NEW) ──→ Unified Database
(UNCHANGED) ───────────────┤
                           │
Mobile Offline ────────────┘

Why This?
✅ BIMS stays untouched
✅ E-Services stays untouched
✅ Integration tested separately
✅ Easy rollback
✅ Teams work independently
```

---

## 📋 For Each Team Member

### Marcus Thompson (Backend Architect)
**Phase 2:** Integration Service Design (Mar 20-21)

Start here:
1. Read: [UNIFIED_DB_MIGRATION_V2.md](UNIFIED_DB_MIGRATION_V2.md) (overview & architecture)
2. Read: [PHASE_2_INTEGRATION_DESIGN.md](PHASE_2_INTEGRATION_DESIGN.md) (your 7 tasks)
3. Complete 7 design deliverables:
   - Architecture design
   - API specifications
   - Database schema
   - Fuzzy matching algorithm
   - Offline sync design
   - Conflict resolution strategy
   - Phase 3 roadmap

**Branch:** `feature/integration-service-design`  
**Due:** Mar 21, 2026

### Jordan Rivera (QA Lead)
**Phase 4:** Integration Testing (Mar 24-25, parallel with Phase 3)

Start here:
1. Read: [UNIFIED_DB_MIGRATION_V2.md](UNIFIED_DB_MIGRATION_V2.md)
2. Review Phase 3 (once Marcus completes Phase 2)
3. Plan test strategy for:
   - All integration service endpoints
   - Fuzzy matching accuracy
   - Offline sync scenarios
   - Conflict resolution logic
   - Real-time WebSocket events

### Sam Park (DevOps)
**Phase 3 & 5:** Infrastructure & Deployment

Start here:
1. Read: [UNIFIED_DB_MIGRATION_V2.md](UNIFIED_DB_MIGRATION_V2.md)
2. Plan deployment:
   - Integration service tech stack (Node.js + Express)
   - Deployment target (Vercel/Docker)
   - Environment configuration
   - Scaling strategy
   - Monitoring & logging

---

## 🚀 Phase Timeline (REVISED)

| Phase | Duration | Owner | Status |
|-------|----------|-------|--------|
| 1 | Done | Archie + Kim | ✅ Complete |
| 2 | Mar 20-21 | Marcus | ⏳ Starting tomorrow |
| 3 | Mar 22-25 | Marcus + Sam | ⏳ After Phase 2 |
| 4 | Mar 24-25 | Jordan | ⏳ Parallel with Phase 3 |
| 5 | Mar 26+ | Sam + Kim | ⏳ After Phase 4 |

**Go-Live Target:** Mar 26+, 2026

---

## 📊 What Changed (Pivot Summary)

### OLD APPROACH (Direct Migration) ❌
- Modify BIMS backend to use unified DB
- Modify E-Services backend to use unified DB
- High risk, complex coordination

### NEW APPROACH (Integration Layer) ✅
- BIMS backend → UNCHANGED
- E-Services backend → UNCHANGED
- NEW Integration Service → handles unified DB logic
- Low risk, independent teams

---

## 🔗 Key Resources

**GitHub Repository:**
- https://github.com/codeagentapphoria-bot/Borongan-E-Services

**Borongan Unified Database:**
- Project: Borongan Unified System (Supabase)
- URL: https://vcmerzrpegwfebgmhjwh.supabase.co
- Tables: 62 (including citizen_resident_mapping)

**Team Coordination:**
- Standup: Daily 9:00 AM UTC
- Team Sync: See TEAM_SYNC.md
- Blockers: Reach out to Kim (24/7)

---

## 📝 Document Status

| Document | Purpose | Status |
|----------|---------|--------|
| UNIFIED_DB_MIGRATION_V2.md | Project overview & new approach | ✅ Current |
| PHASE_2_INTEGRATION_DESIGN.md | Marcus's 7 Phase 2 tasks | ✅ Current |
| docs/README.md | This navigation guide | ✅ Current |
| .env.unified | Config template | ✅ Kept |

---

## ❓ Need Help?

- **Blockers:** Kim (Team Lead) - 24/7 support
- **Questions:** Slack/Telegram or GitHub Issues
- **Standup:** Daily 9:00 AM UTC

---

**Documentation maintained by:** Kim (Team Lead)  
**Architecture designed by:** Archie (Backend Master)  
**For:** Borongan Unified System Integration Team

---

**Status:** Ready for Phase 2 Kickoff (Mar 20, 2026)
