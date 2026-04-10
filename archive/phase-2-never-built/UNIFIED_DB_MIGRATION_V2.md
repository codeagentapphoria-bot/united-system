# Borongan Unified System - Integration Layer Architecture

**Version:** 2.0 (PIVOT from Direct Migration)  
**Date:** Mar 19, 2026 16:26 UTC  
**Architect:** Archie (recommendation) + Kim (implementation)  
**Status:** Design Phase (Active)

---

## 🎯 New Approach: Integration Layer (NOT Direct Backend Modification)

### Why Integration Layer?

**Problem with Direct Migration:**
- ❌ Modifying working production code (BIMS + E-Services)
- ❌ High risk of breaking both systems
- ❌ Hard to rollback if integration fails
- ❌ Teams must coordinate tightly

**Solution - Integration Layer:**
- ✅ BIMS backend stays UNCHANGED
- ✅ E-Services backend stays UNCHANGED
- ✅ New Integration Service handles unified DB logic
- ✅ Easy to test, deploy, rollback independently
- ✅ Teams work in parallel

---

## 🏗️ Architecture

```
┌─────────────────────────┐
│  BIMS Frontend (React)  │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   BIMS Backend          │
│   (UNCHANGED - still    │
│   uses own database)    │
└────────────┬────────────┘
             │
        API Calls
             │
┌────────────▼──────────────────────────┐
│  INTEGRATION SERVICE (NEW)             │
├────────────────────────────────────────┤
│ • Sync citizen_resident_mapping        │
│ • Self-registration portal             │
│ • Fuzzy matching engine                │
│ • Sync queue processor (mobile)        │
│ • Conflict resolution                  │
│ • WebSocket real-time events           │
└────────────┬──────────────────────────┘
             │
        Unified DB API
             │
┌────────────▼──────────────────────────┐
│  BORONGAN UNIFIED DATABASE (Supabase)  │
│  • citizen_resident_mapping            │
│  • sync_queue (mobile offline)         │
│  • conflict_log (tracking)             │
│  • 62 unified tables                   │
└────────────┬──────────────────────────┘
             │
        API Calls
             │
┌────────────▼──────────────────────────┐
│  E-SERVICES Backend                    │
│  (UNCHANGED - still uses own database) │
└────────────┬──────────────────────────┘
             │
┌────────────▼────────────┐
│ E-Services Frontend      │
│ (React)                 │
└─────────────────────────┘
```

---

## 📊 What Integration Service Does

### Core Responsibilities

1. **Citizen-Resident Mapping** ⭐
   - Links e-Service citizens to BIMS residents
   - Fuzzy matching (98% confidence threshold)
   - Manual override for edge cases
   - Sync with unified database

2. **Self-Registration Portal** 📝
   - New endpoint for citizen self-registration
   - Collects data → stores in unified DB
   - Triggers residency verification workflow
   - Notifies BIMS for resident creation

3. **Offline Sync (Mobile)** 📱
   - Processes sync_queue from mobile clients
   - Handles offline transactions, data entry
   - Conflict detection & resolution
   - Real-time sync when connection returns

4. **Fuzzy Matching Engine** 🔍
   - Background job (daily)
   - Links citizens to residents automatically
   - 98% confidence threshold
   - Manual review for mismatches

5. **Conflict Resolution** ⚖️
   - Tracks conflicts in conflict_log
   - Automated resolution rules
   - Manual intervention when needed
   - Audit trail of resolutions

6. **Real-Time Events** ⚡
   - WebSocket: Resident verified → Notify citizen
   - WebSocket: Transaction approved → Notify officer
   - Cron: Nightly reconciliation
   - Cron: Data validation

---

## 🔄 Data Flow Examples

### Example 1: Citizen Self-Registration

```
1. Citizen uses E-Services Mobile App
   ↓
2. Clicks "Register" → Integration Service portal
   ↓
3. Fills form → Sends to Integration Service
   ↓
4. Integration Service:
   - Stores in unified DB
   - Runs fuzzy match (find matching residents)
   - Creates citizen_resident_mapping
   ↓
5. Sends residency verification request to BIMS
   ↓
6. BIMS officer approves in BIMS system
   ↓
7. BIMS updates resident status
   ↓
8. Integration Service notifies citizen via WebSocket
   ↓
9. Citizen can now access full E-Services
```

