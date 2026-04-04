import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../../data/database/database_helper.dart';
import 'api_service.dart';

class OfflineMappingService {
  static final OfflineMappingService _instance = OfflineMappingService._internal();
  factory OfflineMappingService() => _instance;
  OfflineMappingService._internal();

  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final ApiService _apiService = ApiService();
  
  // Public getter for API service
  ApiService get apiService => _apiService;

  /// Fetch barangay details after login to get barangay ID
  Future<Map<String, dynamic>> fetchBarangayDetails() async {
    try {
      print('🗺️ OFFLINE MAPPING - API Service Base URL: ${_apiService.dio.options.baseUrl}');
      print('🗺️ OFFLINE MAPPING - Fetching barangay details from: ${_apiService.dio.options.baseUrl}/barangays/details');
      
      final response = await _apiService.dio.get('/barangays/details');
      
      if (response.statusCode == 200) {
        return response.data;
      } else {
        throw Exception('Failed to fetch barangay details: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch barangay details: $e');
    }
  }

  /// Extract barangay ID from details
  String extractBarangayId(Map<String, dynamic> barangayDetails) {
    return barangayDetails['id'].toString();
  }

  /// Fetch barangay GeoJSON data using the barangay ID
  Future<Map<String, dynamic>> fetchBarangayData(String barangayId) async {
    try {
      // Ensure API service is initialized with custom IP from login
      if (!_apiService.dio.options.baseUrl.isNotEmpty) {
        print('⚠️ OFFLINE MAPPING - API service not initialized, initializing with default config');
        await _apiService.initialize();
      } else {
        print('🌐 OFFLINE MAPPING - Using existing API service with base URL: ${_apiService.dio.options.baseUrl}');
        print('🌐 OFFLINE MAPPING - Using custom IP: ${_apiService.isUsingCustomIp}');
      }
      
      final endpoint = ApiConfig.getBarangayGeojsonEndpoint(int.parse(barangayId));
      final fullUrl = '${_apiService.dio.options.baseUrl}$endpoint';
      print('🗺️ OFFLINE MAPPING - API Service Base URL: ${_apiService.dio.options.baseUrl}');
      print('🗺️ OFFLINE MAPPING - Using Custom IP: ${_apiService.isUsingCustomIp}');
      print('🗺️ OFFLINE MAPPING - Current Base URL: ${_apiService.currentBaseUrl}');
      print('🗺️ OFFLINE MAPPING - Fetching barangay data from: $fullUrl');
      
      final response = await _apiService.dio.get(endpoint);
      
      print('🗺️ OFFLINE MAPPING - Response status: ${response.statusCode}');
      print('🗺️ OFFLINE MAPPING - Response data: ${response.data}');
      
      if (response.statusCode == 200) {
        return response.data;
      } else {
        throw Exception('Failed to fetch barangay data: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch barangay data: $e');
    }
  }

  /// Store GeoJSON in SQLite
  Future<void> storeBarangayPolygon(String barangayId, Map<String, dynamic> geojson) async {
    await _dbHelper.storeBarangayPolygon(barangayId, geojson);
  }

  /// Load barangay polygon from SQLite
  Future<Map<String, dynamic>?> loadBarangayPolygon(String barangayId) async {
    return await _dbHelper.loadBarangayPolygon(barangayId);
  }

  /// Extract coordinates from GeoJSON (handles both Polygon and MultiPolygon)
  List<List<double>> extractCoordinates(Map<String, dynamic> geojson) {
    try {
      print('🗺️ Extracting coordinates from GeoJSON...');
      final features = geojson['features'] as List;
      print('🗺️ Found ${features.length} features');
      
      if (features.isNotEmpty) {
        final geometry = features[0]['geometry'];
        final geometryType = geometry['type'] as String;
        print('🗺️ Geometry type: $geometryType');
        
        if (geometryType == 'Polygon') {
          final coordinates = geometry['coordinates'][0] as List;
          print('🗺️ Polygon with ${coordinates.length} coordinate points');
          return coordinates.map<List<double>>((coord) => [coord[0].toDouble(), coord[1].toDouble()]).toList();
        } else if (geometryType == 'MultiPolygon') {
          print('🗺️ Processing MultiPolygon...');
          final multiPolygonCoords = geometry['coordinates'] as List;
          print('🗺️ MultiPolygon has ${multiPolygonCoords.length} polygons');
          
          List<List<double>> allCoordinates = [];
          
          // Process each polygon in the MultiPolygon
          for (int i = 0; i < multiPolygonCoords.length; i++) {
            final polygonCoords = multiPolygonCoords[i] as List;
            print('🗺️ Polygon $i has ${polygonCoords.length} rings');
            
            // Take the first ring (exterior ring) of each polygon
            if (polygonCoords.isNotEmpty) {
              final exteriorRing = polygonCoords[0] as List;
              print('🗺️ Exterior ring has ${exteriorRing.length} points');
              
              final ringCoordinates = exteriorRing.map<List<double>>((coord) => 
                [coord[0].toDouble(), coord[1].toDouble()]).toList();
              allCoordinates.addAll(ringCoordinates);
            }
          }
          
          print('🗺️ Extracted ${allCoordinates.length} total coordinate points from MultiPolygon');
          return allCoordinates;
        }
      }
    } catch (e) {
      print('🗺️ Error extracting coordinates: $e');
    }
    return [];
  }

  /// Calculate bounding box from coordinates with small buffer
  Map<String, double> calculateBoundingBox(List<List<double>> coordinates, {double bufferKm = 0.2}) {
    if (coordinates.isEmpty) {
      throw Exception('No coordinates found in polygon data');
    }
    
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
    
    // Add small buffer (200m) to create minimal area around polygon
    final latBuffer = bufferKm / 111.0; // Approximate km per degree latitude
    final lngBuffer = bufferKm / (111.0 * math.cos(minLat * math.pi / 180)); // Adjust for longitude
    
    final bufferedMinLat = minLat - latBuffer;
    final bufferedMaxLat = maxLat + latBuffer;
    final bufferedMinLng = minLng - lngBuffer;
    final bufferedMaxLng = maxLng + lngBuffer;
    
    print('🗺️ Original bounds: lat($minLat-$maxLat), lng($minLng-$maxLng)');
    print('🗺️ Buffered bounds (${bufferKm}km buffer): lat($bufferedMinLat-$bufferedMaxLat), lng($bufferedMinLng-$bufferedMaxLng)');
    
    return {
      'minLat': bufferedMinLat,
      'maxLat': bufferedMaxLat,
      'minLng': bufferedMinLng,
      'maxLng': bufferedMaxLng,
    };
  }

  /// Download tiles for specific area with progress tracking (optimized for storage)
  Future<void> downloadMapTiles(String barangayId, Map<String, double> bounds) async {
    print('🗺️ Starting optimized tile download for bounds: $bounds');
    
    int totalTiles = 0;
    int downloadedTiles = 0;
    
    // Use selective zoom levels: household viewing (10-18)
    final zoomLevels = [10, 11, 12, 13, 14, 15, 16, 17, 18];
    
    // Calculate total tiles needed first
    for (int zoom in zoomLevels) {
      final minTileX = ((bounds['minLng']! + 180) / 360 * math.pow(2, zoom)).floor();
      final maxTileX = ((bounds['maxLng']! + 180) / 360 * math.pow(2, zoom)).floor();
      final minTileY = ((1 - math.log(math.tan(bounds['maxLat']! * math.pi / 180) + 
          1 / math.cos(bounds['maxLat']! * math.pi / 180)) / math.pi) / 2 * math.pow(2, zoom)).floor();
      final maxTileY = ((1 - math.log(math.tan(bounds['minLat']! * math.pi / 180) + 
          1 / math.cos(bounds['minLat']! * math.pi / 180)) / math.pi) / 2 * math.pow(2, zoom)).floor();
      
      final tilesForZoom = (maxTileX - minTileX + 1) * (maxTileY - minTileY + 1);
      totalTiles += tilesForZoom;
      print('🗺️ Zoom $zoom: ${tilesForZoom} tiles (${minTileX}-${maxTileX} x ${minTileY}-${maxTileY})');
    }
    
    print('🗺️ Total tiles to download: $totalTiles (selective zoom levels: ${zoomLevels.join(', ')})');
    
    // Download tiles for selective zoom levels
    for (int zoom in zoomLevels) {
      final minTileX = ((bounds['minLng']! + 180) / 360 * math.pow(2, zoom)).floor();
      final maxTileX = ((bounds['maxLng']! + 180) / 360 * math.pow(2, zoom)).floor();
      final minTileY = ((1 - math.log(math.tan(bounds['maxLat']! * math.pi / 180) + 
          1 / math.cos(bounds['maxLat']! * math.pi / 180)) / math.pi) / 2 * math.pow(2, zoom)).floor();
      final maxTileY = ((1 - math.log(math.tan(bounds['minLat']! * math.pi / 180) + 
          1 / math.cos(bounds['minLat']! * math.pi / 180)) / math.pi) / 2 * math.pow(2, zoom)).floor();
      
      print('🗺️ Downloading zoom level $zoom: tiles ${minTileX}-${maxTileX} x ${minTileY}-${maxTileY}');
      
      for (int x = minTileX; x <= maxTileX; x++) {
        for (int y = minTileY; y <= maxTileY; y++) {
          await downloadTile(barangayId, zoom, x, y);
          downloadedTiles++;
          
          if (downloadedTiles % 5 == 0) {
            print('🗺️ Progress: $downloadedTiles/$totalTiles tiles downloaded (${(downloadedTiles/totalTiles*100).toStringAsFixed(1)}%)');
          }
        }
      }
    }
    
    print('🗺️ Optimized tile download completed: $downloadedTiles tiles downloaded');
    print('🗺️ Estimated storage: ~${(downloadedTiles * 15 / 1024).toStringAsFixed(1)} MB');
  }

  /// Download individual tile
  Future<void> downloadTile(String barangayId, int zoom, int x, int y) async {
    try {
      // Use OpenStreetMap tiles as an example
      final tileUrl = 'https://tile.openstreetmap.org/$zoom/$x/$y.png';
      final response = await http.get(Uri.parse(tileUrl));
      
      if (response.statusCode == 200) {
        await _dbHelper.storeMapTile(barangayId, zoom, x, y, response.bodyBytes);
      }
    } catch (e) {
      print('Error downloading tile $zoom/$x/$y: $e');
    }
  }

  /// Load map tile from SQLite
  Future<Uint8List?> loadMapTile(String barangayId, int zoom, int x, int y) async {
    return await _dbHelper.loadMapTile(barangayId, zoom, x, y);
  }

  /// Check if barangay polygon exists
  Future<bool> hasBarangayPolygon(String barangayId) async {
    return await _dbHelper.hasBarangayPolygon(barangayId);
  }

  /// Get count of stored map tiles
  Future<int> getMapTileCount() async {
    return await _dbHelper.getMapTileCount();
  }

  /// Main function to setup offline mapping with polygon-based approach
  Future<void> setupOfflineMapping(String barangayId) async {
    try {
      print('🗺️ Starting offline mapping setup for barangay: $barangayId');
      
      // 1. Check if polygon already exists in database
      final existingPolygon = await loadBarangayPolygon(barangayId);
      Map<String, dynamic> barangayData;
      
      if (existingPolygon != null) {
        print('🗺️ Using existing polygon data from database');
        barangayData = existingPolygon;
      } else {
        print('🗺️ Fetching polygon data from API');
        barangayData = await fetchBarangayData(barangayId);
        await storeBarangayPolygon(barangayId, barangayData);
      }
      
      // 2. Extract coordinates and calculate bounding box with buffer
      print('🗺️ Raw polygon data structure:');
      print('🗺️ - Type: ${barangayData['type']}');
      print('🗺️ - Features count: ${(barangayData['features'] as List).length}');
      
      final coordinates = extractCoordinates(barangayData);
      if (coordinates.isEmpty) {
        print('🗺️ ❌ No coordinates extracted from polygon data');
        print('🗺️ Polygon data keys: ${barangayData.keys}');
        throw Exception('No coordinates found in polygon data');
      }
      
      print('🗺️ ✅ Extracted ${coordinates.length} coordinate points');
      
      // 3. Calculate bounding box with small buffer for minimal area
      final bounds = calculateBoundingBox(coordinates, bufferKm: 0.2); // 200m buffer
      
      // 4. Calculate centroid for reference
      final centroid = _calculateCentroid(coordinates);
      print('🗺️ Polygon centroid: ${centroid['lat']}, ${centroid['lng']}');
      
      // 5. Download and store map tiles for the calculated area
      await downloadMapTiles(barangayId, bounds);
      
      print('🗺️ Offline mapping setup completed for barangay: $barangayId');
      print('🗺️ Polygon centered at: ${centroid['lat']}, ${centroid['lng']}');
      print('🗺️ Download area: lat(${bounds['minLat']}-${bounds['maxLat']}), lng(${bounds['minLng']}-${bounds['maxLng']})');
    } catch (e) {
      print('🗺️ Error setting up offline mapping: $e');
      rethrow;
    }
  }
  
  /// Calculate centroid of polygon coordinates
  Map<String, double> _calculateCentroid(List<List<double>> coordinates) {
    double totalLat = 0;
    double totalLng = 0;
    
    for (var coord in coordinates) {
      totalLat += coord[1];
      totalLng += coord[0];
    }
    
    return {
      'lat': totalLat / coordinates.length,
      'lng': totalLng / coordinates.length,
    };
  }

  /// Clear all offline mapping data
  Future<void> clearOfflineMappingData() async {
    await _dbHelper.clearOfflineMappingData();
  }

  /// Clear offline mapping data for specific barangay
  Future<void> clearBarangayOfflineData(String barangayId) async {
    await _dbHelper.clearBarangayOfflineData(barangayId);
  }

}
