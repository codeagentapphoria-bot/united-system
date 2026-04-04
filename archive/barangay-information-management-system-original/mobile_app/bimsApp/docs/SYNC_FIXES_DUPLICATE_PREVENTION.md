# Sync Fixes: Duplicate Prevention & ID Alignment

## Issues Fixed

### Issue 1: Puroks Fetched from Server Were Being Synced Again (Duplicates)

**Problem:**
```
1. Login → Fetch puroks from server → Store locally
   puroks table: id=1, name="Purok 1", server_id=NULL, sync_status='pending'
   
2. User taps "Sync"
   → System sees sync_status='pending'
   → Tries to sync "Purok 1" to server again
   → Server creates duplicate "Purok 1" with new ID!
   
Result: Duplicate puroks on server ❌
```

**Root Cause:**
- Puroks fetched from server weren't marked with `server_id` and `sync_status='synced'`
- Sync query selected ALL puroks with `sync_status='pending'`, including server-fetched ones

**Solution:**
1. ✅ Mark puroks fetched from server as `synced` with `server_id` populated
2. ✅ Only sync puroks where `server_id IS NULL` (locally created)

**Code Changes:**

```dart
// auth_service.dart - When storing puroks from server
await db.insert('puroks', {
  'id': purok.purokId,
  'barangay_id': purok.barangayId,
  'name': purok.purokName,
  'leader': purok.purokLeader,
  'description': purok.description,
  'server_id': purok.purokId,  // ✅ Mark with server ID
  'sync_status': 'synced',     // ✅ Already on server
  ...
});

// database_helper.dart - Only sync locally created puroks
Future<List<Map<String, dynamic>>> getPendingPuroks() async {
  return await db.query(
    'puroks',
    where: 'sync_status = ? AND server_id IS NULL',  // ✅ Only locally created
    whereArgs: ['pending'],
  );
}

// purok_management_screen.dart - Locally created puroks
Future<int> insertPurok(Map<String, dynamic> purok) async {
  return await db.insert('puroks', {
    ...
    'server_id': null,         // ✅ No server ID yet
    'sync_status': 'pending',  // ✅ Needs sync
  });
}
```

### Issue 2: Classification Types ID Mismatch

**Problem:**
```
1. Create classification "PWD" locally
   classification_types: id=5, name="PWD", server_id=NULL, sync_status='pending'
   
2. Assign "PWD" to resident
   resident_classifications: classification_type="PWD"
   
3. Sync resident BEFORE syncing classification
   → Server: "Classification 'PWD' not found!" ❌
   
4. Later sync classification
   → Server creates "PWD" with id=25
   → But resident already synced without it!
```

**Root Cause:**
- Classifications weren't being synced BEFORE residents
- Classifications fetched from server weren't marked as synced
- No duplicate handling when classification already exists

**Solution:**
1. ✅ Sync classifications BEFORE residents (enforced by SyncCoordinatorService)
2. ✅ Mark classifications from server as `synced` with `server_id`
3. ✅ Only sync classifications where `server_id IS NULL`
4. ✅ Handle duplicate errors gracefully (fetch existing ID)

**Code Changes:**

```dart
// auth_models.dart - Mark classifications from server
Map<String, dynamic> toLocalJson() {
  return {
    ...
    'server_id': id,           // ✅ Server ID (from server)
    'sync_status': 'synced',   // ✅ Already on server
  };
}

// database_helper.dart - Only sync locally created
Future<List<Map<String, dynamic>>> getPendingClassificationTypes() async {
  return await db.query(
    'classification_types',
    where: 'sync_status = ? AND server_id IS NULL',  // ✅ Only locally created
    whereArgs: ['pending'],
  );
}

// classification_management_screen.dart - Locally created
Future<int> insertClassificationType(Map<String, dynamic> data) async {
  return await db.insert('classification_types', {
    ...
    'server_id': null,         // ✅ No server ID yet
    'sync_status': 'pending',  // ✅ Needs sync
  });
}

// classification_sync_service.dart - Handle duplicates
try {
  response = await api.post('/classification-types', data);
} catch (e) {
  if (e.contains('409') || e.contains('already exists')) {
    // ✅ Fetch existing classification to get its ID
    final existing = await api.get('/classification-types');
    final matching = existing.find(c => c.name == classification.name);
    return matching.id;  // ✅ Use existing server ID
  }
}
```

