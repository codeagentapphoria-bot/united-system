# Detailed Sync Flow with ID Mapping

## Complete Sync Process

### The Sync Order is Critical:

```
┌─────────────────────────────────────────────────────────────┐
│                   BEFORE SYNCING RESIDENTS                   │
│                                                              │
│  1️⃣  SYNC PUROKS          → Get Server IDs                 │
│  2️⃣  SYNC CLASSIFICATIONS → Get Server IDs                 │
│                                                              │
│  ✅ Now local & server IDs are ALIGNED                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    AFTER ALIGNMENT                           │
│                                                              │
│  3️⃣  SYNC RESIDENTS       → Uses classification NAMES      │
│  4️⃣  SYNC HOUSEHOLDS      → Uses mapped purok SERVER IDs   │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Flow Example

### Scenario: User Creates Data Offline

```
📱 MOBILE (Offline)
──────────────────────────────────────────────────────────────

1. Create Purok "Purok 5"
   ┌─────────────────────────────────────┐
   │ puroks table:                       │
   │ id: 10 (local auto-increment)       │
   │ barangay_id: 1                      │
   │ name: "Purok 5"                     │
   │ leader: "Juan Dela Cruz"            │
   │ server_id: NULL                     │
   │ sync_status: 'pending'              │
   └─────────────────────────────────────┘

2. Create Classification "Senior Citizen"
   ┌─────────────────────────────────────┐
   │ classification_types table:         │
   │ id: 5 (local auto-increment)        │
   │ municipality_id: 1                  │
   │ name: "Senior Citizen"              │
   │ description: "Ages 60+"             │
   │ color: "#FF9800"                    │
   │ details: "[{...}]"                  │
   │ server_id: NULL                     │
   │ sync_status: 'pending'              │
   └─────────────────────────────────────┘

3. Create Resident "Maria Santos"
   ┌─────────────────────────────────────┐
   │ residents table:                    │
   │ id: "BRGN-2024-0001"                │
   │ barangay_id: 1                      │
   │ first_name: "Maria"                 │
   │ last_name: "Santos"                 │
   │ ...                                 │
   │ sync_status: 'pending'              │
   └─────────────────────────────────────┘
   
   ┌─────────────────────────────────────┐
   │ resident_classifications table:     │
   │ local_id: "BRGN-2024-0001"          │
   │ classification_type: "Senior Citizen" ← BY NAME!
   │ classification_details: "{...}"     │
   └─────────────────────────────────────┘

4. Create Household "House #5"
   ┌─────────────────────────────────────┐
   │ households table:                   │
   │ id: 3 (local)                       │
   │ house_number: "5"                   │
   │ purok_id: 10 (local purok ID)       │
   │ house_head: "BRGN-2024-0001"        │
   │ sync_status: 'pending'              │
   └─────────────────────────────────────┘
```

### Now User Taps "Sync All"

```
🔄 SYNC STEP 1: PUROKS
──────────────────────────────────────────────────────────────

📱 Mobile Query:
   SELECT * FROM puroks WHERE sync_status = 'pending'
   → Found: Purok "Purok 5" (id: 10)

📤 POST to Server:
   POST /purok
   {
     "barangayId": 1,
     "purokName": "Purok 5",
     "purokLeader": "Juan Dela Cruz",
     "description": "New purok"
   }

📥 Server Response:
   {
     "message": "Successfully upserted purok",
     "data": {
       "id": 42  ← SERVER GENERATED THIS ID!
     }
   }

💾 Update Local Database:
   UPDATE puroks 
   SET server_id = 42,
       sync_status = 'synced'
   WHERE id = 10

   ┌─────────────────────────────────────┐
   │ puroks table (AFTER):               │
   │ id: 10                              │
   │ name: "Purok 5"                     │
   │ server_id: 42  ✅ MAPPED!           │
   │ sync_status: 'synced'               │
   └─────────────────────────────────────┘

ID MAPPING: Local 10 → Server 42 ✅


🔄 STEP 2: CLASSIFICATIONS
──────────────────────────────────────────────────────────────

📱 Mobile Query:
   SELECT * FROM classification_types WHERE sync_status = 'pending'
   → Found: "Senior Citizen" (id: 5)

