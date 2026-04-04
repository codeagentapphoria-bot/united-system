# Offline Mapping Implementation Guide

## Overview
This document outlines the step-by-step implementation of offline mapping functionality for barangay boundaries and map tiles using SQLite storage in the BIMS mobile app.

## Prerequisites
- User is logged in and has barangay ID
- API endpoint available: `/api/gis/public/geojson/barangays/:id`
- SQLite database with spatial extensions
- Mobile mapping library (e.g., Flutter Map, Mapbox)

## Implementation Steps

### Step 1: Get Barangay Details After Login
```dart
// After successful login, fetch barangay details to get barangay ID
Future<Map<String, dynamic>> fetchBarangayDetails() async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/barangays/details'), // Your existing API
    headers: {'Authorization': 'Bearer $token'},
  );
  return json.decode(response.body);
}

// Extract barangay ID from details
String extractBarangayId(Map<String, dynamic> barangayDetails) {
  return barangayDetails['id'].toString();
}
```

### Step 2: Show Download Progress Page
```dart
// Download progress screen
class OfflineDownloadScreen extends StatefulWidget {
  final String barangayId;
  
  const OfflineDownloadScreen({Key? key, required this.barangayId}) : super(key: key);
  
  @override
  _OfflineDownloadScreenState createState() => _OfflineDownloadScreenState();
}

class _OfflineDownloadScreenState extends State<OfflineDownloadScreen> {
  double progress = 0.0;
  String currentStep = 'Initializing...';
  
  @override
  void initState() {
    super.initState();
    _startDownloadProcess();
  }
  
  Future<void> _startDownloadProcess() async {
    try {
      // Step 1: Download polygon data
      setState(() {
        currentStep = 'Downloading barangay polygon...';
        progress = 0.1;
      });
      
      final barangayData = await fetchBarangayData(widget.barangayId);
      await storeBarangayPolygon(widget.barangayId, barangayData);
      
      setState(() {
        currentStep = 'Calculating map area...';
        progress = 0.3;
      });
      
      // Step 2: Calculate bounding box
      final coordinates = extractCoordinates(barangayData);
      final bounds = calculateBoundingBox(coordinates);
      
      setState(() {
        currentStep = 'Downloading map tiles...';
        progress = 0.5;
      });
      
      // Step 3: Download map tiles
      await downloadMapTiles(bounds);
      
      setState(() {
        currentStep = 'Finalizing offline data...';
        progress = 0.9;
      });
      
      // Step 4: Complete setup
      await _completeSetup();
      
      setState(() {
        currentStep = 'Download complete!';
        progress = 1.0;
      });
      
      // Navigate to dashboard after completion
      Future.delayed(Duration(seconds: 1), () {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => DashboardScreen()),
        );
      });
      
    } catch (e) {
      setState(() {
        currentStep = 'Error: $e';
      });
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(value: progress),
            SizedBox(height: 20),
            Text(currentStep, style: TextStyle(fontSize: 16)),
            SizedBox(height: 10),
            Text('${(progress * 100).toInt()}%', style: TextStyle(fontSize: 14)),
          ],
        ),
      ),
    );
  }
}
```

### Step 3: Integration with Login Flow
```dart
// In your login success handler
void onLoginSuccess() async {
  try {
    // 1. Get barangay details after login
    final barangayDetails = await fetchBarangayDetails();
    final barangayId = extractBarangayId(barangayDetails);
    
    // 2. Navigate to download progress screen
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => OfflineDownloadScreen(barangayId: barangayId),
      ),
    );
  } catch (e) {
    // Handle error - maybe show error dialog or skip to dashboard
    print('Error getting barangay details: $e');
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => DashboardScreen()),
    );
  }
}
```

### Step 4: Fetch Barangay GeoJSON Data
```dart
// Fetch barangay GeoJSON data using the barangay ID
Future<Map<String, dynamic>> fetchBarangayData(String barangayId) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/gis/public/geojson/barangays/$barangayId')
  );
  return json.decode(response.body);
}
```

