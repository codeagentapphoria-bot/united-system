# BIMS Mobile App User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Login Process](#login-process)
3. [Dashboard Overview](#dashboard-overview)
4. [Adding Residents](#adding-residents)
5. [Managing Households](#managing-households)
6. [Pet Management](#pet-management)
7. [Reports & Analytics](#reports--analytics)
8. [Data Synchronization](#data-synchronization)
9. [Offline Maps](#offline-maps)
10. [Settings & Management](#settings--management)

---

## Getting Started

### App Overview
The BIMS (Barangay Information Management System) mobile app is designed for barangay officials to manage resident data, households, and pets offline. The app works without internet connection after initial setup and data download.

### System Requirements
- Android 5.0 or higher
- Minimum 2GB RAM
- 500MB free storage space
- Camera access for photos
- Location services for GPS coordinates

---

## Login Process

### Step 1: Initial Login
1. **Open the BIMS app** on your device
2. **Enter your credentials:**
   - Username: Your assigned username
   - Password: Your assigned password
3. **Enter Server IP Address:**
   - Default: `192.168.137.120` (for development)
   - Or your specific server IP
4. **Tap "Login"** button
5. **Wait for authentication** - the app will verify your credentials

### Step 2: Download Offline Data
After successful login, the app will automatically:
1. **Download barangay boundary data** (GeoJSON)
2. **Download map tiles** for offline viewing
3. **Load purok information** for your barangay
4. **Prepare offline database** for data entry

**Note:** This process requires internet connection and may take 2-5 minutes depending on your internet speed.

### Step 3: Add Puroks (First Time Setup)
After downloading offline data, you need to set up puroks for your barangay:

#### Option 1: From Dashboard
1. **Navigate to Dashboard tab**
2. **Tap "Add Purok"** quick action card
3. **Fill in purok details:**
   - **Purok Name:** *Required* (e.g., "Purok 1", "Purok Centro")
   - **Leader:** Optional (Purok leader's name)
   - **Description:** Optional
4. **Tap "Add"** to save
5. **Repeat** for all puroks in your barangay

#### Option 2: From Settings
1. **Navigate to Settings tab**
2. **Tap "Manage Purok"**
3. **Tap the "+" button**
4. **Fill in purok details** (same as above)
5. **Tap "Save"**

**Important Notes:**
- Puroks must be added before creating households
- You can add, edit, or delete puroks anytime from the Manage Purok screen
- Puroks are specific to your barangay only
- Once synced, puroks will be available across all devices for your barangay

---

## Dashboard Overview

### Main Navigation
The app has 5 main sections accessible via bottom navigation:

1. **Dashboard** - Overview and quick actions
2. **Residents** - Manage resident records
3. **Households** - Manage household information
4. **Pets** - Manage pet registrations
5. **Settings** - App settings and data sync

### Dashboard Features
- **Statistics Cards:** View total residents, households, and pending sync counts
- **Quick Actions:** Add residents, households, view reports, manage pets
- **Geographical Map:** Access offline maps
- **Sync Status:** Monitor data synchronization status

---

## Adding Residents

### Step 1: Access Add Resident
1. **From Dashboard:** Tap "Add Resident" card
2. **From Residents Tab:** Tap the "+" button
3. **From Floating Action Button:** Tap the "+" icon on main screen

### Step 2: Personal Information
1. **Resident Photo:**
   - Tap the photo area to add image
   - Choose "Camera" or "Gallery"
   - Crop image as needed
   - Photo is automatically optimized

2. **Name Fields:**
   - **Last Name:** *Required*
   - **First Name:** *Required*
   - **Middle Name:** Optional
   - **Suffix:** Optional (Jr., Sr., III, etc.)

3. **Basic Details:**
   - **Sex:** Select Male or Female *Required*
   - **Civil Status:** Select from dropdown *Required*
   - **Birthdate:** Tap to open date picker *Required*
   - **Birthplace:** Optional

### Step 3: Contact Information
1. **Contact Number:** Optional phone number
2. **Email:** Optional email address

### Step 4: Employment & Education
1. **Occupation:** Optional job title
2. **Employment Status:** Select from dropdown *Required*
3. **Education Level:** Select from dropdown *Required*
4. **Monthly Income:** Optional amount in PHP
5. **Resident Status:** Select from dropdown *Required*

### Step 5: Additional Information
1. **Indigenous Person:** Check if applicable
2. **Classifications:** 
   - Tap "Choose Classifications"
   - Select relevant classification types
   - Fill in any dynamic fields if required
   - Tap "Done" to save selections

### Step 6: Save Resident
1. **Review all information** for accuracy
2. **Tap "Save Resident"** button
3. **Wait for confirmation** message
4. **Resident is saved** to local database

**Note:** Residents are saved locally and will be synced to server later.

---

## Managing Households

### Step 1: Access Add Household
1. **From Dashboard:** Tap "Add Household" card
2. **From Households Tab:** Tap the "+" button

### Step 2: Household Image
1. **Tap the image area** to add household photo
2. **Choose source:** Camera or Gallery
3. **Crop image** as needed

### Step 3: Basic Information
1. **House Number:** Optional
2. **Street Name:** Optional
3. **Purok:** Select from dropdown *Required*
4. **Area:** Optional floor area in square meters

### Step 4: Family Structure
1. **Select House Head:**
   - Tap "Select House Head" button
   - Search and select from existing residents
   - Resident must not already be in another household

2. **Add Family Members:**
   - Tap "Add Family Members" button
   - Search and select family members
   - Members must not already be in another household

3. **Additional Families:**
   - Tap "+" button to add more families
   - Each family needs a family head
   - Add family members for each family

### Step 5: Housing Details
1. **Housing Type:** Select from dropdown (Owned, Rented, etc.)
2. **Structure Type:** Select from dropdown (Concrete, Wood, etc.)
3. **Electricity:** Check if household has electricity
4. **Water Source:** Optional description
5. **Toilet Facility:** Optional description

### Step 6: Location Information
1. **Get Current Location:**
   - Tap "Get Current Location & Select on Map"
   - Allow location permissions if prompted
   - GPS coordinates will be automatically captured
   - Use map to fine-tune location if needed

### Step 7: Save Household
1. **Review all information** for accuracy
2. **Tap "Create Household"** button
3. **Wait for confirmation** message
4. **Household is saved** to local database

---

## Pet Management

### Step 1: Access Add Pet
1. **From Dashboard:** Tap "Add Pet" card
2. **From Pets Tab:** Tap the "+" button

### Step 2: Pet Information
1. **Pet Photo:**
   - Tap the photo area to add image
   - Choose "Camera" or "Gallery"
   - Crop image as needed

2. **Basic Details:**
   - **Pet Name:** *Required*
   - **Species:** *Required* (Dog, Cat, etc.)
   - **Breed:** *Required*
   - **Sex:** Select Male or Female *Required*
   - **Birthdate:** Tap to open date picker *Required*
   - **Color:** *Required*

### Step 3: Owner Selection
1. **Tap "Select Pet Owner"** button
2. **Search for resident** in the list
3. **Select the owner** from search results
4. **Owner information** will be displayed

### Step 4: Vaccination Information
1. **Is Vaccinated:** Toggle switch
2. **Vaccination Date:** Select date if vaccinated

### Step 5: Additional Information
1. **Description:** Optional notes about the pet

### Step 6: Save Pet
1. **Review all information** for accuracy
2. **Tap "Add Pet"** button
3. **Wait for confirmation** message
4. **Pet is saved** to local database

---

## Reports & Analytics

### Accessing Reports
1. **From Dashboard:** Tap "View Reports" card
2. **From any screen:** Navigate to Dashboard → Reports

### Available Reports
1. **Summary Statistics:**
   - Total Residents
   - Total Households

2. **Residents Added by Month:**
   - Line chart showing monthly additions
   - Last 12 months of data

3. **Gender Distribution:**
   - Pie chart showing male/female ratio
   - Percentage breakdown

4. **Age Groups Distribution:**
   - Bar chart showing age demographics
   - Categories: 0-17, 18-29, 30-44, 45-59, 60+

5. **Households by Purok:**
   - Bar chart showing household distribution
   - Purok-wise breakdown

6. **Household Statistics:**
   - With/Without Electricity
   - Housing Type information
   - Location data availability

### Refreshing Data
- **Pull down** on the reports screen to refresh
- **Data updates** automatically when new records are added

---

## Data Synchronization

### Understanding Sync Process
The app works offline, but data needs to be synchronized with the server periodically. Sync order is important:

1. **Residents First** - Must sync all residents before households or pets
2. **Households Second** - After residents are synced
3. **Pets Last** - After residents are synced

### Step 1: Access Sync Screen
1. **From Settings Tab:** Tap "Sync Data"
2. **From Dashboard:** Look for sync status indicators

### Step 2: Sync Residents
1. **Tap "Sync Residents"** card
2. **Review pending residents** list
3. **Tap "Start Sync"** button
4. **Wait for completion** - progress will be shown
5. **Check results** - successful/failed counts

### Step 3: Sync Households
1. **Tap "Sync Households"** card
2. **Review pending households** list
3. **Tap "Start Sync"** button
4. **Wait for completion** - progress will be shown
5. **Check results** - successful/failed counts

### Step 4: Sync Pets
1. **Tap "Sync Pets"** card
2. **Review pending pets** list
3. **Tap "Start Sync"** button
4. **Wait for completion** - progress will be shown
5. **Check results** - successful/failed counts

### Sync Requirements
- **Internet connection** required for sync
- **Server must be accessible** at configured IP
- **All residents must be synced** before households/pets
- **Failed syncs** can be retried

---

## Offline Maps

### Accessing Maps
1. **From Dashboard:** Tap "Geographical Map" card
2. **Maps work offline** after initial download

### Map Features
1. **Barangay Boundary:**
   - Blue polygon shows barangay limits
   - Automatically loaded from server data

2. **Household Locations:**
   - Blue markers show household positions
   - Only households with GPS coordinates

3. **Map Controls:**
   - **Zoom In/Out:** +/- buttons
   - **Go to Center:** Center on barangay
   - **Fit to Polygon:** Show full barangay area
   - **Info Button:** View map statistics

### Map Information
- **Total Tiles:** Number of downloaded map tiles
- **Polygon Data:** Barangay boundary availability
- **Center Coordinates:** GPS center of barangay
- **Storage Usage:** Approximate space used

### Downloading Offline Maps
If maps are not available:
1. **Tap download button** when prompted
2. **Wait for download** to complete
3. **Maps will be available** offline after download

---

## Settings & Management

### Purok Management
1. **Access:** Settings → Purok Management
2. **View existing puroks** for your barangay
3. **Add new puroks** if needed
4. **Edit purok information** as required

### Classification Management
1. **Access:** Settings → Classification Management
2. **View classification types** available
3. **Add new classifications** if needed
4. **Edit existing classifications** as required

### Data Management
1. **View sync status** of all data
2. **Check pending items** for synchronization
3. **Monitor storage usage** of offline data
4. **Clear cache** if needed

### App Information
1. **Version information** and build details
2. **Database statistics** and record counts
3. **Storage usage** breakdown
4. **Last sync information**

---

## Troubleshooting

### Common Issues

#### Login Problems
- **Check server IP address** is correct
- **Verify internet connection** is working
- **Contact administrator** if credentials don't work

#### Sync Failures
- **Check internet connection** is stable
- **Verify server is accessible** at configured IP
- **Try syncing residents first** before households/pets
- **Retry failed syncs** individually

#### Map Issues
- **Download offline maps** if not available
- **Check GPS permissions** are enabled
- **Verify location services** are working

#### Photo Issues
- **Check camera permissions** are granted
- **Ensure sufficient storage** space available
- **Try different image sources** (camera vs gallery)

#### Data Loss Prevention
- **Sync data regularly** to prevent loss
- **Backup important data** before app updates
- **Contact support** if data is missing

### Getting Help
- **Check app logs** in Settings for error details
- **Contact system administrator** for technical issues
- **Report bugs** with detailed error messages
- **Keep app updated** to latest version

---

## Best Practices

### Data Entry
1. **Complete all required fields** before saving
2. **Verify information accuracy** before submission
3. **Use consistent naming** conventions
4. **Add photos** for better record keeping

### Synchronization
1. **Sync data daily** to prevent data loss
2. **Check sync status** regularly
3. **Resolve failed syncs** promptly
4. **Keep internet connection** stable during sync

### Storage Management
1. **Monitor storage usage** regularly
2. **Clear unnecessary data** periodically
3. **Optimize photos** before adding
4. **Keep sufficient free space** for app operation

### Security
1. **Log out** when not using the app
2. **Keep device secure** with screen lock
3. **Don't share login credentials**
4. **Report suspicious activity** immediately

---

## Image Placeholders

*[Insert screenshots for each section]*

### Login Screen
*[Screenshot of login form with username, password, and IP address fields]*

### Dashboard
*[Screenshot of main dashboard with statistics cards and quick actions]*

### Add Resident Form
*[Screenshot of resident form with personal information fields]*

### Add Household Form
*[Screenshot of household form with family structure and location fields]*

### Add Pet Form
*[Screenshot of pet form with pet information and owner selection]*

### Reports Screen
*[Screenshot of reports with charts and statistics]*

### Sync Data Screen
*[Screenshot of sync options and progress indicators]*

### Offline Map
*[Screenshot of map with barangay boundary and household markers]*

### Settings Screen
*[Screenshot of settings with management options]*

---

*This user guide covers all major features of the BIMS mobile app. For additional support or questions, contact your system administrator.*
