# Phase 2 - Integration Service Design & Architecture

**Start Date:** Mar 20, 2026  
**Owner:** Marcus Thompson (Backend Architect)  
**Branch:** `feature/integration-service-design`  
**Estimate:** 16-20 hours (2 days focused)  
**Target Completion:** Mar 21, 2026

---

## 🎯 Phase 2 Goals

1. ✅ Design integration service architecture
2. ✅ Define all API endpoints (detailed specs)
3. ✅ Plan database schema for unified DB integration
4. ✅ Design fuzzy matching algorithm
5. ✅ Plan sync queue processing logic
6. ✅ Design conflict resolution strategy
7. ✅ Create Phase 3 implementation roadmap

---

## 📋 Task 1: Integration Service Architecture Design

**Objective:** Define how integration service fits into ecosystem

**What to do:**
- [ ] Review Archie's recommendation (integration layer vs direct)
- [ ] Design service boundaries:
  - What belongs in integration service?
  - What stays in BIMS/E-Services?
  - What goes in unified DB?
- [ ] Create architecture diagram (ASCII or visual)
- [ ] Define service dependencies:
  - BIMS backend API
  - E-Services backend API
  - Unified DB (Supabase)
  - Mobile app
- [ ] Define tech stack (Node.js, Express, Socket.io, Bull, etc.)
- [ ] Plan deployment model (microservice, Docker, Vercel, etc.)

**Deliverable:** `01_INTEGRATION_ARCHITECTURE.md` with:
- Architecture diagram
- Service boundaries
- Tech stack decision (with rationale)
- Deployment model
- Scaling considerations

**Owner:** Marcus  
**Estimate:** 4 hours  
**Acceptance Criteria:**
- [ ] Architecture clear to all team members
- [ ] Tech stack justified
- [ ] Deployment path defined
- [ ] No gaps or ambiguities

---

## 🔌 Task 2: API Endpoint Specification

**Objective:** Design all endpoints for integration service

**What to do:**
- [ ] List all integration points:
  - Self-registration (individual + household)
  - Citizen-resident mapping
  - Offline sync (upload/download)
  - Conflict resolution
  - Real-time events
- [ ] For each endpoint, document:
  - HTTP method (GET/POST/PUT/DELETE)
  - URL path
  - Request body (JSON schema)
  - Response body (JSON schema)
  - Error codes & handling
  - Authentication/authorization
  - Rate limits
  - Example requests/responses

**Deliverable:** `02_API_SPECIFICATIONS.md` with:
```
Endpoint: POST /api/register/individual
├─ Description: Self-register citizen
├─ Request: { name, phone, email, address, ... }
├─ Response: { registration_id, status, mapping_id? }
├─ Errors: { code, message }
├─ Auth: Bearer token (citizen)
└─ Example: POST request + response
```

**Owner:** Marcus  
**Estimate:** 6 hours  
**Acceptance Criteria:**
- [ ] All endpoints documented
- [ ] Request/response examples provided
- [ ] Error cases handled
- [ ] Authentication clear
- [ ] Ready for implementation

---

## 🗄️ Task 3: Database Schema Planning

**Objective:** Plan tables & relations in unified DB

**What to do:**
- [ ] Review Archie's 62 unified tables
- [ ] Identify which tables integration service uses
- [ ] For each key table, document:
  - Table name
  - Columns (name, type, constraints)
  - Relationships
  - Indexes needed
  - Example queries integration service will run
- [ ] Plan new tables (if any):
  - citizen_resident_mapping (probably already exists)
  - sync_queue (for offline sync)
  - conflict_log (for conflict tracking)
  - registration_tracking (for self-registration workflow)
- [ ] Design queries:
  - Fuzzy match query
  - Conflict detection query
  - Sync queue processing query
  - Conflict resolution query

**Deliverable:** `03_DATABASE_SCHEMA.md` with:
```
Table: citizen_resident_mapping
├─ Columns: id, citizen_id, resident_id, confidence_score, status, created_at, updated_at
├─ Relationships: FK citizen_id → citizens.id, FK resident_id → residents.id
├─ Indexes: (citizen_id), (resident_id), (status)
├─ Example queries: [list top 10 pending mappings, get mapping for citizen X, etc.]
└─ Notes: Critical table for linking systems
```

