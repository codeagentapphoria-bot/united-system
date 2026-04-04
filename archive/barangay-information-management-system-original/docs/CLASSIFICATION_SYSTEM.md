# 🏷️ Classification System Guide

## Overview

The BIMS Classification System allows barangay administrators to create custom classification types for categorizing residents based on their characteristics, needs, and circumstances. This system provides flexibility to adapt to the specific requirements of each barangay.

## 🎯 What are Classification Types?

Classification types are categories that help you organize and identify residents based on their characteristics. Examples include:

- **Senior Citizen** - Residents aged 60 and above
- **Person with Disability (PWD)** - Residents with physical or mental disabilities
- **Solo Parent** - Single parents raising children
- **Student** - Residents currently enrolled in educational institutions
- **Indigenous Person** - Members of indigenous communities
- **Overseas Filipino Worker (OFW)** - Residents working abroad

## 📋 Current Setup

After the migration completed on August 21, 2025:
- ✅ Classification types use `municipality_id` (not `barangay_id`)
- ✅ All barangays in a municipality share the same classification types
- ✅ 21 unique classification types currently exist
- ✅ City of Borongan has 15 classification types
- ✅ System is ready for production use

## 🛠️ How to Manage Classification Types

### For Regular Updates (99% of cases)

**Use the Admin Interface:**
1. Log in as a municipality or super admin
2. Go to Settings > Classification Types
3. Add, edit, or delete classification types as needed
4. Changes apply to ALL barangays in your municipality

### For New Municipalities

**When adding a new municipality that needs default classification types:**

```bash
# Seed classification types for the new municipality
npm run db:seed-classification-types
```

This will add the standard classification types (Senior Citizen, PWD, Student, etc.) to any municipality that doesn't have them.

### For Migration (IF you have barangay_id)

**IF you have classification types with `barangay_id` and need to migrate to `municipality_id`:**

```bash
# Migrate from barangay_id to municipality_id
npm run db:migrate-classification-to-municipality
```

This script will:
1. Add `municipality_id` column
2. Migrate all existing data from `barangay_id` to `municipality_id`
3. Remove duplicates
4. Update constraints and indexes
5. Remove the old `barangay_id` column

## 📊 Default Classification Types

The system includes these standard classification types:

### Demographics
- **Senior Citizen** (Age 60+)
- **Youth** (Age 15-30)
- **Child** (Age 0-14)

### Special Circumstances
- **Person with Disability (PWD)**
- **Solo Parent**
- **Indigenous Person**
- **Overseas Filipino Worker (OFW)**
- **Pregnant Woman**

### Employment Status
- **Employed**
- **Unemployed**
- **Self-Employed**
- **Student**
- **Retired**

### Economic Status
- **4Ps Beneficiary**
- **Social Pension Recipient**
- **Low-Income Family**
- **Middle-Income Family**