📤 POST to Server:
   POST /classification-types
   {
     "name": "Senior Citizen",
     "description": "Ages 60+",
     "color": "#FF9800",
     "details": [{...}]
   }

📥 Server Response:
   {
     "message": "Successfully created classification type",
     "data": {
       "id": 25,  ← SERVER GENERATED THIS ID!
       "municipality_id": 1,
       "name": "Senior Citizen",
       ...
     }
   }

💾 Update Local Database:
   UPDATE classification_types 
   SET server_id = 25,
       sync_status = 'synced'
   WHERE id = 5

   ┌─────────────────────────────────────┐
   │ classification_types (AFTER):       │
   │ id: 5                               │
   │ name: "Senior Citizen"              │
   │ server_id: 25  ✅ MAPPED!           │
   │ sync_status: 'synced'               │
   └─────────────────────────────────────┘

ID MAPPING: Local 5 → Server 25 ✅


🔄 STEP 3: RESIDENTS
──────────────────────────────────────────────────────────────

📱 Mobile Query:
   SELECT * FROM residents WHERE sync_status = 'pending'
   → Found: "Maria Santos" (id: "BRGN-2024-0001")

   Get resident classifications:
   SELECT * FROM resident_classifications 
   WHERE local_id = 'BRGN-2024-0001'
   → Found: classification_type = "Senior Citizen"

📤 POST to Server:
   POST /resident
   {
     "barangayId": 1,
     "firstName": "Maria",
     "lastName": "Santos",
     "classifications": [
       {
         "type": "Senior Citizen",  ← BY NAME (not ID!)
         "details": "..."
       }
     ],
     ...
   }

   ℹ️ NOTE: Server will look up "Senior Citizen" by NAME
         and find the classification_type it just created (id: 25)

📥 Server Response:
   {
     "message": "Resident synced successfully",
     "data": {
       "resident": {
         "id": "PREFIX-2024-0000001"  ← SERVER RESIDENT ID
       },
       "action": "created"
     }
   }

💾 Update Local Database:
   UPDATE residents 
   SET server_resident_id = 'PREFIX-2024-0000001',
       sync_status = 'synced'
   WHERE id = 'BRGN-2024-0001'

✅ Resident synced! Classification reference is valid because:
   - Classification "Senior Citizen" already exists on server (from Step 2)
   - Server has id=25 for that classification
   - Server maps by NAME, not ID


🔄 STEP 4: HOUSEHOLDS
──────────────────────────────────────────────────────────────

📱 Mobile Query:
   SELECT * FROM households WHERE sync_status = 'pending'
   → Found: House #5 (id: 3, purok_id: 10)

   Lookup server purok ID:
   SELECT server_id FROM puroks WHERE id = 10
   → Returns: 42

📤 POST to Server:
   POST /household
   {
     "houseNumber": "5",
     "purokId": 42,  ← USES SERVER ID (not local 10!)
     "houseHead": "PREFIX-2024-0000001",  ← Server resident ID
     ...
   }

📥 Server Response:
   {
     "message": "Household synced successfully",
     "data": {
       "household": {
         "id": "123"  ← SERVER HOUSEHOLD ID
       }
     }
   }

💾 Update Local Database:
   UPDATE households 
   SET server_id = 123,
       sync_status = 'synced'
   WHERE id = 3

✅ Household synced! Purok reference is valid because:
   - Purok with server_id=42 exists on server (from Step 1)
   - Household correctly references server purok_id=42
```

## Why This Order Matters

### ❌ WRONG Order (Would Fail):

```
1. Sync Household with purok_id: 10
   Server: "Purok ID 10 doesn't exist!" ❌
   
2. Then sync Purok
   Server: Creates purok with id: 42
   
Result: Household and Purok are NOT connected!
```

### ✅ CORRECT Order (What We Implemented):

```
1. Sync Purok first
   Server: Creates purok with id: 42
   Mobile: Stores mapping (local 10 → server 42)
   
2. Sync Household with mapped ID
   Mobile: Looks up server_id for local purok 10 → Gets 42
   POST with purok_id: 42
   Server: "Purok ID 42 exists!" ✅
   