## How It Works Now

### Scenario 1: Fetching Data from Server (Login)

```
📥 FETCH FROM SERVER
──────────────────────────────────────────

1. Login → API returns puroks and classifications
2. Store locally with proper flags:

puroks:
  id: 1 (from server)
  name: "Purok 1"
  server_id: 1          ✅ Same as id (from server)
  sync_status: 'synced' ✅ Already on server

classification_types:
  id: 10 (from server)
  name: "Senior Citizen"
  server_id: 10         ✅ Same as id (from server)
  sync_status: 'synced' ✅ Already on server

3. When user taps "Sync":
   → getPendingPuroks() finds ZERO items
   → getPendingClassificationTypes() finds ZERO items
   ✅ No duplicates created!
```

### Scenario 2: Creating Data Locally

```
📱 CREATE LOCALLY
──────────────────────────────────────────

1. User creates "Purok 5" on mobile

puroks:
  id: 100 (auto-increment)
  name: "Purok 5"
  server_id: NULL       ✅ Not on server yet
  sync_status: 'pending' ✅ Needs sync

2. User creates "PWD" classification

classification_types:
  id: 50 (auto-increment)
  name: "PWD"
  server_id: NULL       ✅ Not on server yet
  sync_status: 'pending' ✅ Needs sync

3. User taps "Sync All":

   STEP 1: Sync Puroks
   → getPendingPuroks() WHERE server_id IS NULL
   → Finds: "Purok 5" (id=100)
   → POST /purok → Server: {id: 42}
   → UPDATE puroks SET server_id=42, sync_status='synced' WHERE id=100
   ✅ Mapping: 100 → 42

   STEP 2: Sync Classifications
   → getPendingClassificationTypes() WHERE server_id IS NULL
   → Finds: "PWD" (id=50)
   → POST /classification-types → Server: {id: 25}
   → UPDATE classification_types SET server_id=25, sync_status='synced' WHERE id=50
   ✅ Mapping: 50 → 25

4. Next sync:
   → getPendingPuroks() finds ZERO (server_id=42, not NULL)
   → getPendingClassificationTypes() finds ZERO (server_id=25, not NULL)
   ✅ No re-sync, no duplicates!
```

### Scenario 3: Duplicate Detection

```
🔄 DUPLICATE HANDLING
──────────────────────────────────────────

1. User creates "Senior Citizen" locally
   (but it already exists on server from web client)

classification_types:
  id: 51
  name: "Senior Citizen"
  server_id: NULL
  sync_status: 'pending'

2. User taps "Sync":
   → POST /classification-types {"name": "Senior Citizen", ...}
   → Server: ❌ 409 Conflict "Classification type already exists"

3. Sync service detects 409 error:
   → GET /classification-types (fetch all)
   → Find existing: {id: 10, name: "Senior Citizen"}
   → Update local: server_id=10, sync_status='synced'
   ✅ No duplicate! Linked to existing classification!

Result: Local classification (id=51) now maps to server (id=10)
```

## Database States

### Data Fetched from Server
```sql
-- Puroks from server
INSERT INTO puroks (id, barangay_id, name, leader, description, server_id, sync_status)
VALUES (1, 1, 'Purok 1', 'Juan', 'Main', 1, 'synced')
--     ↑                                    ↑    ↑
--   Server ID                        Same   Already synced

-- Won't be selected by: WHERE sync_status='pending' AND server_id IS NULL ✅
```

### Data Created Locally
```sql
-- Locally created purok
INSERT INTO puroks (barangay_id, name, leader, description, server_id, sync_status)
VALUES (1, 'Purok 5', 'Maria', 'New', NULL, 'pending')
--                                    ↑      ↑
--                               No server ID  Needs sync

-- WILL be selected by: WHERE sync_status='pending' AND server_id IS NULL ✅
```