**Owner:** Marcus  
**Estimate:** 4 hours  
**Acceptance Criteria:**
- [ ] All tables documented
- [ ] Relationships clear
- [ ] Indexes planned
- [ ] Example queries provided
- [ ] Integration service data needs clear

---

## 🔍 Task 4: Fuzzy Matching Algorithm Design

**Objective:** Design citizen-resident matching logic

**What to do:**
- [ ] Research fuzzy matching algorithms:
  - Levenshtein distance (string similarity)
  - Phonetic matching (names sound similar)
  - Semantic matching (context awareness)
- [ ] Design scoring system:
  - First name match weight (%)
  - Last name match weight (%)
  - Date of birth match weight (%)
  - Address similarity weight (%)
  - Email/phone match weight (%)
  - Total confidence threshold (98%?)
- [ ] Handle edge cases:
  - Duplicate residents
  - Name variations (Jose → Jo)
  - Spelling errors
  - Missing fields
  - Multiple matches
- [ ] Plan manual override flow:
  - When to escalate to admin
  - Audit trail for manual links
  - Notification workflow
- [ ] Performance considerations:
  - Background job (daily batch)
  - Real-time matching for registrations
  - Database indexing for speed

**Deliverable:** `04_FUZZY_MATCHING_ALGORITHM.md` with:
```
Matching Algorithm

Inputs:
├─ Citizen: { first_name, last_name, date_of_birth, address, email, phone }
└─ Residents: [list of all residents]

Scoring:
├─ first_name_score: Levenshtein(citizen.first_name, resident.first_name) * 25%
├─ last_name_score: Levenshtein(citizen.last_name, resident.last_name) * 25%
├─ dob_score: (dob match?) * 20%
├─ address_score: Levenshtein(address, resident.address) * 15%
├─ contact_score: (email or phone match?) * 15%
└─ total_score = sum of all scores

Threshold:
├─ > 98%: Auto-link with high confidence
├─ 85-98%: Suggest top 5 matches to admin
└─ < 85%: Flag as manual review needed

Edge Cases:
├─ Tie scores: Return all tied matches
├─ No matches: Create new resident suggestion
├─ Duplicate residents: Flag for data cleanup
└─ Missing fields: Use available fields only
```

**Owner:** Marcus  
**Estimate:** 4 hours  
**Acceptance Criteria:**
- [ ] Scoring system documented
- [ ] Edge cases handled
- [ ] Threshold justification clear
- [ ] Performance strategy defined
- [ ] Ready for implementation

---

## 📱 Task 5: Offline Sync Queue Design

**Objective:** Design mobile offline synchronization

**What to do:**
- [ ] Understand mobile offline flow:
  - Mobile app makes transaction offline
  - Queues locally on device
  - When connection returns, syncs to server
  - Conflict detection & resolution
- [ ] Design sync_queue table:
  - What data to store? (entire transaction or just ID?)
  - How to detect conflicts? (version numbers? timestamps?)
  - How to mark as synced?
  - How to handle failures?
- [ ] Design sync process:
  - Mobile uploads queue → integration service
  - Integration service validates each item
  - Conflict detection (same record edited in BIMS)
  - Conflict resolution (which wins? BIMS or mobile?)
  - Marks as SYNCED or CONFLICTED
  - Mobile app downloads resolved data
- [ ] Plan retry logic:
  - Failed syncs: retry 3x with exponential backoff
  - Network error handling
  - Partial sync handling (some succeed, some fail)
