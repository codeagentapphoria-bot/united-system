# Sync System with ID Mapping

## Overview

The mobile app now features a comprehensive sync system that properly handles local-to-server ID mapping for puroks and classification types. This ensures data integrity when syncing residents and households that reference these entities.

## The Problem

When data is created offline on mobile devices:
- **Local IDs**: SQLite generates auto-increment IDs (e.g., purok_id: 1, 2, 3)
- **Server IDs**: PostgreSQL generates different IDs (e.g., purok_id: 42, 43, 44)

When syncing a household with `purok_id: 1` (local), we need to know the server's ID for that purok to maintain referential integrity.

## The Solution

### 1. **Enhanced Database Schema**

Added `server_id` and `sync_status` columns to track synced data:

```sql
-- Puroks Table
CREATE TABLE puroks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,      -- Local ID
  barangay_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  leader TEXT,
  description TEXT,
  server_id INTEGER,                         -- ✨ Server ID (after sync)
  sync_status TEXT DEFAULT 'pending',        -- ✨ 'pending', 'synced', 'failed'
  created_at TEXT,
  updated_at TEXT
)

-- Classification Types Table
CREATE TABLE classification_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,      -- Local ID
  municipality_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#4CAF50',
  details TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  server_id INTEGER,                         -- ✨ Server ID (after sync)
  sync_status TEXT DEFAULT 'pending',        -- ✨ 'pending', 'synced', 'failed'
  created_at TEXT,
  updated_at TEXT
)
```

### 2. **Sync Order**

The system follows a strict order to ensure referential integrity:

```
1. Puroks          → Get server IDs
2. Classifications → Get server IDs
3. Residents       → (uses classification mappings)
4. Households      → (uses purok and resident mappings)
```

### 3. **ID Mapping Flow**

#### Example: Syncing a Purok

```dart
// 1. Create purok locally
await dbHelper.insertPurok({
  'barangay_id': 1,
  'name': 'Purok 5',
  'leader': 'Juan Dela Cruz',
  'description': 'New purok'
});
// Local database assigns: id = 10, sync_status = 'pending'

// 2. Sync to server
final response = await api.post('/purok', {
  'barangayId': 1,
  'purokName': 'Purok 5',
  'purokLeader': 'Juan Dela Cruz',
  'description': 'New purok'
});
// Server responds: { "data": { "id": 42 } }

// 3. Update local database with server ID
await dbHelper.updatePurokServerId(10, 42);
// Now: id = 10, server_id = 42, sync_status = 'synced'

// 4. Map IDs when syncing households
final serverPurokId = await dbHelper.getPurokServerId(10);
// Returns: 42 ✅

// Use server ID when syncing household
await api.post('/household', {
  'purokId': serverPurokId,  // 42 (server ID)
  ...
});
```

## Architecture

### Services

#### 1. `PurokSyncService` (`purok_sync_service.dart`)
- Syncs puroks to `/purok` endpoint
- Extracts server ID from response
- Updates local database with server ID mapping

**Methods:**
- `syncPuroks()` - Sync all pending puroks
- `getPendingPurokCount()` - Count pending puroks
- `retryFailedPurokSyncs()` - Retry failed syncs

#### 2. `ClassificationSyncService` (`classification_sync_service.dart`)
- Syncs classification types to `/classification-types` endpoint
- Extracts server ID from response
- Updates local database with server ID mapping

**Methods:**
- `syncClassificationTypes()` - Sync all pending classifications
- `getPendingClassificationTypeCount()` - Count pending classifications
- `retryFailedClassificationTypeSyncs()` - Retry failed syncs

#### 3. `SyncCoordinatorService` (`sync_coordinator_service.dart`)
- Orchestrates the complete sync workflow
- Handles ID mapping between services
- Provides comprehensive sync results

**Methods:**
- `syncAll()` - Sync everything in correct order
- `syncResidentsOnly()` - Sync residents (auto-syncs dependencies)
- `syncHouseholdsOnly()` - Sync households (auto-syncs dependencies)
- `getSyncStatus()` - Get pending counts for all entities

#### 4. Enhanced `DatabaseHelper` (`database_helper.dart`)
Added helper methods for ID mapping:

**Purok Methods:**
- `getPendingPuroks()` - Get puroks with sync_status = 'pending'
- `updatePurokServerId(localId, serverId)` - Store server ID and mark as synced
- `getPurokServerId(localId)` - Get server ID from local ID
- `getPurokLocalId(serverId)` - Get local ID from server ID

**Classification Methods:**
- `getPendingClassificationTypes()` - Get classifications with sync_status = 'pending'
- `updateClassificationTypeServerId(localId, serverId)` - Store server ID and mark as synced
- `getClassificationTypeServerId(localId)` - Get server ID from local ID
- `getClassificationTypeLocalId(serverId)` - Get local ID from server ID

## Updated Sync Data Screen

### Features

