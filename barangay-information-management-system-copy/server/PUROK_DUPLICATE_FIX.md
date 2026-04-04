# Purok & Classification Duplicate Prevention - Implementation Guide

## Problem Solved
Multiple mobile devices syncing simultaneously were creating:
1. **Duplicate puroks** with the same name in the same barangay
2. **Duplicate classification types** with the same name in the same municipality

This caused:
- ❌ Data integrity issues (duplicate entries)
- ❌ Sync failures (constraint violations)
- ❌ Orphaned data (residents/households unable to sync)

## Solution Implemented
**Option 3: UPSERT with Unique Constraint**

When multiple devices sync the same purok name:
- First device: Creates purok, gets ID (e.g., 100)
- Second device: Finds existing purok, gets same ID (100)
- Both devices map their local purok to the same server ID
- All households sync correctly to the same purok
- **No duplicates created! ✅**

---

## Changes Made

### 1. Puroks - Database Migration Script
**File:** `server/src/scripts/add_purok_unique_constraint.js`

What it does:
- ✅ Checks for existing duplicate puroks
- ✅ Merges duplicates (keeps first, updates household references)
- ✅ Adds unique constraint: `(barangay_id, purok_name)`
- ✅ Creates performance index

### 2. Puroks - Updated Query
**File:** `server/src/queries/barangay.queries.js`

Changed from:
```sql
INSERT INTO puroks (barangay_id, purok_name, purok_leader, description)
VALUES ($1, $2, $3, $4)
RETURNING id;
```

To:
```sql
INSERT INTO puroks (barangay_id, purok_name, purok_leader, description)
VALUES ($1, $2, $3, $4)
ON CONFLICT (barangay_id, purok_name) 
DO UPDATE SET 
    purok_leader = EXCLUDED.purok_leader,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP
RETURNING id;
```

### 3. Classifications - Updated Query
**File:** `server/src/queries/resident.queries.js`

Changed from:
```sql
INSERT INTO classification_types(
  municipality_id, name, description, color, details
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;
```

To:
```sql
INSERT INTO classification_types(
  municipality_id, name, description, color, details
) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (municipality_id, name)
DO UPDATE SET
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  details = EXCLUDED.details,
  updated_at = CURRENT_TIMESTAMP
RETURNING *;
```

### 4. Classifications - Updated Service Logic
**File:** `server/src/services/residentServices.js`

Removed the race-condition-prone check:
```javascript
// OLD - Had race condition
const existsResult = await client.query(CHECK_CLASSIFICATION_TYPE_EXISTS, [municipalityId, name]);
if (existsResult.rows[0].count > 0) {
  throw new Error("Classification type already exists"); // ❌ Causes sync failure
}
```

Now relies on database UPSERT to handle duplicates gracefully.

### 5. Mobile App Changes
**NONE!** The mobile app works as-is. It just receives an ID from the server and uses it for mapping.

---

## How to Apply the Fix

### Step 1: Run the Purok Migration

```bash
cd server
node src/scripts/add_purok_unique_constraint.js
```

Expected output:
```
🚀 Starting purok unique constraint migration...
📊 Checking for duplicate puroks...
✅ No duplicate puroks found (or duplicates merged)
🔒 Adding unique constraint to puroks table...
✅ Unique constraint added successfully
📇 Creating index for better query performance...
✅ Index created successfully
🎉 Migration completed successfully!
```

**Note:** Classifications already have the UNIQUE constraint in the database, so no migration needed for them!

### Step 2: Restart Server

```bash
# If using PM2
pm2 restart bims-server

# Or if running directly
npm run dev  # or npm start
```

### Step 3: Test

**Test Puroks:**
1. Create same purok name on two different mobile devices offline
2. Sync both devices simultaneously
3. Check database - should see only ONE purok with that name
4. Both devices' households should reference the same purok ID

**Test Classifications:**
1. Create same classification type (e.g., "PWD") on two different devices offline
2. Sync both devices simultaneously
3. Check database - should see only ONE classification with that name
4. Both devices' residents should reference the same classification ID

---

## How It Works in Production

### Scenario: Two devices sync "Purok Maligaya" at the same time

**Device A (arrives first):**
```
POST /purok { "purokName": "Purok Maligaya", "barangayId": 5 }
↓
Server: INSERT creates new purok with ID: 42
↓
Response: { "data": { "id": 42 } }
↓
Device A maps: local_id(1) → server_id(42)
```

**Device B (arrives milliseconds later):**
```
POST /purok { "purokName": "Purok Maligaya", "barangayId": 5 }
↓
Server: CONFLICT detected! Returns existing ID: 42
         (Also updates purok_leader and description if different)
↓
Response: { "data": { "id": 42 } }
↓
Device B maps: local_id(1) → server_id(42)
```