- [ ] Data consistency:
  - Transactional sync (all or nothing?)
  - Or partial sync (some items sync, some don't)?
  - Orphaned data handling

**Deliverable:** `05_OFFLINE_SYNC_DESIGN.md` with:
```
Offline Sync Flow

1. Mobile Offline:
   ├─ User makes transaction offline
   ├─ App queues locally (SQLite)
   └─ Shows "syncing..." indicator

2. Connection Returns:
   ├─ Mobile → POST /api/sync/upload
   ├─ Sends queued transactions
   └─ integration service validates each

3. Conflict Detection:
   ├─ Check if record modified in BIMS since last sync
   ├─ If modified: log conflict
   └─ If not: proceed to store

4. Resolution:
   ├─ Auto: Apply rule (BIMS wins)
   ├─ Manual: Notify admin for decision
   └─ Log in conflict_log

5. Mobile Download:
   ├─ Mobile → GET /api/sync/download?since=timestamp
   ├─ integration service sends updated records
   └─ Mobile merges locally

Conflict Resolution Rules:
├─ Address change: BIMS wins (resident address is source of truth)
├─ Phone change: Last-write-wins (newer timestamp)
├─ Transaction status: BIMS wins (officer approval is final)
├─ Benefit data: BIMS wins (official records)
└─ Custom: Flag for manual review
```

**Owner:** Marcus  
**Estimate:** 4 hours  
**Acceptance Criteria:**
- [ ] Offline flow documented
- [ ] Conflict detection strategy clear
- [ ] Resolution rules defined
- [ ] Retry logic planned
- [ ] Data consistency guaranteed

---

## ⚖️ Task 6: Conflict Resolution Strategy

**Objective:** Design how integration handles data conflicts

**What to do:**
- [ ] Define conflict scenarios:
  - Same field edited in both BIMS and E-Services simultaneously
  - Mobile offline edit conflicts with BIMS edit
  - Duplicate citizen/resident records
  - Missing or inconsistent data
- [ ] Design conflict_log table:
  - What conflicts to log?
  - How to identify conflict uniquely?
  - How to track resolution?
  - Audit trail requirements
- [ ] Create resolution rules:
  - Which system is source of truth? (BIMS for residents, E-Services for transactions)
  - Last-write-wins vs first-write-wins
  - Manual review criteria
  - Admin notification workflow
- [ ] Plan manual resolution:
  - How does admin see conflicts?
  - How does admin choose resolution?
  - How is decision recorded?
  - How are stakeholders notified?
- [ ] Logging & monitoring:
  - Which conflicts to alert on?
  - Which to log silently?
  - Metrics to track (conflict rate, resolution time, etc.)

**Deliverable:** `06_CONFLICT_RESOLUTION_STRATEGY.md` with:
```
Conflict Resolution Framework

Conflict Types:
1. Field Mismatch
   ├─ Same field, different values in BIMS vs E-Services
   ├─ Example: Citizen updates phone in E-Services, BIMS has different number
   └─ Resolution: BIMS wins (official record)

2. Duplicate Records
   ├─ Same person registered in BIMS + as E-Services citizen
   ├─ Example: Resident + self-registered citizen (same person)
   └─ Resolution: Create citizen_resident_mapping, merge

3. Missing Data
   ├─ Field in BIMS but missing in E-Services (or vice versa)
   ├─ Example: BIMS has phone, E-Services has null
   └─ Resolution: Propagate from source to other

4. Transaction Conflicts
   ├─ Same transaction edited in E-Services + offline mobile
   ├─ Example: Mobile adds amount offline, E-Services approves different amount
   └─ Resolution: BIMS approved amount wins

Resolution Workflow:
1. Conflict detected → log in conflict_log
2. Evaluate auto-resolution rules
3. If rule applies → auto-resolve + log "AUTO"
4. If no rule → flag for manual + notify admin
5. Admin reviews → chooses resolution
6. Log decision + notify stakeholders
7. Mark conflict as "RESOLVED - MANUAL"
8. Sync resolved data back to systems

Metrics:
├─ Conflicts detected (daily)
├─ Auto-resolved (%)
├─ Manual resolution time (average hours)
├─ Escalation rate (%)
└─ Resolution success rate (%)
```

**Owner:** Marcus  
**Estimate:** 3 hours  
**Acceptance Criteria:**
- [ ] All conflict types identified
- [ ] Resolution rules defined
- [ ] Manual workflow documented
- [ ] Logging strategy clear
- [ ] Ready for implementation

---

## 🗺️ Task 7: Phase 3 Implementation Roadmap

**Objective:** Create detailed plan for Phase 3 coding

**What to do:**
- [ ] Break Phase 3 into tasks:
  - Set up project structure
  - Implement endpoints (batch)
  - Implement fuzzy matching
  - Implement sync queue processor
  - Implement conflict resolution
  - Add WebSocket real-time
  - Testing
- [ ] For each task:
  - Time estimate
  - Dependencies (what must be done first)
  - Tech requirements (libraries, tools)
  - Testing strategy
  - Acceptance criteria
- [ ] Create implementation order
- [ ] Identify blockers/risks
- [ ] Plan daily milestones (Mar 22-25)

**Deliverable:** `07_PHASE_3_IMPLEMENTATION_ROADMAP.md` with:
```
Phase 3 Implementation Plan (Mar 22-25)

Week 1 - Mar 22-23 (Foundations):
├─ Mon: Project setup + API scaffolding (8 hours)
├─ Tue: Core endpoints (register, mapping) (8 hours)
└─ Blockers: Supabase schema finalization

Week 2 - Mar 24-25 (Advanced):
├─ Wed: Fuzzy matching + sync queue (8 hours)
├─ Thu: Conflict resolution + WebSocket (8 hours)
└─ Tests: Run integration tests (parallel)

Milestones:
├─ Mar 22 EOD: Project structure + 3 endpoints working
├─ Mar 23 EOD: All endpoints complete
├─ Mar 24 EOD: Fuzzy matching working
├─ Mar 25 EOD: All features complete + tested
└─ Mar 26: Deploy to staging

Time Budget:
├─ Phase 3 coding: 32 hours (Marcus)
├─ Phase 4 testing: 16 hours (Jordan, parallel)
├─ Phase 5 deployment: 4 hours (Sam)
└─ Total: 52 hours
```

**Owner:** Marcus  
**Estimate:** 2 hours  
**Acceptance Criteria:**
- [ ] All Phase 3 tasks listed
- [ ] Time estimates realistic
- [ ] Dependencies clear
- [ ] Risks identified
- [ ] Daily milestones defined

---

## 📊 Deliverables Summary

| Task | Deliverable | Owner | Estimate |
|------|-------------|-------|----------|
| 1 | INTEGRATION_ARCHITECTURE.md | Marcus | 4h |
| 2 | API_SPECIFICATIONS.md | Marcus | 6h |
| 3 | DATABASE_SCHEMA.md | Marcus | 4h |
| 4 | FUZZY_MATCHING_ALGORITHM.md | Marcus | 4h |
| 5 | OFFLINE_SYNC_DESIGN.md | Marcus | 4h |
| 6 | CONFLICT_RESOLUTION_STRATEGY.md | Marcus | 3h |
| 7 | PHASE_3_IMPLEMENTATION_ROADMAP.md | Marcus | 2h |
| - | PR with all 7 docs | Marcus | - |

**Total Estimate:** 27 hours → 16-20 focused hours (2 days)

---

## 🚀 Phase 2 Workflow

1. **Marcus** clones repo & checks out `feature/integration-service-design`
2. **Marcus** completes 7 tasks (one doc per task)
3. **Marcus** commits regularly:
   ```bash
   git add docs/01_INTEGRATION_ARCHITECTURE.md
   git commit -m "docs: Add integration service architecture"
   git push origin feature/integration-service-design
   ```
4. **Kim** reviews work in progress (can comment on commits)
5. **Marcus** completes all 7 tasks by end of Mar 21
6. **Marcus** opens PR from `feature/integration-service-design` → `main`
7. **Kim** reviews entire PR:
   - Architecture sound?
   - APIs complete?
   - Design decisions justified?
   - Ready for Phase 3?
8. **Kim** approves → Marcus merges
9. **Marcus** deletes `feature/integration-service-design` branch

---

## 📝 Communication

**Daily standup (9:00 AM UTC):**
- Marcus: "Completed Task 1 (architecture), starting Task 2"
- Kim: "Reviewed architecture, looks good, proceed"

**Blockers:**
- Need Archie's detailed requirements? Ask immediately
- Git issues? Ask Kim
- Design questions? Slack/Telegram

**Expected Completion:** Mar 21, 2026 EOD

---

## ✅ Success Criteria for Phase 2

Phase 2 is COMPLETE when:
- ✅ All 7 deliverables documented
- ✅ Architecture is sound & agreed
- ✅ All endpoints specified (ready for coding)
- ✅ Database schema planned
- ✅ Fuzzy matching algorithm designed
- ✅ Offline sync flow clear
- ✅ Conflict resolution strategy solid
- ✅ Phase 3 roadmap ready
- ✅ Team confident in design
- ✅ No blockers for Phase 3

---

**Next:** Marcus starts Phase 2 tomorrow (Mar 20) at 9:00 AM UTC standup