1. **Sync Status Dashboard**
   - Shows pending counts for all entities
   - Visual indicators (orange for pending, green for synced)
   - Total pending items count

2. **Sync All Button** (Recommended)
   - One-click sync for all data
   - Handles correct sync order automatically
   - Shows detailed results with breakdown

3. **Individual Sync Options**
   - Sync Residents (with badges showing pending count)
   - Sync Households (with badges showing pending count)
   - Sync Pets

4. **Detailed Results Dialog**
   - Shows synced/failed counts for each entity type
   - Displays first 5 errors if any occurred
   - Color-coded success/failure indicators

## API Endpoints

### Purok

```
POST /purok
Body: {
  "barangayId": 1,
  "purokName": "Purok 5",
  "purokLeader": "Juan Dela Cruz",
  "description": "New purok"
}

Response: {
  "message": "Successfully upserted purok",
  "data": {
    "id": 42            // ← Server ID
  }
}
```

### Classification Type

```
POST /classification-types
Body: {
  "name": "Senior Citizen",
  "description": "Residents aged 60+",
  "color": "#FF9800",
  "details": [...]
}

Response: {
  "message": "Successfully created classification type",
  "data": {
    "id": 15,           // ← Server ID
    "municipality_id": 1,
    "name": "Senior Citizen",
    ...
  }
}
```

## Usage Examples

### Creating and Syncing a Purok

```dart
// 1. Create purok locally
final purokData = {
  'barangay_id': barangayId,
  'name': 'Purok 5',
  'leader': 'Juan Dela Cruz',
  'description': 'New purok'
};
await DatabaseHelper.instance.insertPurok(purokData);
// Result: id=10, server_id=null, sync_status='pending'

// 2. Sync purok
final purokSyncService = PurokSyncService();
final mappings = await purokSyncService.syncPuroks();
// Result: {10: 42} means local ID 10 → server ID 42

// 3. Use server ID when syncing household
final serverPurokId = await DatabaseHelper.instance.getPurokServerId(10);
// Returns: 42

final householdData = {
  'purok_id': serverPurokId,  // Use server ID!
  ...
};
```

### Creating and Syncing a Classification

```dart
// 1. Create classification locally
final classificationData = {
  'municipality_id': municipalityId,
  'name': 'PWD',
  'description': 'Person with Disability',
  'color': '#9C27B0',
  'details': jsonEncode([
    {
      'key': 'disabilityType',
      'label': 'Disability Type',
      'type': 'select',
      'options': [
        {'value': 'visual', 'label': 'Visual Impairment'},
        {'value': 'hearing', 'label': 'Hearing Impairment'}
      ]
    }
  ]),
  'is_active': true
};
await DatabaseHelper.instance.insertClassificationType(classificationData);
// Result: id=5, server_id=null, sync_status='pending'

// 2. Sync classification
final classificationSyncService = ClassificationSyncService();
final mappings = await classificationSyncService.syncClassificationTypes();
// Result: {5: 25} means local ID 5 → server ID 25

// 3. Server ID is now stored locally
final serverId = await DatabaseHelper.instance.getClassificationTypeServerId(5);
// Returns: 25
```

### Comprehensive Sync (All Data)

```dart
final syncCoordinator = SyncCoordinatorService();

// Get current sync status
final status = await syncCoordinator.getSyncStatus();
print('Pending: ${status['total_pending']} items');
print('  - Puroks: ${status['pending_puroks']}');
print('  - Classifications: ${status['pending_classifications']}');
print('  - Residents: ${status['pending_residents']}');
print('  - Households: ${status['pending_households']}');

// Sync everything
final results = await syncCoordinator.syncAll();
print('Synced: ${results['puroks_synced']} puroks');
print('Synced: ${results['classifications_synced']} classifications');
print('Synced: ${results['residents_synced']} residents');
print('Synced: ${results['households_synced']} households');

if (results['errors'].isNotEmpty) {
  print('Errors: ${results['errors']}');
}
```

## Sync Status Values

- **`pending`**: Created locally, not yet synced to server
- **`synced`**: Successfully synced, server_id populated
- **`failed`**: Sync attempted but failed (can be retried)

## Benefits

1. **Data Integrity**: Ensures correct foreign key relationships
2. **Offline-First**: Create data offline, sync later
3. **Automatic Mapping**: System handles ID translation automatically
4. **Error Resilience**: Individual failures don't stop the entire sync
5. **Retry Support**: Failed syncs can be retried
6. **Detailed Reporting**: Know exactly what synced and what failed

## Migration

For existing databases, the app will automatically:
1. Add `server_id` and `sync_status` columns to puroks table
2. Add `server_id` and `sync_status` columns to classification_types table
3. Create indexes for better query performance
4. Set default values (`server_id=null`, `sync_status='pending'`)

## Workflow Example