**Result:**
- ✅ Both devices map to same server ID (42)
- ✅ When syncing households, both use purok_id: 42
- ✅ No duplicate puroks in database
- ✅ Data integrity maintained

---

## Database Schema After Migration

### Puroks Table
```sql
CREATE TABLE puroks (
    id SERIAL PRIMARY KEY,
    barangay_id INTEGER NOT NULL,
    purok_name VARCHAR(50) NOT NULL,
    purok_leader VARCHAR(50), 
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE,
    CONSTRAINT unique_purok_per_barangay UNIQUE (barangay_id, purok_name) -- ✨ NEW
);

CREATE INDEX idx_puroks_barangay ON puroks(barangay_id);
CREATE INDEX idx_puroks_name ON puroks(purok_name);
CREATE INDEX idx_puroks_barangay_name ON puroks(barangay_id, purok_name); -- ✨ NEW
```

### Classification Types Table
```sql
CREATE TABLE classification_types(
    id SERIAL PRIMARY KEY,
    municipality_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#4CAF50',
    details JSONB DEFAULT '[]'::JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE CASCADE,
    CONSTRAINT unique_classification_per_municipality UNIQUE (municipality_id, name) -- ✅ Already exists
);
```

---

## Verification Queries

### Puroks - Check if constraint exists:
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'puroks' 
AND constraint_name = 'unique_purok_per_barangay';
```

### Puroks - Check for duplicates (should return empty):
```sql
SELECT barangay_id, purok_name, COUNT(*) as count
FROM puroks
GROUP BY barangay_id, purok_name
HAVING COUNT(*) > 1;
```

### Classifications - Check if constraint exists:
```sql
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'classification_types' 
AND constraint_type = 'UNIQUE';
```

### Classifications - Check for duplicates (should return empty):
```sql
SELECT municipality_id, name, COUNT(*) as count
FROM classification_types
GROUP BY municipality_id, name
HAVING COUNT(*) > 1;
```

### Test UPSERT manually:
```sql
-- First insert (creates new)
INSERT INTO puroks (barangay_id, purok_name, purok_leader, description)
VALUES (1, 'Test Purok', 'Leader A', 'Description A')
ON CONFLICT (barangay_id, purok_name) 
DO UPDATE SET 
    purok_leader = EXCLUDED.purok_leader,
    description = EXCLUDED.description
RETURNING id;

-- Second insert (returns existing ID, updates leader/description)
INSERT INTO puroks (barangay_id, purok_name, purok_leader, description)
VALUES (1, 'Test Purok', 'Leader B', 'Description B')
ON CONFLICT (barangay_id, purok_name) 
DO UPDATE SET 
    purok_leader = EXCLUDED.purok_leader,
    description = EXCLUDED.description
RETURNING id;

-- Both should return the same ID!
```

---

## Rollback (If Needed)

If you need to remove the constraint:

```sql
ALTER TABLE puroks DROP CONSTRAINT unique_purok_per_barangay;
DROP INDEX IF EXISTS idx_puroks_barangay_name;
```

Then revert the query in `barangay.queries.js` to the original INSERT without ON CONFLICT.

---

## Benefits

1. ✅ **No Sync Failures**: Mobile apps always get a valid ID
2. ✅ **Data Integrity**: Same purok name = same entity
3. ✅ **Handles Concurrency**: Race conditions solved at database level
4. ✅ **Offline-First Friendly**: No rejection errors for field workers
5. ✅ **Backward Compatible**: No mobile app changes needed
6. ✅ **Performance**: Indexed constraint is fast
7. ✅ **Automatic Merge**: Duplicate data gets consolidated

---

## Future Considerations

### If you want to track conflicts:
Add audit logging to detect when ON CONFLICT is triggered:

```javascript
// In barangayServices.js insertPurok
const result = await client.query(INSERT_PUROK, [...]);

// Check if this was an insert or update
const checkConflict = await client.query(
  'SELECT created_at, updated_at FROM puroks WHERE id = $1',
  [result.rows[0].id]
);

if (checkConflict.rows[0].created_at !== checkConflict.rows[0].updated_at) {
  logger.warn(`Conflict resolved: Purok "${purokName}" already existed in barangay ${barangayId}`);
  // Optionally log to audit table
}
```

### If you want stricter validation:
Add a `created_by_user_id` field and show admin dashboard of conflicts for manual review.

---

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify constraint exists with verification queries above
3. Test with single device first, then multiple devices
4. Check mobile app sync logs

---

**Status:** ✅ Ready to deploy!

