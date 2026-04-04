# Pet Sync Implementation

## Overview
This document describes the complete pet synchronization flow that handles both pet data and vaccination records.

## Sync Flow Process

### Step 1: Pet Data Preparation
1. **Owner ID Mapping**: The system looks up the local `owner_id` (e.g., `"LOCAL_7"`) in the residents table
2. **Server Resident ID Retrieval**: Uses the relational mapping to get the corresponding `server_resident_id`
3. **Data Transformation**: Replaces the local `owner_id` with the `server_resident_id` in the payload

### Step 2: Pet API Call
1. **Endpoint**: `POST /pet`
2. **Payload**: Transformed pet data with `server_resident_id` as `ownerId`
3. **Response**: Server returns the created pet with a `pet_id`

### Step 3: Vaccination Record Sync (if applicable)
1. **Condition**: Only if `pet.isVaccinated == true` and `pet.vaccinationDate != null`
2. **Endpoint**: `POST /vaccine`
3. **Payload**: 
   ```json
   {
     "target_type": "pet",
     "target_id": "<server_pet_id>",
     "vaccine_name": "General Vaccination",
     "vaccine_type": "Annual",
     "vaccine_description": "Pet vaccination record",
     "vaccination_date": "<pet.vaccinationDate>"
   }
   ```

## Implementation Details

### Files Modified
1. **`lib/core/config/api_config.dart`**
   - Added `createPetEndpoint = '/pet'`
   - Added `createVaccineEndpoint = '/vaccine'`

2. **`lib/core/services/pets_sync_service.dart`**
   - Updated `syncPet()` method to use `/pet` endpoint instead of `/sync/pet`
   - Added `_syncVaccinationRecord()` method
   - Enhanced error handling and logging

### Key Features
- **Automatic Owner ID Mapping**: Local IDs are automatically converted to server IDs
- **Vaccination Integration**: Vaccination records are automatically synced when pets are vaccinated
- **Error Handling**: Comprehensive error handling with retry logic
- **Logging**: Detailed logging for debugging and monitoring

### Database Requirements
- **Residents Table**: Must have `server_resident_id` column populated
- **Pets Table**: Must have vaccination status and date fields
- **Relational Mapping**: Local resident IDs must be mapped to server resident IDs

## Usage Example

```dart
// The sync process is automatically triggered when:
// 1. User clicks "Start Sync Pets" in PetsSyncScreen
// 2. System processes each pet with syncStatus = 'pending'
// 3. For each pet:
//    - Maps owner_id to server_resident_id
//    - Sends pet data to /pet endpoint
//    - If vaccinated, sends vaccination record to /vaccine endpoint
//    - Updates local database with server_pet_id and sync_status = 'synced'
```

## Error Handling
- **Retry Logic**: 3 attempts with 2-second delays
- **Timeout**: 30-second timeout for both send and receive
- **Graceful Degradation**: If vaccination sync fails, pet sync still succeeds
- **User Feedback**: Progress dialog and status messages

## Testing
To test the sync flow:
1. Ensure residents are synced first (have `server_resident_id`)
2. Create pets with `syncStatus = 'pending'`
3. Run the sync process
4. Verify pets are synced with correct server IDs
5. Verify vaccination records are created for vaccinated pets