### Example 2: Mobile Offline Sync

```
1. Citizen offline → Makes transaction in E-Services mobile
   ↓
2. Mobile app queues in local sync_queue
   ↓
3. Connection returns → Syncs to Integration Service
   ↓
4. Integration Service:
   - Validates transaction (no conflicts)
   - Stores in unified DB
   - Notifies E-Services backend
   ↓
5. E-Services backend records transaction
   ↓
6. Integration Service marks sync_queue as "SYNCED"
   ↓
7. Mobile app acknowledges
```

### Example 3: Conflict Resolution

```
1. Citizen updates phone in BIMS
2. Same citizen updates phone in E-Services (both offline)
   ↓
3. When both sync → Conflict detected
   ↓
4. Integration Service:
   - Logs conflict in conflict_log
   - Applies conflict resolution rule
   - Keeps BIMS version (BIMS = source of truth)
   ↓
5. Notifies E-Services to update with BIMS value
   ↓
6. Marks conflict as "RESOLVED - AUTO"
```

---

## 🛠️ Integration Service Stack

**Recommended Tech:**
- **Language:** Node.js (same as BIMS/E-Services)
- **Framework:** Express.js + TypeScript
- **Database:** Supabase (unified DB)
- **Real-time:** Socket.io (WebSocket)
- **Background Jobs:** Bull (job queue)
- **Matching:** FuzzyWuzzy.js (fuzzy matching)
- **Deployment:** Vercel or Docker

**Why:**
- Same tech stack as existing backends
- Easy for team to maintain
- Compatible with existing services
- Proven for this type of work

---

## 📋 Integration Service Endpoints

### Self-Registration

```
POST /api/register/individual
├─ Input: citizen data (name, phone, email, address, etc.)
├─ Process: fuzzy match, create mapping, send to BIMS
└─ Output: registration_id, verification_status

POST /api/register/household
├─ Input: household head + members data
├─ Process: batch registration, family relationships
└─ Output: household_id, member registration IDs

GET /api/registration/:id/status
├─ Input: registration_id
└─ Output: status (PENDING, VERIFIED, REJECTED)
```

### Citizen-Resident Linking

```
GET /api/citizen-resident-mapping/:citizen_id
├─ Output: resident_id, mapping_score, status

POST /api/citizen-resident-mapping/fuzzy-match
├─ Input: citizen data
├─ Process: run fuzzy matching
└─ Output: top 5 matching residents (with scores)

POST /api/citizen-resident-mapping/manual-link
├─ Input: citizen_id, resident_id
├─ Process: create mapping, verify
└─ Output: mapping_id, created_at
```

### Offline Sync

```
POST /api/sync/upload
├─ Input: queued transactions (from mobile)
├─ Process: validate, check conflicts, store
└─ Output: sync_ids, status (SYNCED or CONFLICTED)

POST /api/sync/download
├─ Input: last_sync_timestamp
├─ Process: fetch changes since timestamp
└─ Output: updated records, deletions

GET /api/sync/status
├─ Output: last_sync_time, pending_count, conflicts_count
```

### Conflict Resolution

```
GET /api/conflicts
├─ Query: status (PENDING, AUTO, MANUAL)
└─ Output: list of conflicts with details

POST /api/conflicts/:id/resolve
├─ Input: resolution_type (MANUAL, AUTO), chosen_value
├─ Process: apply resolution, log decision
└─ Output: conflict resolved, notifications sent

GET /api/conflicts/:id/history
├─ Output: resolution audit trail
```

### Real-Time Events

```
WebSocket: /socket
├─ Event: "citizen:verified" → Notify citizen registration complete
├─ Event: "transaction:approved" → Notify officer action done
├─ Event: "conflict:detected" → Alert admin to conflict
└─ Event: "sync:complete" → Notify mobile sync done
```

---

## 🔐 Data Security & Permissions