```
USER CREATES DATA OFFLINE:
┌──────────────────────────────┐
│ Create Purok "Purok 5"       │
│ Local ID: 10                 │
│ Server ID: null              │
│ Sync Status: pending         │
└──────────────────────────────┘

USER TAPS "SYNC ALL":
┌──────────────────────────────┐
│ STEP 1: Sync Puroks          │
│ → POST /purok                │
│ ← Response: {id: 42}         │
│ → Update: server_id=42       │
│    sync_status='synced'      │
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│ STEP 2: Sync Classifications │
│ → POST /classification-types │
│ ← Response: {id: 25}         │
│ → Update: server_id=25       │
│    sync_status='synced'      │
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│ STEP 3: Sync Residents       │
│ → POST /resident             │
│ (no ID mapping needed)       │
└──────────────────────────────┘
         ↓
┌──────────────────────────────┐
│ STEP 4: Sync Households      │
│ → Map: local purok_id 10     │
│        to server_id 42       │
│ → POST /household            │
│    {purokId: 42, ...}        │
└──────────────────────────────┘

RESULT:
✅ Puroks: 1 synced
✅ Classifications: 1 synced
✅ Residents: 15 synced
✅ Households: 8 synced
```

## Testing

### Create Test Data

```dart
// 1. Create a purok locally
await DatabaseHelper.instance.insertPurok({
  'barangay_id': 1,
  'name': 'Test Purok',
  'leader': 'Test Leader',
  'description': 'For testing'
});

// 2. Create classification locally
await DatabaseHelper.instance.insertClassificationType({
  'municipality_id': 1,
  'name': 'Test Classification',
  'description': 'For testing',
  'color': '#4CAF50',
  'details': '[]',
  'is_active': true
});

// 3. Sync
final syncCoordinator = SyncCoordinatorService();
final results = await syncCoordinator.syncAll();

// 4. Verify mappings
final purokServerId = await DatabaseHelper.instance.getPurokServerId(localPurokId);
print('Local purok $localPurokId → Server purok $purokServerId');
```

## Troubleshooting

### Problem: Households sync fails with "purok not found"

**Solution**: Ensure puroks are synced first
```dart
await PurokSyncService().syncPuroks();
await syncHouseholds();
```

### Problem: Classifications not synced

**Solution**: Check municipality ID is correct
```dart
final classifications = await DatabaseHelper.instance.getPendingClassificationTypes();
for (var c in classifications) {
  print('Classification: ${c['name']}, Municipality: ${c['municipality_id']}');
}
```

### Problem: Sync status shows "failed"

**Solution**: Retry failed syncs
```dart
await PurokSyncService().retryFailedPurokSyncs();
await ClassificationSyncService().retryFailedClassificationTypeSyncs();
```

## Files Modified/Created

### Database Layer
- ✅ `mobile_app/bimsApp/lib/data/database/database_helper.dart` - Added sync methods and ID mapping helpers

### Service Layer
- ✅ `mobile_app/bimsApp/lib/core/services/purok_sync_service.dart` - **NEW** Purok sync service
- ✅ `mobile_app/bimsApp/lib/core/services/classification_sync_service.dart` - **NEW** Classification sync service
- ✅ `mobile_app/bimsApp/lib/core/services/sync_coordinator_service.dart` - **NEW** Sync orchestrator

### UI Layer
- ✅ `mobile_app/bimsApp/lib/presentation/screens/sync_data_screen.dart` - Enhanced with "Sync All" and status dashboard

## Key Features

✅ **Automatic ID Mapping**: System automatically maps local IDs to server IDs
✅ **Correct Sync Order**: Puroks → Classifications → Residents → Households
✅ **Error Handling**: Individual failures don't stop the entire sync
✅ **Detailed Reporting**: Know exactly what synced and what failed
✅ **Retry Support**: Failed syncs can be retried separately
✅ **Status Tracking**: `pending`, `synced`, `failed` states
✅ **Backward Compatible**: Existing databases are automatically migrated

## Next Steps

1. Test creating puroks/classifications offline
2. Sync to server using "Sync All"
3. Verify server IDs are stored correctly
4. Create households using synced puroks
5. Sync households and verify purok ID mapping

## Important Notes

⚠️ **Always use "Sync All" for first sync** - This ensures correct order
⚠️ **Server IDs are nullable** - Only populated after successful sync
⚠️ **Sync Status tracking** - Monitor which items need syncing
⚠️ **Foreign Key Integrity** - Server IDs maintain referential integrity

## Database Queries

```dart
// Get all pending puroks
SELECT * FROM puroks WHERE sync_status = 'pending'

// Get server ID for local purok
SELECT server_id FROM puroks WHERE id = ?

// Get local ID for server purok
SELECT id FROM puroks WHERE server_id = ?

// Check if item is synced
SELECT sync_status FROM puroks WHERE id = ?
```

## Future Enhancements

- [ ] Bi-directional sync (download from server)
- [ ] Conflict resolution for updated items
- [ ] Batch sync API endpoints for better performance
- [ ] Offline queue with automatic retry
- [ ] Sync progress indicators
- [ ] Delta sync (only changes since last sync)


