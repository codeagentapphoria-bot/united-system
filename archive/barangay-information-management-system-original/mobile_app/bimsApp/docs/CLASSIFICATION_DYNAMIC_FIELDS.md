# Classification Management with Dynamic Fields

## Overview

The mobile app now supports full offline CRUD operations for Classification Types with dynamic fields that align with the web client and server architecture.

## Data Structure

### Classification Type
```json
{
  "id": 1,
  "municipality_id": 1,
  "name": "Senior Citizen",
  "description": "Residents aged 60 and above",
  "color": "#4CAF50",
  "is_active": 1,
  "details": "[...]",  // JSON array of field definitions
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Dynamic Fields (details)
```json
[
  {
    "key": "educationLevel",
    "label": "Education Level",
    "type": "text",
    "options": []
  },
  {
    "key": "pensionType",
    "label": "Pension Type",
    "type": "select",
    "options": [
      {
        "value": "sss",
        "label": "SSS Pension"
      },
      {
        "value": "gsis",
        "label": "GSIS Pension"
      },
      {
        "value": "none",
        "label": "No Pension"
      }
    ]
  }
]
```

## Features

### 1. Purok Management (`purok_management_screen.dart`)
- ✅ Create new puroks with name, leader, and description
- ✅ Edit existing puroks
- ✅ Delete puroks with confirmation
- ✅ Search puroks by name, leader, or description
- ✅ Works completely offline (no server dependency)
- ✅ Data stored in local SQLite database

### 2. Classification Management (`classification_management_screen.dart`)
- ✅ Create new classification types with:
  - Name (required)
  - Description (optional)
  - Color picker
  - Active/Inactive toggle
  - Dynamic custom fields
- ✅ Edit existing classifications
- ✅ Delete classifications with confirmation
- ✅ View JSON data
- ✅ Search classifications
- ✅ Works completely offline

### 3. Dynamic Fields Editor (`classification_details_editor.dart`)

**Field Types:**
- **Text Input**: Simple text field for data entry
- **Dropdown**: Select field with predefined options

**Features:**
- Add/remove multiple fields
- Switch between text and dropdown types
- Add/remove options for dropdown fields
- Each field has:
  - Key: Unique identifier (e.g., `educationLevel`)
  - Label: Display name (e.g., `Education Level`)
  - Type: `text` or `select`
  - Options: Array of {value, label} pairs (for select type)

## Database Schema

### Puroks Table
```sql
CREATE TABLE puroks (
  id INTEGER PRIMARY KEY,
  barangay_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  leader TEXT,
  description TEXT,
  FOREIGN KEY (barangay_id) REFERENCES barangays (id) ON DELETE CASCADE
)
```

### Classification Types Table
```sql
CREATE TABLE classification_types (
  id INTEGER PRIMARY KEY,
  municipality_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#4CAF50',
  details TEXT DEFAULT '[]',  -- JSON array
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (municipality_id) REFERENCES municipalities (id) ON DELETE CASCADE
)
```

## Usage Guide

### Creating a Classification Type

1. Navigate to Settings → Classification Management
2. Tap "Add New Classification"
3. Fill in required fields:
   - **Name**: Classification name (e.g., "Senior Citizen")
   - **Description**: Optional description
   - **Color**: Pick a color to identify the classification
   - **Active**: Toggle availability
4. Add custom fields (optional):
   - Tap "Add Field"
   - Enter Field Key (e.g., `pensionType`)
   - Enter Field Label (e.g., `Pension Type`)
   - Select Field Type (Text or Dropdown)
   - If Dropdown, add options:
     - Tap "Add Option"
     - Enter Value and Label for each option
5. Tap "Create"

### Editing a Classification Type

1. Find the classification in the list
2. Tap the menu icon (⋮)
3. Select "Edit"
4. Modify fields as needed
5. Tap "Update"

### Using Classifications with Residents

When adding or editing a resident:
1. Scroll to the "Classification" section
2. Tap "Choose Classifications"
3. Select one or more classifications
4. Fill in the dynamic fields that appear for each selected classification
5. Save the resident

## Alignment with Client/Server

### Client (Web)
- **File**: `client/src/components/ui/ClassificationTypeManager.jsx`
- **Fields Editor**: `client/src/components/ui/ClassificationDetailsEditor.jsx`
- Uses React Select for field type selection
- Supports text and select field types
- JSON structure matches mobile app

### Server
- **Controller**: `server/src/controllers/residentControllers.js`
- **Service**: `server/src/services/residentServices.js`
- Stores `details` as JSONB in PostgreSQL
- Validates field structure on create/update

### Mobile (Flutter)
- **Classification Manager**: `mobile_app/bimsApp/lib/presentation/screens/classification_management_screen.dart`
- **Fields Editor**: `mobile_app/bimsApp/lib/presentation/widgets/classification_details_editor.dart`
- Uses local SQLite database
- JSON structure matches web client and server

## API Endpoints (for future sync)

```
GET    /api/classification-types           # Get all types
GET    /api/classification-types/:id       # Get single type
POST   /api/classification-types           # Create type
PUT    /api/classification-types/:id       # Update type
DELETE /api/classification-types/:id       # Delete type
```

## Example Usage

### Creating "Senior Citizen" Classification

```json
{
  "name": "Senior Citizen",
  "description": "Residents aged 60 and above",
  "color": "#FF9800",
  "is_active": true,
  "details": [
    {
      "key": "seniorId",
      "label": "Senior Citizen ID",
      "type": "text"
    },
    {
      "key": "pensionType",
      "label": "Pension Type",
      "type": "select",
      "options": [
        {"value": "sss", "label": "SSS Pension"},
        {"value": "gsis", "label": "GSIS Pension"},
        {"value": "private", "label": "Private Pension"},
        {"value": "none", "label": "No Pension"}
      ]
    },
    {
      "key": "medicalConditions",
      "label": "Medical Conditions",
      "type": "text"
    }
  ]
}
```

### Assigning to Resident

When a resident is assigned the "Senior Citizen" classification, they will be prompted to fill in:
1. **Senior Citizen ID**: Text input field
2. **Pension Type**: Dropdown with 4 options
3. **Medical Conditions**: Text input field

The data is stored as JSON in the resident_classifications table:
```json
{
  "seniorId": "SC-2024-001",
  "pensionType": "sss",
  "medicalConditions": "Hypertension, Diabetes"
}
```

## Benefits

1. **Flexibility**: Create custom classifications without code changes
2. **Offline-First**: Works without internet connection
3. **Consistency**: Same structure across web and mobile
4. **Validation**: Type-safe field definitions
5. **User-Friendly**: Intuitive UI for managing classifications
6. **Scalable**: Add unlimited custom fields per classification

## Future Enhancements

- [ ] Sync classifications between mobile and server
- [ ] Additional field types (date, number, multi-select)
- [ ] Field validation rules
- [ ] Conditional fields (show/hide based on other fields)
- [ ] Import/export classifications
- [ ] Classification templates

