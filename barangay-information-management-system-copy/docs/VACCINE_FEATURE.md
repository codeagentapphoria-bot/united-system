# Vaccine Management Feature

## Overview

The vaccine management feature allows tracking vaccination records for pets in the BIMS system. This feature provides comprehensive vaccine tracking with status indicators, date management, and detailed record keeping.

## Features

### 1. Vaccine Record Management
- **Add Vaccine Records**: Create new vaccine records for pets with detailed information
- **Edit Vaccine Records**: Update existing vaccine information
- **Delete Vaccine Records**: Remove vaccine records when needed
- **View Vaccine History**: Complete history of all vaccinations for a pet

### 2. Vaccine Information Tracking
- **Vaccine Name**: Required field for vaccine identification
- **Vaccine Type**: Predefined list of common pet vaccines
- **Vaccination Date**: Date when the vaccine was administered
- **Description**: Optional notes and additional information
- **Status Tracking**: Automatic status calculation based on vaccination date

### 3. Status Indicators
- **Recent**: Vaccines administered within the last 30 days (Green)
- **Within Year**: Vaccines administered within the last year (Gray)
- **Overdue**: Vaccines administered more than a year ago (Red)

### 4. User Interface
- **Overview Tab**: Vaccine summary with statistics and latest vaccine info
- **Vaccines Tab**: Complete vaccine management interface
- **Mobile Responsive**: Works on all device sizes
- **Intuitive Design**: Follows the established design system

## Database Schema

### Vaccines Table
```sql
CREATE TABLE vaccines(
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('pet', 'resident')),
    target_id VARCHAR(20) NOT NULL,
    vaccine_name VARCHAR(100) NOT NULL,
    vaccine_type VARCHAR(50) NULL,
    vaccine_description TEXT NULL,
    vaccination_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
```sql
CREATE INDEX idx_vaccines_target ON vaccines(target_type, target_id);
CREATE INDEX idx_vaccines_date ON vaccines(vaccination_date);
CREATE INDEX idx_vaccines_name ON vaccines(vaccine_name);
```

## API Endpoints

### Vaccine Management
- `POST /api/vaccine` - Create a new vaccine record
- `GET /api/vaccines/:targetType/:targetId` - Get vaccines for a specific target
- `GET /api/vaccine/:id` - Get a specific vaccine record
- `PUT /api/vaccine/:id` - Update a vaccine record
- `DELETE /api/vaccine/:id` - Delete a vaccine record

## Components

### Client-Side Components
1. **VaccineForm.jsx** - Form for adding/editing vaccine records
2. **VaccineList.jsx** - Table display of vaccine records with management
3. **useVaccines.js** - Custom hook for vaccine data management

### Server-Side Components
1. **vaccineRoutes.js** - API route definitions
2. **vaccineControllers.js** - Business logic for vaccine operations
3. **vaccineService.js** - Client-side API service

## Usage

### Adding a Vaccine Record
1. Navigate to the Pets page
2. Click on a pet to view details
3. Go to the "Vaccines" tab
4. Click "Add Vaccine" button
5. Fill in the required information:
   - Vaccine Name (required)
   - Vaccine Type (optional)
   - Vaccination Date (required)
   - Description (optional)
6. Click "Add Vaccine" to save

### Viewing Vaccine Summary
1. Navigate to the Pets page
2. Click on a pet to view details
3. View the "Overview" tab
4. Scroll down to see the Vaccine Summary section
5. Click "View All Vaccines" to see complete records

### Managing Vaccine Records
1. Go to the "Vaccines" tab
2. Use the table to view all vaccine records
3. Click the actions menu (⋮) for each record
4. Choose to edit or delete the record
5. Confirm any destructive actions

## Vaccine Types

The system includes predefined vaccine types for common pet vaccinations:

### Dogs
- Rabies
- DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)
- Bordetella (Kennel Cough)
- Lyme Disease
- Leptospirosis

### Cats
- FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)
- FeLV (Feline Leukemia)
- FIV (Feline Immunodeficiency Virus)

### General
- Other (for custom vaccine types)

## Status Calculation

The system automatically calculates vaccine status based on the vaccination date:

- **Recent**: ≤ 30 days (Green badge)
- **Within Year**: 31-365 days (Gray badge)
- **Overdue**: > 365 days (Red badge)

## Security

- All vaccine operations require authentication
- Users can only access vaccines for pets in their jurisdiction
- Proper validation ensures data integrity
- SQL injection protection through parameterized queries

## Future Enhancements

1. **Vaccine Reminders**: Automated notifications for upcoming vaccinations
2. **Bulk Operations**: Add multiple vaccines at once
3. **Vaccine Certificates**: Generate printable vaccine certificates
4. **Import/Export**: CSV import/export functionality
5. **Vaccine Schedules**: Predefined vaccination schedules by pet type
6. **Veterinarian Integration**: Link vaccines to specific veterinarians

## Technical Notes

- Uses React hooks for state management
- Follows the established design system
- Responsive design for mobile compatibility
- Error handling with user-friendly messages
- Loading states for better UX
- Form validation with real-time feedback