### After Sync
```sql
-- After syncing locally-created purok
UPDATE puroks 
SET server_id = 42,       -- ✅ Server assigned ID 42
    sync_status = 'synced'
WHERE id = 100             -- Local ID

-- Now won't be selected by pending query ✅
```

## Query Comparison

### Before Fix (WRONG)
```sql
-- Selected ALL pending items, including server-fetched ones
SELECT * FROM puroks WHERE sync_status = 'pending'

Results:
- Purok 1 (id=1, from server, but marked pending) ❌ DUPLICATE!
- Purok 5 (id=100, locally created) ✅ Correct
```

### After Fix (CORRECT)
```sql
-- Only selects locally-created items
SELECT * FROM puroks WHERE sync_status = 'pending' AND server_id IS NULL

Results:
- Purok 5 (id=100, locally created, server_id=NULL) ✅ Correct only!
```

## Complete Data Flow

```
┌─────────────────────────────────────────────────────┐
│ LOGIN / REFRESH FROM SERVER                         │
├─────────────────────────────────────────────────────┤
│ Fetch puroks from /list/{barangayId}/purok          │
│ → id=1, name="Purok 1"                              │
│                                                     │
│ Store:                                              │
│ ✅ id: 1 (server ID)                                │
│ ✅ server_id: 1 (mark as from server)               │
│ ✅ sync_status: 'synced' (already on server)        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ CREATE NEW DATA LOCALLY                             │
├─────────────────────────────────────────────────────┤
│ User adds "Purok 5"                                 │
│                                                     │
│ Store:                                              │
│ ✅ id: 100 (local auto-increment)                   │
│ ✅ server_id: NULL (not on server yet)              │
│ ✅ sync_status: 'pending' (needs sync)              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ SYNC TO SERVER                                      │
├─────────────────────────────────────────────────────┤
│ Query: WHERE sync_status='pending' AND              │
│        server_id IS NULL                            │
│                                                     │
│ Results: Only "Purok 5" (id=100) ✅                 │
│ NOT "Purok 1" (has server_id=1) ✅                  │
│                                                     │
│ POST /purok → Server creates → {id: 42}             │
│                                                     │
│ Update:                                             │
│ ✅ server_id: 42                                    │
│ ✅ sync_status: 'synced'                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ SUBSEQUENT SYNCS                                    │
├─────────────────────────────────────────────────────┤
│ Query: WHERE sync_status='pending' AND              │
│        server_id IS NULL                            │
│                                                     │
│ Results: ZERO items ✅                              │
│                                                     │
│ No duplicates created! ✅                           │
└─────────────────────────────────────────────────────┘
```

## Summary of Changes

### 1. Database Schema (database_helper.dart)

**Puroks:**
```dart
// When creating locally
insertPurok() {
  'server_id': null,         // ✅ Not on server
  'sync_status': 'pending'   // ✅ Needs sync
}

// Query for sync
getPendingPuroks() {
  WHERE sync_status = 'pending' 
  AND server_id IS NULL  // ✅ Only locally created!
}
```

**Classifications:**
```dart
// When creating locally
insertClassificationType() {
  'server_id': null,         // ✅ Not on server
  'sync_status': 'pending'   // ✅ Needs sync
}

// Query for sync
getPendingClassificationTypes() {
  WHERE sync_status = 'pending' 
  AND server_id IS NULL  // ✅ Only locally created!
}
```

### 2. Server Data Storage (auth_service.dart)

**Puroks:**
```dart
storePuroksLocally(puroks) {
  for (purok in puroks) {
    await db.insert('puroks', {
      'id': purok.purokId,           // Server ID as local ID
      'server_id': purok.purokId,    // ✅ Mark as from server
      'sync_status': 'synced',       // ✅ Already on server
      ...
    });
  }
}
```

**Classifications:**
```dart
// auth_models.dart
toLocalJson() {
  return {
    'id': id,                  // Server ID as local ID
    'server_id': id,           // ✅ Mark as from server
    'sync_status': 'synced',   // ✅ Already on server
    ...
  };
}
```

### 3. Duplicate Handling (sync services)

**Purok Sync:**
```dart
try {
  POST /purok
} catch (e) {
  if (e.contains('409') || e.contains('already exists')) {
    // ✅ Fetch existing purok from server
    GET /list/{barangayId}/purok
    Find matching by name
    Return existing server ID
  }
}
```