## 🗄️ Database Structure

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
    UNIQUE(municipality_id, name)
);
```

### Key Features
- **Municipality-specific classification types** (shared across all barangays in the municipality)
- **Dynamic form field configuration** using JSONB
- **Color coding** for visual identification
- **Soft delete support** (is_active flag)
- **Automatic timestamp management**

## 🎨 Creating Custom Classification Types

### Step 1: Basic Information
1. Click the "Add Classification Type" button
2. Enter the **Name** (e.g., "Senior Citizen")
3. Add a **Description** (optional but recommended)
4. Choose a **Color** to help identify this classification visually

### Step 2: Custom Fields (Optional)
You can add custom fields to collect specific information for each classification:

#### Field Types Available:
- **Text Field**: For free-form text input
- **Select Field**: For predefined options

#### Example Custom Fields:
- **Senior Citizen**:
  - Field: "Senior Citizen ID Number" (Text)
  - Field: "Benefits Received" (Select: "Social Pension", "4Ps", "None")
  
- **Person with Disability**:
  - Field: "Type of Disability" (Select: "Physical", "Visual", "Hearing", "Intellectual", "Others")
  - Field: "PWD ID Number" (Text)
  
- **Student**:
  - Field: "School Name" (Text)
  - Field: "Grade Level" (Select: "Elementary", "High School", "College", "Graduate School")

### Step 3: Save and Use
1. Click "Create Classification Type" to save
2. The new classification will be immediately available for use

## 👥 Using Classifications with Residents

### Adding Classifications to Residents
1. **When Adding a New Resident**:
   - Complete the basic resident information
   - In the Classifications step, select applicable classifications
   - Fill in any custom fields for selected classifications
   
2. **When Editing an Existing Resident**:
   - Open the resident's profile
   - Click "Edit" → "Classifications"
   - Select or deselect classifications as needed
   - Update custom field values

### Classification Details
- Each classification can have custom fields that appear when the classification is selected
- Custom field values are stored with the resident record
- You can modify classification details at any time

## 🎯 Best Practices

### Naming Conventions
- Use clear, descriptive names (e.g., "Senior Citizen" instead of "SC")
- Keep names consistent across your barangay
- Avoid abbreviations that might be unclear

### Color Coding
- Use distinct colors for different classification types
- Consider using colors that are intuitive (e.g., green for "Active", red for "At Risk")
- Ensure colors have good contrast for accessibility

### Custom Fields
- Only add fields that provide valuable information
- Keep field names short and clear
- Use select fields when there are limited, predefined options
- Use text fields for unique or variable information

### Data Management
- Regularly review and update classification types
- Archive unused classifications instead of deleting them
- Document any special procedures or requirements for specific classifications

## 🔧 API Endpoints

The classification types API automatically filters by municipality:

- `GET /api/classification-types` - Get all classification types for your municipality
- `POST /api/classification-types` - Create new classification type in your municipality  
- `PUT /api/classification-types/:id` - Update classification type
- `DELETE /api/classification-types/:id` - Delete classification type

## 🚨 Important Notes

1. **Municipality Level**: Classification types are shared across ALL barangays in a municipality
2. **No Duplication**: Each municipality can only have one classification type with the same name
3. **Cascading Deletes**: If a municipality is deleted, its classification types are also deleted
4. **Admin Access**: Only municipality admins and super admins can manage classification types

## 🔍 Troubleshooting

### Common Issues

**Q: I can't see the Classification tab in Settings**
A: The Classification tab is only available for barangay users. Municipality users cannot manage classifications.

**Q: I can't add classifications to residents**
A: Make sure you have created at least one classification type in Settings → Classification.

**Q: Custom fields aren't showing up**
A: Check that the classification type has custom fields defined and that the resident has the classification selected.

**Q: I accidentally deleted a classification type**
A: Deleted classifications are soft-deleted and won't affect existing resident records. You can create a new one with the same name.

**Q: Can't add a classification type**
**Solution**: Check if the name already exists in your municipality. Names must be unique per municipality.

**Q: Classification types not showing**
**Solution**: Make sure you're logged in as a user from a barangay that belongs to a municipality with classification types.

**Q: Need to add classification types to a new municipality**
**Solution**: Run `npm run db:seed-classification-types` to add the standard types.

### Getting Help

If you encounter issues with the classification system:

1. Check this guide for common solutions
2. Contact your system administrator
3. Review the classification types in your settings
4. Ensure you have the proper permissions for your role

## 📊 Migration History

### Migration Summary
The classification types system has been successfully migrated from `barangay_id` to `municipality_id` to ensure that all barangays within a municipality share the same classification types.

### Migration Results
- **Total Records**: 41 classification types were migrated
- **Duplicates Removed**: 20 duplicate entries were removed (kept 21 unique types)
- **Municipalities**: 2 municipalities in the database
- **Distribution**:
  - City of Borongan (ID: 1): 15 classification types
  - Default Municipality (ID: 2): 0 classification types (ready for seeding)

### Benefits Achieved
1. **Consistency**: All barangays within a municipality now share the same classification types
2. **Reduced Duplication**: No more duplicate classification types across barangays
3. **Easier Management**: Classification types can be managed at the municipality level
4. **Better Data Integrity**: Proper foreign key relationships and constraints
5. **Scalability**: Easy to add new municipalities with their own classification types

## 🚀 Next Steps

1. **Frontend Testing**: Test the frontend to ensure all classification type features work correctly
2. **User Acceptance**: Verify that users can access and manage classification types properly
3. **Monitoring**: Monitor the system for any issues with the new structure
4. **Documentation**: Update any user-facing documentation about classification types

---

**Last Updated**: September 30, 2025  
**Migration Status**: ✅ Complete  
**System Status**: 🟢 Production Ready