Result: Household correctly linked to Purok!
```

## Key Insights

### 1. **Puroks Referenced by ID**
```dart
// Households reference puroks by ID (foreign key)
households.purok_id → puroks.id

// When syncing:
- Local purok_id: 10
- Server purok_id: 42
- MUST map: 10 → 42 when syncing household
```

### 2. **Classifications Referenced by NAME**
```dart
// Residents reference classifications by NAME (not ID)
resident_classifications.classification_type → "Senior Citizen"

// Server looks up by name:
SELECT * FROM classification_types WHERE name = 'Senior Citizen'

// No ID mapping needed! Just ensure classification exists on server first
```

### 3. **Why Sync Classifications Before Residents**

Even though we use names (not IDs), we still need to sync classifications first because:

```dart
// Resident sync sends:
{
  "classifications": [
    {"type": "Senior Citizen", "details": "..."}
  ]
}

// Server validates:
classification = db.query("SELECT * FROM classification_types WHERE name = ?", "Senior Citizen")

if (!classification) {
  return error("Classification type 'Senior Citizen' not found")  ❌
}

// So classification MUST exist on server first!
```

## The Complete Sync Coordinator Implementation

```dart
// SyncCoordinatorService.syncAll()

async syncAll() {
  // STEP 1: Sync Puroks
  // Returns: Map<localId, serverId>
  // Example: {10: 42, 11: 43, 12: 44}
  final purokMappings = await purokSync.syncPuroks();
  
  // STEP 2: Sync Classifications  
  // Returns: Map<localId, serverId>
  // Example: {5: 25, 6: 26}
  final classificationMappings = await classificationSync.syncClassificationTypes();
  
  // ✅ NOW LOCAL & SERVER ARE ALIGNED!
  
  // STEP 3: Sync Residents
  for (resident in pendingResidents) {
    // Resident classifications stored by NAME
    // Server will validate against existing classification_types
    await residentSync.syncResident(resident);
    // ✅ Works because classifications exist on server
  }
  
  // STEP 4: Sync Households
  for (household in pendingHouseholds) {
    // Map local purok ID to server ID
    final localPurokId = household.purokId;  // e.g., 10
    final serverPurokId = await dbHelper.getPurokServerId(localPurokId);  // Returns: 42
    
    // Use server ID when syncing
    household.purokId = serverPurokId;  // Now: 42
    await householdSync.syncHousehold(household);
    // ✅ Works because purok 42 exists on server
  }
}
```

## ID Alignment Table

| Entity | Local ID | Stored In | Referenced By | Uses |
|--------|----------|-----------|---------------|------|
| **Purok** | `puroks.id = 10` | `puroks.server_id = 42` | Households | **ID mapping** required |
| **Classification** | `classification_types.id = 5` | `classification_types.server_id = 25` | Residents | **NAME only** (no mapping needed) |
| **Resident** | `residents.id = "BRGN-2024-0001"` | `residents.server_resident_id = "PREFIX-2024-0000001"` | Households, Pets | Server ID stored |
| **Household** | `households.id = 3` | `households.server_id = 123` | - | Server ID stored |

## Code Flow

### When Syncing a Household

```dart
// Household has local purok_id
final household = Household(
  id: 3,
  purokId: 10,  // ← Local purok ID
  houseNumber: "5",
  ...
);

// Before syncing, map the purok ID
final serverPurokId = await dbHelper.getPurokServerId(10);
// Query: SELECT server_id FROM puroks WHERE id = 10
// Returns: 42 ✅

// Create household with mapped ID
final householdToSync = household.copyWith(purokId: serverPurokId);

// Now POST to server
POST /household {
  "purokId": 42,  // ← Server ID!
  "houseNumber": "5",
  ...
}

// Server validates:
purok = db.query("SELECT * FROM puroks WHERE id = 42")
if (purok.exists) {
  // ✅ Success! Create household with purok_id: 42
}
```

### When Syncing a Resident with Classifications

```dart
// Resident has classifications stored by NAME
final resident = Resident(
  id: "BRGN-2024-0001",
  firstName: "Maria",
  lastName: "Santos",
  ...
);

