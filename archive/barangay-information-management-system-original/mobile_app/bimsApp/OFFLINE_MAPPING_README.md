# Offline Mapping Implementation

This document describes the offline mapping functionality implemented in the BIMS mobile app, allowing users to download and view maps without an internet connection.

## Overview

The offline mapping system consists of:
- **Barangay polygon data** stored in SQLite
- **Map tiles** cached locally for offline viewing
- **Automatic download** after user login
- **Offline map rendering** using Flutter Map

## Architecture

### Database Schema

Two new tables have been added to the SQLite database:

#### `barangay_polygons`
```sql
CREATE TABLE barangay_polygons (
  id INTEGER PRIMARY KEY,
  barangay_id TEXT NOT NULL,
  geojson_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `map_tiles`
```sql
CREATE TABLE map_tiles (
  id INTEGER PRIMARY KEY,
  zoom_level INTEGER NOT NULL,
  tile_x INTEGER NOT NULL,
  tile_y INTEGER NOT NULL,
  tile_data BLOB NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(zoom_level, tile_x, tile_y)
);
```

### Core Components

1. **OfflineMappingService** - Main service for managing offline mapping data
2. **OfflineTileProvider** - Custom tile provider for rendering offline tiles
3. **OfflineDownloadScreen** - UI for downloading progress
4. **OfflineMapScreen** - UI for viewing offline maps

## Implementation Details

### 1. Database Integration

The database schema is automatically updated when the app starts:
- Version 6 includes the new offline mapping tables
- Existing databases are upgraded automatically
- CRUD operations are provided through `DatabaseHelper`

### 2. Download Process

After successful login, the system:
1. Checks if offline mapping is needed
2. Shows download progress screen if needed
3. Downloads barangay polygon data from API
4. Calculates bounding box from polygon
5. Downloads map tiles for the area
6. Stores everything in SQLite

### 3. Map Rendering

The offline map uses:
- **Flutter Map** for map rendering
- **Custom tile provider** that reads from SQLite
- **Polygon overlay** for barangay boundaries
- **Fallback tiles** for missing data

## Usage Flow

### Login Integration

```dart
// In AppProvider.login()
if (userData.targetId != null && userData.targetType == 'barangay') {
  final needsOfflineMapping = await _checkOfflineMappingNeeded(userData.targetId.toString());
  if (needsOfflineMapping) {
    // Navigate to download screen
  }
}
```

### Download Screen

The `OfflineDownloadScreen` handles:
- Progress indication
- Error handling
- Automatic navigation to home screen
- Retry functionality

### Map Viewing

The `OfflineMapScreen` provides:
- Interactive map with offline tiles
- Barangay polygon overlay
- Map information dialog
- Error handling for missing data

## API Endpoints

The system uses these API endpoints:

- `GET /api/gis/public/geojson/barangays/:id` - Fetch barangay polygon data
- `GET /api/barangays/details` - Get barangay details after login

## Configuration

### Map Tile Source

Currently configured to use OpenStreetMap tiles:
```dart
final tileUrl = 'https://tile.openstreetmap.org/$zoom/$x/$y.png';
```

### Zoom Levels

Map tiles are downloaded for zoom levels 10-16 to balance detail and storage.

### Bounding Box Calculation

The system calculates the bounding box from the barangay polygon and downloads tiles for that area only.

## Error Handling

The implementation includes comprehensive error handling:

1. **Network errors** - Graceful fallback to online tiles
2. **Storage errors** - Clear error messages
3. **Missing data** - Placeholder tiles and user guidance
4. **API errors** - Retry mechanisms

## Testing

A test screen is provided (`OfflineMappingTestScreen`) for:
- Testing offline mapping functionality
- Checking stored data
- Clearing offline data
- Verifying database integrity

## Dependencies

The following packages are required:

```yaml
dependencies:
  flutter_map: ^6.1.0
  latlong2: ^0.9.1
  http: ^1.1.0
  sqflite: ^2.3.0
```

## Future Enhancements

1. **Multiple tile sources** - Support for different map providers
2. **Tile compression** - Reduce storage requirements
3. **Selective download** - Allow users to choose areas
4. **Update mechanism** - Refresh tiles when online
5. **Offline routing** - Navigation without internet

## Troubleshooting

### Common Issues

1. **No tiles showing** - Check if tiles were downloaded successfully
2. **Slow performance** - Consider reducing zoom levels or tile count
3. **Storage issues** - Monitor device storage and clear old data
4. **API errors** - Verify network connectivity and API endpoints

### Debug Information

Use the test screen to check:
- Number of stored tiles
- Polygon data availability
- Database version
- Error messages

## Security Considerations

- Tiles are stored locally and not encrypted
- API calls use authentication tokens
- No sensitive data in tile URLs
- Local storage follows app security policies

## Performance Notes

- Initial download may take several minutes
- Storage requirements vary by area size
- Map rendering is optimized for offline use
- Database queries are indexed for performance