**Access Control:**
- Integration Service uses Supabase service_role_key (server-side only)
- BIMS backend: Access via integration service API (not direct DB)
- E-Services backend: Access via integration service API (not direct DB)
- Citizens: Access via E-Services frontend (authenticated)
- Officers: Access via BIMS frontend (authenticated)

**Data Ownership:**
- BIMS owns: resident records (source of truth)
- E-Services owns: transaction, service records
- Unified DB: citizen_resident_mapping, sync_queue, conflict_log

---

## 📅 Phases (REVISED)

### Phase 1: Setup ✅ (DONE)
- Unified DB created by Archie
- Borongan-E-Services repo created
- Checkpoint set

### Phase 2: Integration Service Design (NEW)
- **Duration:** Mar 20-21 (2 days)
- **Owner:** Marcus (backend architect)
- **Tasks:**
  1. Design integration service architecture
  2. Define all API endpoints
  3. Plan database schema for mappings
  4. Design fuzzy matching algorithm
  5. Plan sync queue processing
  6. Design conflict resolution rules
  7. Create implementation roadmap

### Phase 3: Integration Service Development
- **Duration:** Mar 22-25 (4 days)
- **Owner:** Marcus + Sam
- **Tasks:**
  1. Build integration service (Node.js + Express)
  2. Implement all endpoints
  3. Set up Supabase integration
  4. Build fuzzy matching
  5. Implement sync queue processor
  6. Add WebSocket real-time events
  7. Deploy to staging

### Phase 4: Integration Testing
- **Duration:** Mar 24-25 (parallel with Phase 3)
- **Owner:** Jordan (QA)
- **Tasks:**
  1. Test all integration service endpoints
  2. Test fuzzy matching accuracy
  3. Test conflict resolution logic
  4. Test offline sync scenarios
  5. Test real-time events
  6. Integration with BIMS backend
  7. Integration with E-Services backend

### Phase 5: Go-Live
- **Duration:** Mar 26+ 
- **Owner:** Sam + Kim
- **Tasks:**
  1. Deploy to production
  2. Monitor integration service
  3. Monitor data sync
  4. Handle rollback if needed

---

## 📊 Benefits of Integration Layer

| Aspect | Direct Migration | Integration Layer |
|--------|------------------|-------------------|
| **Risk** | HIGH ⚠️ | LOW ✅ |
| **BIMS Changes** | Major refactor | Zero changes ✅ |
| **E-Services Changes** | Major refactor | Zero changes ✅ |
| **Testing** | Complex (integrated) | Simple (isolated) ✅ |
| **Rollback** | Hard (in production) | Easy (disable service) ✅ |
| **Team Independence** | Limited | Full ✅ |
| **Timeline** | 2-3 weeks | 1-2 weeks ✅ |
| **Production Stability** | Risk both systems | Only new service ✅ |

---

## 🎯 Success Criteria

Integration layer is complete when:
1. ✅ All endpoints tested & working
2. ✅ Fuzzy matching accuracy > 95%
3. ✅ Offline sync working seamlessly
4. ✅ Conflict resolution automated & audited
5. ✅ Real-time WebSocket events live
6. ✅ BIMS + E-Services unaffected
7. ✅ Data integrity verified
8. ✅ Go-live approved

---

## 📝 Next Steps

**Tomorrow (Mar 20):**
1. Announce pivot to team (standup)
2. Marcus starts Phase 2 (integration service design)
3. Get detailed requirements from Archie
4. Update documentation

**Mar 21:**
- Phase 2 design complete
- Marcus ready for Phase 3 coding

**Mar 22:**
- Phase 3 development starts
- Jordan begins parallel testing

**Mar 26+:**
- Go-live with integration service

---

## 🔗 References

**Archie's Recommendation:**
- Integration layer approach (safer, cleaner)
- Microservice pattern
- Keep BIMS/E-Services untouched

**Unified Database:**
- Borongan Unified System (Supabase)
- 62 tables
- citizen_resident_mapping (key table)
- sync_queue, conflict_log

---

**Document Version:** 2.0  
**Status:** Ready for Phase 2 Implementation  
**Team:** Borongan Unified System Integration
