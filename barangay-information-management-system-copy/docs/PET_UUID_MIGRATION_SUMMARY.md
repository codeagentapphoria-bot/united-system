# Pet UUID Migration Summary

## Overview
Successfully implemented UUID-based lookup for pets to prevent enumeration attacks and enhance security in public-facing endpoints.

## Implementation Date
October 7, 2025

## Security Improvement

### Before (Insecure)
```bash
POST /api/public/search
{
  "pet_id": "1"  # Easy to enumerate: 1, 2, 3...
}
# OR
{
  "pet_name": "Bryan"  # Easy to guess common pet names
}
```
❌ **Allows enumeration attacks**  
❌ **Anyone can discover all pets by incrementing IDs**  
❌ **Pet name search exposes pet data**

### After (Secure)
```bash
POST /api/public/search
{
  "pet_uuid": "1c401222-2a8e-41b6-875e-81cd5062c633"  # Only UUID works
}
```
✅ **UUID required - impossible to guess**  
✅ **Pet name search removed**  
✅ **Serial ID search blocked**  
✅ **Prevents enumeration attacks**

---

## Changes Made

### 1. Database Schema (`docs/db.docs.txt`)
- Added `uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL` column to `pets` table
- Created unique index on `uuid` column for performance
- Added security documentation notes

```sql
CREATE TABLE pets (
    id SERIAL PRIMARY KEY,                              -- Internal use only
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL, -- Public lookup
    owner_id VARCHAR(20) NOT NULL,
    pet_name VARCHAR(50) NOT NULL,
    ...
);

CREATE UNIQUE INDEX idx_pets_uuid ON pets(uuid);
```

### 2. Migration Script (`server/src/scripts/addPetUuidMigration.js`)
- Created comprehensive migration script with:
  - Automatic UUID generation for existing pets
  - Rollback capability
  - Status checking functionality
- Migration commands:
  - `node addPetUuidMigration.js migrate` - Run migration
  - `node addPetUuidMigration.js rollback` - Rollback migration
  - `node addPetUuidMigration.js status` - Check status

### 3. Backend Queries (`server/src/queries/pets.queries.js`)
- Updated `INSERT_PET` to return UUID
- Updated `UPDATE_PET` to return UUID
- Updated `PET_INFO` to include UUID
- Added new query `PET_INFO_BY_UUID` for UUID-based lookups

### 4. Backend Services (`server/src/services/petsServices.js`)
- Updated `insertPet()` to return UUID in response
- Updated `updatePet()` to return UUID in response
- Added new method `petInfoByUuid(petUuid)` for UUID-based lookups
- **Security**: Modified `searchPets()` to:
  - Only accept `pet_uuid` parameter
  - Reject `pet_id` (serial ID)
  - Reject `pet_name` (removed for security)
  - Require UUID or return error

### 5. Backend Controllers (`server/src/controllers/petsControllers.js`)
- Updated `searchPets()` controller to:
  - Only accept `pet_uuid` from request body
  - Return 400 error if UUID not provided
  - Block all other search methods

---

## Security Features

### ✅ What's Protected Now

| Feature | Before | After | Status |
|---------|--------|-------|--------|
| Public Search by Serial ID | ✅ Allowed | ❌ Blocked | ✅ Secure |
| Public Search by Pet Name | ✅ Allowed | ❌ Blocked | ✅ Secure |
| Public Search by UUID | ❌ N/A | ✅ Only Method | ✅ Secure |
| Internal Operations | Uses ID | Uses ID | ✅ Unchanged |
| Enumeration Attack | ✅ Possible | ❌ Prevented | ✅ Secure |

### 🔒 Security Test Results

```bash
# Test 1: UUID Search (Should Work) ✅
curl -X POST /api/public/search \
  -d '{"pet_uuid": "1c401222-2a8e-41b6-875e-81cd5062c633"}'
Result: ✅ SUCCESS - Returns pet details

# Test 2: Pet Name Search (Should Fail) ✅
curl -X POST /api/public/search \
  -d '{"pet_name": "Bryan"}'
Result: ✅ BLOCKED - Error: "Pet UUID is required"

# Test 3: Serial ID Search (Should Fail) ✅
curl -X POST /api/public/search \
  -d '{"pet_id": "2"}'
Result: ✅ BLOCKED - Error: "Pet UUID is required"
```

---

## Migration Results

### Database Migration
```
✅ Migration completed successfully!
Total pets: 2
Pets with UUID: 2
```

### Sample Pet UUIDs
```javascript
{
  id: 2,
  uuid: '1c401222-2a8e-41b6-875e-81cd5062c633',
  pet_name: 'Bryan',
  species: 'Dog'
},
{
  id: 1,
  uuid: '01daf61a-c0bb-4e0c-a9e5-f6f6fd288a25',
  pet_name: 'kim',
  species: 'dog'
}
```

---

## API Changes

### Public Search Endpoint
**Endpoint:** `POST /api/public/search`

**Before:**
```json
{
  "pet_id": "1",  // Accepted
  "pet_name": "Bryan"  // Accepted
}
```

**After:**
```json
{
  "pet_uuid": "1c401222-2a8e-41b6-875e-81cd5062c633"  // ONLY this accepted
}
```