### Step 2: Store Polygon Data in SQLite
```sql
-- Create table for barangay polygons
CREATE TABLE barangay_polygons (
  id INTEGER PRIMARY KEY,
  barangay_id TEXT NOT NULL,
  geojson_data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

```dart
// Store GeoJSON in SQLite
Future<void> storeBarangayPolygon(String barangayId, Map<String, dynamic> geojson) async {
  final db = await database;
  await db.insert('barangay_polygons', {
    'barangay_id': barangayId,
    'geojson_data': json.encode(geojson),
  });
}
```

### Step 3: Calculate Bounding Box from Polygon
```dart
// Extract coordinates and calculate bounding box
Map<String, double> calculateBoundingBox(List<List<double>> coordinates) {
  double minLat = coordinates[0][1];
  double maxLat = coordinates[0][1];
  double minLng = coordinates[0][0];
  double maxLng = coordinates[0][0];
  
  for (var coord in coordinates) {
    minLat = math.min(minLat, coord[1]);
    maxLat = math.max(maxLat, coord[1]);
    minLng = math.min(minLng, coord[0]);
    maxLng = math.max(maxLng, coord[0]);
  }
  
  return {
    'minLat': minLat,
    'maxLat': maxLat,
    'minLng': minLng,
    'maxLng': maxLng,
  };
}
```

### Step 4: Download Map Tiles for Bounding Box
```dart
// Download tiles for specific area
Future<void> downloadMapTiles(Map<String, double> bounds) async {
  // Calculate tile coordinates for zoom levels 10-16
  for (int zoom = 10; zoom <= 16; zoom++) {
    int minTileX = ((bounds['minLng']! + 180) / 360 * math.pow(2, zoom)).floor();
    int maxTileX = ((bounds['maxLng']! + 180) / 360 * math.pow(2, zoom)).floor();
    int minTileY = ((1 - math.log(math.tan(bounds['maxLat']! * math.pi / 180) + 
        1 / math.cos(bounds['maxLat']! * math.pi / 180)) / math.pi) / 2 * math.pow(2, zoom)).floor();
    int maxTileY = ((1 - math.log(math.tan(bounds['minLat']! * math.pi / 180) + 
        1 / math.cos(bounds['minLat']! * math.pi / 180)) / math.pi) / 2 * math.pow(2, zoom)).floor();
    
    for (int x = minTileX; x <= maxTileX; x++) {
      for (int y = minTileY; y <= maxTileY; y++) {
        await downloadTile(zoom, x, y);
      }
    }
  }
}
```

### Step 5: Store Map Tiles in SQLite
```sql
-- Create table for map tiles
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

```dart
// Store tile in SQLite
Future<void> storeMapTile(int zoom, int x, int y, Uint8List tileData) async {
  final db = await database;
  await db.insert('map_tiles', {
    'zoom_level': zoom,
    'tile_x': x,
    'tile_y': y,
    'tile_data': tileData,
  }, conflictAlgorithm: ConflictAlgorithm.replace);
}
```

### Step 6: Offline Map Rendering
```dart
// Custom tile provider for offline tiles
class OfflineTileProvider extends TileProvider {
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) {
    return OfflineTileImage(
      zoom: coordinates.z,
      x: coordinates.x,
      y: coordinates.y,
    );
  }
}

class OfflineTileImage extends ImageProvider<OfflineTileImage> {
  final int zoom;
  final int x;
  final int y;
  
  OfflineTileImage({required this.zoom, required this.x, required this.y});
  
  @override
  Future<ImageInfo> load(OfflineTileImage key, ImageDecoderCallback decode) async {
    final db = await database;
    final result = await db.query(
      'map_tiles',
      where: 'zoom_level = ? AND tile_x = ? AND tile_y = ?',
      whereArgs: [key.zoom, key.x, key.y],
    );
    
    if (result.isNotEmpty) {
      final tileData = result.first['tile_data'] as Uint8List;
      final codec = await ui.instantiateImageCodec(tileData);
      final frame = await codec.getNextFrame();
      return ImageInfo(image: frame.image);
    }
    
    throw Exception('Tile not found');
  }
}
```

### Step 7: Load Barangay Polygon for Display
```dart
// Load polygon from SQLite
Future<Map<String, dynamic>> loadBarangayPolygon(String barangayId) async {
  final db = await database;
  final result = await db.query(
    'barangay_polygons',
    where: 'barangay_id = ?',
    whereArgs: [barangayId],
  );
  
  if (result.isNotEmpty) {
    return json.decode(result.first['geojson_data'] as String);
  }
  
  throw Exception('Barangay polygon not found');
}
```

### Step 8: Complete Offline Implementation
```dart
// Main function to setup offline mapping
Future<void> setupOfflineMapping(String barangayId) async {
  try {
    // 1. Fetch barangay data
    final barangayData = await fetchBarangayData(barangayId);
    
    // 2. Store polygon data
    await storeBarangayPolygon(barangayId, barangayData);
    
    // 3. Calculate bounding box
    final coordinates = extractCoordinates(barangayData);
    final bounds = calculateBoundingBox(coordinates);
    
    // 4. Download and store map tiles
    await downloadMapTiles(bounds);
    
    print('Offline mapping setup completed for barangay: $barangayId');
  } catch (e) {
    print('Error setting up offline mapping: $e');
  }
}
```

## Database Schema Summary

### Tables Created:
1. **barangay_polygons** - Stores GeoJSON polygon data
2. **map_tiles** - Stores map tile images as BLOB data

### Key Features:
- **Polygon data** - Stored as TEXT (GeoJSON format)
- **Map tiles** - Stored as BLOB (image data)
- **Spatial queries** - SQLite can handle coordinate-based queries
- **Offline rendering** - Mobile mapping libraries read from SQLite

## Usage Flow:
1. User logs in → Get barangay ID
2. Fetch barangay GeoJSON from API
3. Store polygon in SQLite
4. Calculate bounding box from polygon
5. Download map tiles for that area
6. Store tiles in SQLite
7. Render offline map with polygon overlay

## Benefits:
- ✅ Complete offline functionality
- ✅ Minimal storage (only required area)
- ✅ Fast rendering from local SQLite
- ✅ No internet required after setup
- ✅ Accurate lat/lng coordinates maintained
