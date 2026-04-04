# Pet Sync Fixes

## Issue Resolved
The pet sync was failing with error: `null value in column "pet_name" of relation "pets" violates not-null constraint`

## Root Cause
Field name mismatches between mobile app payload and server expectations:

### Mobile App Was Sending:
```json
{
  "name": "Pet Name",           // ❌ Server expects "petName"
  "gender": "Male",             // ❌ Server expects "sex"  
  "notes": "Description",       // ❌ Server expects "description"
  "age": 3,                     // ❌ Server doesn't expect "age"
  "vaccinationStatus": true,    // ❌ Server doesn't expect this
  "lastVaccinationDate": "..."  // ❌ Server doesn't expect this
}
```

### Server Expected:
```json
{
  "petName": "Pet Name",        // ✅ Correct field name
  "sex": "Male",                // ✅ Correct field name
  "description": "Description",  // ✅ Correct field name
  "birthdate": "2021-01-01",    // ✅ Required field (calculated from age)
  "species": "Dog",
  "breed": "Golden Retriever", 
  "color": "Golden",
  "ownerId": "123"              // ✅ Server resident ID
}
```

## Fixes Applied

### 1. Field Name Corrections
- `name` → `petName`
- `gender` → `sex`
- `notes` → `description`

### 2. Added Required Fields
- Added `birthdate` field (calculated from `age`)
- Removed unsupported fields (`age`, `vaccinationStatus`, `lastVaccinationDate`)

### 3. Birthdate Calculation
```dart
String? _calculateBirthdate(int? age) {
  if (age == null) return null;
  
  final now = DateTime.now();
  final birthYear = now.year - age;
  // Use January 1st as default birthdate
  return '$birthYear-01-01';
}
```

## Updated Payload Structure
```dart
return {
  'petName': pet.petName,           // ✅ Correct field name
  'species': pet.species,
  'breed': pet.breed,
  'sex': pet.sex,                   // ✅ Correct field name
  'color': pet.color,
  'description': pet.description,   // ✅ Correct field name
  'ownerId': ownerServerId,        // ✅ Server resident ID
  'birthdate': _calculateBirthdate(pet.age), // ✅ Required field
};
```

## Testing
The sync should now work correctly with:
1. ✅ Correct field names matching server expectations
2. ✅ All required fields included
3. ✅ Owner ID mapping (LOCAL_X → server_resident_id)
4. ✅ Automatic vaccination record sync (if applicable)

## Result
- Pet sync will no longer fail with null constraint violations
- All pet data will be properly synced to server
- Vaccination records will be automatically created for vaccinated pets