**Error Response (if UUID missing):**
```json
{
  "status": "fail",
  "error": {
    "statusCode": 400,
    "isOperational": true
  },
  "message": "Pet UUID is required"
}
```

---

## Files Modified

### Backend
1. ✅ `/docs/db.docs.txt` - Schema documentation
2. ✅ `/server/src/scripts/addPetUuidMigration.js` - Migration script (new)
3. ✅ `/server/src/queries/pets.queries.js` - Updated queries
4. ✅ `/server/src/services/petsServices.js` - Added UUID methods
5. ✅ `/server/src/controllers/petsControllers.js` - Updated controller

### Database
1. ✅ `pets` table - UUID column added
2. ✅ Unique constraint and index created
3. ✅ 2 existing pets migrated with UUIDs

---

## Usage Guide

### For Administrators
When viewing pet details in the admin panel, the UUID is now available for secure public sharing.

### For Developers

#### Creating a Pet (returns UUID)
```javascript
const result = await Pet.insertPet({
  ownerId: "BRGN-2025-0000088",
  petName: "Max",
  species: "Dog",
  breed: "Labrador",
  sex: "male",
  birthdate: "2023-01-15",
  color: "Brown"
});

console.log(result.uuid); // "1c401222-2a8e-41b6-875e-81cd5062c633"
```

#### Searching for a Pet (UUID required)
```javascript
const pets = await Pet.searchPets({
  pet_uuid: "1c401222-2a8e-41b6-875e-81cd5062c633"
});
```

#### Getting Pet Info by UUID
```javascript
const pet = await Pet.petInfoByUuid("1c401222-2a8e-41b6-875e-81cd5062c633");
```

---

## Rollback Procedure

If needed, the migration can be safely rolled back:

```bash
cd /home/ubuntu/BIMS/server
node src/scripts/addPetUuidMigration.js rollback
pm2 restart bims-backend
```

This will:
- Drop the uuid column
- Remove the unique constraint
- Remove the index
- Restore table to previous state

**Note:** Rollback will delete all UUIDs. Make sure to back up data if needed.

---

## Performance Considerations

- ✅ UUID generation handled at database level using `gen_random_uuid()`
- ✅ Unique index on UUID column ensures fast lookups
- ✅ No performance degradation observed
- ✅ UUIDs generated automatically on INSERT
- ✅ Internal operations still use serial ID for optimal performance

---

## Frontend Considerations

### Current State
- ✅ Backend API updated and secured
- ⚠️ Frontend needs update IF there's a public pet search feature
- ✅ Admin panel continues to work normally (uses internal IDs)

### If Public Pet Search Exists in Frontend
Update the search component to:
1. Display UUID to users after pet registration
2. Accept UUID input for pet lookup
3. Remove pet name search input
4. Show clear messaging about UUID-based search

---

## Comparison with Request UUID Implementation

Both `requests` and `pets` tables now use the same security pattern:

| Feature | Requests | Pets |
|---------|----------|------|
| UUID Column | ✅ | ✅ |
| Public UUID Search | ✅ | ✅ |
| Serial ID Blocked | ✅ | ✅ |
| Name Search Blocked | N/A | ✅ |
| Migration Script | ✅ | ✅ |
| Rollback Support | ✅ | ✅ |

---

## Security Best Practices Implemented

1. ✅ **UUID for Public Operations** - All public endpoints use UUID
2. ✅ **Serial ID for Internal Operations** - Admin operations use ID for performance
3. ✅ **Enumeration Prevention** - Impossible to guess UUIDs
4. ✅ **No Name-Based Search** - Prevents data harvesting
5. ✅ **Unique Constraints** - Database-level UUID uniqueness
6. ✅ **Indexed Lookups** - Fast UUID queries
7. ✅ **Automatic Generation** - UUIDs created automatically

---

## Testing Checklist

| Test | Expected | Result |
|------|----------|--------|
| Migration runs successfully | ✅ Success | ✅ Pass |
| Existing pets get UUIDs | ✅ Yes | ✅ Pass |
| UUID search works | ✅ Returns data | ✅ Pass |
| Serial ID search blocked | ❌ Error | ✅ Pass |
| Pet name search blocked | ❌ Error | ✅ Pass |
| Admin panel works | ✅ Yes | ✅ Pass |
| Performance maintained | ✅ Yes | ✅ Pass |

---

## Future Enhancements

1. **QR Codes**: Generate QR codes containing pet UUID for easy scanning
2. **Pet ID Cards**: Include UUID on printable pet ID cards
3. **Public Pet Registry**: Optional public registry using UUIDs
4. **Vaccination Records**: Link vaccination records using pet UUID
5. **Lost Pet Reporting**: Use UUID for lost/found pet reports

---

## Summary

**Problem:** Pet data vulnerable to enumeration attacks via serial IDs and name search  
**Solution:** Implemented UUID-based public lookup with name search removal  
**Result:** Secure, enumeration-proof pet data access  

**Status:** ✅ **Production Ready**

### Key Achievements
- ✅ Database migrated (2 pets updated)
- ✅ Backend API secured
- ✅ All security tests passing
- ✅ Zero performance impact
- ✅ Backward compatible for admin operations

---

**Implementation Complete:** October 7, 2025  
**Migration Status:** Successful  
**Security Level:** High ✅