**Classification Sync:**
```dart
try {
  POST /classification-types
} catch (e) {
  if (e.contains('409') || e.contains('already exists')) {
    // ✅ Fetch existing classification from server
    GET /classification-types
    Find matching by name
    Return existing server ID
  }
}
```

## Testing Checklist

### Test 1: Server-Fetched Data (No Duplicates)
- [ ] Login to app (fetches puroks & classifications from server)
- [ ] Check database: `sync_status='synced'` and `server_id` populated
- [ ] Tap "Sync All"
- [ ] Verify: No duplicates created on server
- [ ] Check sync results: 0 puroks synced, 0 classifications synced ✅

### Test 2: Locally-Created Data (Proper Sync)
- [ ] Create new purok "Purok 99"
- [ ] Check database: `server_id IS NULL`, `sync_status='pending'`
- [ ] Tap "Sync All"
- [ ] Verify: Purok created on server with new ID (e.g., 42)
- [ ] Check database: `server_id=42`, `sync_status='synced'`
- [ ] Tap "Sync All" again
- [ ] Verify: No duplicate "Purok 99" created ✅

### Test 3: Classification with Resident
- [ ] Create classification "PWD" locally (id=50)
- [ ] Create resident with "PWD" classification
- [ ] Tap "Sync All"
- [ ] Verify order:
  1. Classifications sync first (PWD → server_id=25)
  2. Residents sync second (with classification="PWD" by name)
- [ ] Check server: Resident has correct classification reference ✅
- [ ] Check mobile: Classification has `server_id=25`, `sync_status='synced'`

### Test 4: Duplicate Classification
- [ ] Create classification "Senior Citizen" locally (already exists on server)
- [ ] Tap "Sync All"
- [ ] Verify: Duplicate detected, fetches existing server ID
- [ ] Check database: Linked to existing server classification ✅
- [ ] No duplicate created on server ✅

## Database Queries for Verification

```sql
-- Check puroks sync status
SELECT id, name, server_id, sync_status FROM puroks;

-- Expected for server-fetched:
-- id | name      | server_id | sync_status
--  1 | Purok 1   |     1     | synced
--  2 | Purok 2   |     2     | synced

-- Expected for locally-created (before sync):
-- 100 | Purok 99 |   NULL    | pending

-- Expected for locally-created (after sync):
-- 100 | Purok 99 |    42     | synced


-- Check classification types sync status
SELECT id, name, server_id, sync_status FROM classification_types;

-- Expected for server-fetched:
-- id | name            | server_id | sync_status
-- 10 | Senior Citizen  |    10     | synced

-- Expected for locally-created (before sync):
-- 50 | PWD             |   NULL    | pending

-- Expected for locally-created (after sync):
-- 50 | PWD             |    25     | synced


-- Verify only locally-created items are selected for sync
SELECT * FROM puroks WHERE sync_status='pending' AND server_id IS NULL;
-- Should only return items created locally, not fetched from server

SELECT * FROM classification_types WHERE sync_status='pending' AND server_id IS NULL;
-- Should only return items created locally, not fetched from server
```

## Benefits

✅ **No Duplicates**: Server-fetched data is never re-synced
✅ **Proper Filtering**: Only locally-created items are synced
✅ **ID Alignment**: Server IDs are tracked for mapping
✅ **Graceful Handling**: Duplicate conflicts are resolved automatically
✅ **Data Integrity**: Foreign key relationships maintained
✅ **Sync Order**: Classifications synced before residents use them

## Quick Reference

| Data Source | server_id | sync_status | Will Sync? |
|-------------|-----------|-------------|------------|
| Fetched from server | `1` (same as id) | `'synced'` | ❌ No |
| Created locally (before sync) | `NULL` | `'pending'` | ✅ Yes |
| Created locally (after sync) | `42` (from server) | `'synced'` | ❌ No |
| Failed sync | `NULL` | `'failed'` | ✅ Yes (if retried) |

The fixes ensure that your mobile app only syncs locally-created data and properly tracks what's already on the server! 🎉