// Get classifications
final classifications = await dbHelper.getResidentClassifications(resident.id);
// Returns: [
//   {
//     classification_type: "Senior Citizen",  ← NAME, not ID!
//     classification_details: "{...}"
//   }
// ]

// POST to server
POST /resident {
  "firstName": "Maria",
  "lastName": "Santos",
  "classifications": [
    {
      "type": "Senior Citizen",  // ← Name reference
      "details": "..."
    }
  ],
  ...
}

// Server validates:
classification = db.query("SELECT * FROM classification_types WHERE name = 'Senior Citizen'")
if (classification.exists) {
  // ✅ Success! Classification was synced in Step 2
  // Server has classification_type with id=25 and name="Senior Citizen"
}
```

## Database State Comparison

### BEFORE SYNC
```
📱 MOBILE                          🖥️  SERVER
─────────────────────────          ─────────────────────────
puroks:                            puroks:
  id=10, name="Purok 5"              (empty)
  server_id=NULL ❌
  
classification_types:              classification_types:
  id=5, name="Senior Citizen"        (empty)
  server_id=NULL ❌
  
residents:                         residents:
  id="BRGN-2024-0001"                (empty)
  classifications: ["Senior Citizen"]
  
households:                        households:
  id=3, purok_id=10                  (empty)
```

### AFTER SYNC (Step 1 & 2)
```
📱 MOBILE                          🖥️  SERVER
─────────────────────────          ─────────────────────────
puroks:                            puroks:
  id=10, name="Purok 5"              id=42, name="Purok 5" ✅
  server_id=42 ✅
  sync_status='synced'
  
classification_types:              classification_types:
  id=5, name="Senior Citizen"        id=25, name="Senior Citizen" ✅
  server_id=25 ✅
  sync_status='synced'

✅ IDs ARE NOW ALIGNED!
```

### AFTER COMPLETE SYNC (All Steps)
```
📱 MOBILE                          🖥️  SERVER
─────────────────────────          ─────────────────────────
puroks:                            puroks:
  id=10, server_id=42 ✅             id=42, name="Purok 5" ✅
  
classification_types:              classification_types:
  id=5, server_id=25 ✅              id=25, name="Senior Citizen" ✅
  
residents:                         residents:
  id="BRGN-2024-0001"                id="PREFIX-2024-0000001" ✅
  server_id="PREFIX-2024-0000001" ✅   classifications: [
                                       {type_id: 25, details: "..."}
                                     ]
  
households:                        households:
  id=3, purok_id=10                  id=123, purok_id=42 ✅
  server_id=123 ✅                   house_head="PREFIX-2024-0000001" ✅

✅ ALL DATA SYNCED AND ALIGNED!
```

## Summary

### What Happens During Sync

1. **Puroks Sync First**
   - Mobile sends purok data
   - Server creates puroks with its own IDs (42, 43, 44...)
   - Mobile stores mapping: Local → Server IDs
   - Status changes: `pending` → `synced`

2. **Classifications Sync Second**
   - Mobile sends classification data
   - Server creates classifications with its own IDs (25, 26, 27...)
   - Mobile stores mapping: Local → Server IDs
   - Status changes: `pending` → `synced`

3. **Residents Sync Third**
   - Mobile sends resident data with classification **NAMES**
   - Server looks up classifications by name (finds id=25 for "Senior Citizen")
   - Server creates residents
   - Classifications already exist on server ✅

4. **Households Sync Last**
   - Mobile maps local purok ID (10) to server ID (42)
   - Mobile sends household data with **server purok ID** (42)
   - Server creates household with purok_id=42
   - Purok already exists on server ✅

### The Critical Point

**Before syncing residents/households:**
```
✅ Puroks exist on server (with known server IDs)
✅ Classifications exist on server (with known server IDs)
✅ Mobile has ID mappings stored locally
```

**When syncing residents/households:**
```
✅ Classification names resolve to existing server classifications
✅ Local purok IDs map to existing server purok IDs
✅ Foreign key integrity maintained
✅ No "not found" errors
```

This is exactly what the `SyncCoordinatorService` implements! 🎉


