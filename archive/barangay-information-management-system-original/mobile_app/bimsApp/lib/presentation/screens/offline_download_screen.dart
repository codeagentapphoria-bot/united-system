import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:math' as math;
import '../../core/config/api_config.dart';
import '../../data/database/database_helper.dart';
import '../../core/services/offline_mapping_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../core/services/classification_sync_service.dart';
import '../../core/services/api_service.dart';
import 'home_screen.dart';

// Import for imageCache access
import 'package:flutter/painting.dart' show imageCache;

class OfflineDownloadScreen extends StatefulWidget {
  final String barangayId;
  
  const OfflineDownloadScreen({Key? key, required this.barangayId}) : super(key: key);
  
  @override
  _OfflineDownloadScreenState createState() => _OfflineDownloadScreenState();
}

class _OfflineDownloadScreenState extends State<OfflineDownloadScreen> {
  final OfflineMappingService _mappingService = OfflineMappingService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  final ClassificationSyncService _classificationSync = ClassificationSyncService();
  final ApiService _apiService = ApiService();
  double progress = 0.0;
  String currentStep = 'Starting automatic download...';
  String errorMessage = '';
  bool hasError = false;
  bool isDownloading = false;
  bool downloadCompleted = false;
  
  @override
  void initState() {
    super.initState();
    // Auto-start download after initialization
    print('🗺️ OFFLINE DOWNLOAD SCREEN - Initialized for barangay: ${widget.barangayId}');
    // Start download automatically after a short delay
    Future.delayed(const Duration(milliseconds: 500), () {
      _startDownloadProcess();
    });
  }
  
  Future<void> _startDownloadProcess() async {
    if (isDownloading) return;
    
    print('🗺️ OFFLINE DOWNLOAD - Starting download process for barangay: ${widget.barangayId}');
    
    setState(() {
      isDownloading = true;
      hasError = false;
      errorMessage = '';
      downloadCompleted = false;
    });
    
    try {
      // Step 1: Always fetch and store fresh polygon data
      setState(() {
        currentStep = 'Downloading polygon data...';
        progress = 0.1;
      });
      
      final dbHelper = DatabaseHelper.instance;
      Map<String, dynamic> barangayData;
      
      // Always fetch fresh polygon data (in case it was cleared during login)
      print('🗺️ OFFLINE DOWNLOAD - Fetching fresh polygon data from API');
      try {
        barangayData = await _fetchBarangayData(widget.barangayId);
        print('🗺️ OFFLINE DOWNLOAD - ✅ Polygon data fetched from API');
        print('🗺️ OFFLINE DOWNLOAD - Data type: ${barangayData['type']}, features: ${(barangayData['features'] as List?)?.length ?? 0}');
        
        await _storeBarangayPolygon(widget.barangayId, barangayData);
        print('🗺️ OFFLINE DOWNLOAD - ✅ Polygon data stored in database');
        
        // Verify it was stored correctly
        final verifyPolygon = await dbHelper.loadBarangayPolygon(widget.barangayId);
        if (verifyPolygon != null) {
          print('🗺️ OFFLINE DOWNLOAD - ✅ Polygon storage verified');
        } else {
          print('🗺️ OFFLINE DOWNLOAD - ⚠️ WARNING: Polygon not found after storage!');
        }
        
        setState(() {
          currentStep = 'Polygon data downloaded';
          progress = 0.2;
        });
      } catch (e) {
        print('🗺️ OFFLINE DOWNLOAD - ❌ Error fetching/storing polygon: $e');
        print('🗺️ OFFLINE DOWNLOAD - Error type: ${e.runtimeType}');
        print('🗺️ OFFLINE DOWNLOAD - Error details: ${e.toString()}');
        
        // Try to use existing polygon as fallback
        final existingPolygon = await dbHelper.loadBarangayPolygon(widget.barangayId);
        if (existingPolygon != null) {
          print('🗺️ OFFLINE DOWNLOAD - Using existing polygon data as fallback');
          barangayData = existingPolygon;
        } else {
          print('🗺️ OFFLINE DOWNLOAD - ❌ CRITICAL: No polygon data available!');
          throw Exception('Failed to fetch polygon data and no backup available: $e');
        }
      }
      
      setState(() {
        currentStep = 'Checking existing tiles...';
        progress = 0.3;
      });
      
      // Step 2: Check if tiles exist for THIS SPECIFIC barangay
      final existingTileCount = await dbHelper.getMapTileCountForBarangay(widget.barangayId);
      final totalTileCount = await dbHelper.getMapTileCount();
      
      print('🗺️ OFFLINE DOWNLOAD - Tiles for this barangay (${widget.barangayId}): $existingTileCount');
      print('🗺️ OFFLINE DOWNLOAD - Total tiles in database: $totalTileCount');
      
      if (existingTileCount > 10) {
        // Tiles exist for THIS barangay, skip download
        print('🗺️ OFFLINE DOWNLOAD - Sufficient tiles already exist for this barangay, skipping download');
        setState(() {
          currentStep = 'Offline data already available';
          progress = 0.9;
        });
      } else {
        // Check if tiles exist for OTHER barangays
        if (totalTileCount > 0) {
          // Tiles exist but for different barangay - clear them first
          print('🗺️ OFFLINE DOWNLOAD - Found $totalTileCount tiles from other barangay(s)');
          print('🗺️ OFFLINE DOWNLOAD - Clearing old tiles before downloading new ones...');
          
          setState(() {
            currentStep = 'Clearing old map data...';
            progress = 0.35;
          });
          
          try {
            await dbHelper.clearAllOfflineMapData();
            print('🗺️ OFFLINE DOWNLOAD - Old tiles cleared successfully');
            
            // Re-store the polygon since clearAllOfflineMapData() deleted it
            print('🗺️ OFFLINE DOWNLOAD - Re-storing polygon after cleanup...');
            await _storeBarangayPolygon(widget.barangayId, barangayData);
            
            // Verify it was re-stored
            final verifyRestore = await dbHelper.loadBarangayPolygon(widget.barangayId);
            if (verifyRestore != null) {
              print('🗺️ OFFLINE DOWNLOAD - ✅ Polygon re-stored successfully after cleanup');
            } else {
              print('🗺️ OFFLINE DOWNLOAD - ⚠️ WARNING: Failed to re-store polygon after cleanup!');
            }
            
            // Also clear Flutter's image cache
            if (mounted) {
              imageCache.clear();
              imageCache.clearLiveImages();
              print('🗺️ OFFLINE DOWNLOAD - Image cache cleared');
            }
          } catch (e) {
            print('🗺️ OFFLINE DOWNLOAD - Error clearing old tiles: $e');
          }
        }
        
        // Step 3: Download tiles for THIS barangay
        setState(() {
          currentStep = 'Downloading...';
          progress = 0.4;
        });
        
        final coordinates = _extractCoordinates(barangayData);
        final bounds = _calculateBoundingBox(coordinates);
        
        setState(() {
          currentStep = 'Preparing tile download...';
          progress = 0.45;
        });
        
        // Step 4: Download map tiles
        print('🗺️ OFFLINE DOWNLOAD - Starting tile download for barangay ${widget.barangayId}');
        setState(() {
          currentStep = 'Starting tile download...';
          progress = 0.5;
        });
        
        await _downloadMapTiles(widget.barangayId, bounds);
        print('🗺️ OFFLINE DOWNLOAD - Tile download completed');
      }
      
      setState(() {
        currentStep = 'Finalizing download...';
        progress = 0.9;
      });
      
      // Step 4: Complete setup
      await _completeSetup();
      
      // Step 5: Verify download (BOTH tiles AND polygon)
      setState(() {
        currentStep = 'Verifying downloaded data...';
        progress = 0.95;
      });
      
      final tileCount = await dbHelper.getMapTileCount();
      final polygonExists = await dbHelper.hasBarangayPolygon(widget.barangayId);
      
      print('🗺️ ═══════════════════════════════');
      print('🗺️ VERIFICATION RESULTS:');
      print('🗺️ ═══════════════════════════════');
      print('🗺️ Tiles: $tileCount');
      print('🗺️ Polygon exists: $polygonExists');
      print('🗺️ Barangay ID: ${widget.barangayId}');
      
      if (!polygonExists) {
        print('🗺️ ⚠️ CRITICAL WARNING: Polygon data missing!');
        print('🗺️ Maps will not work without polygon data!');
      }
      print('🗺️ ═══════════════════════════════');
      
      setState(() {
        currentStep = 'Setup complete! ($tileCount tiles, polygon: ${polygonExists ? "✓" : "✗"})';
        progress = 1.0;
        downloadCompleted = true;
        isDownloading = false;
      });
      
      // Fetch classifications and puroks from server before navigating
      await _fetchInitialData();
      
      // Navigate to dashboard after completion
      Future.delayed(const Duration(seconds: 2), () {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
      });
      
    } catch (e) {
      setState(() {
        currentStep = 'Download failed';
        hasError = true;
        isDownloading = false;
      });
      
      // Provide more user-friendly error messages
      if (e.toString().contains('404')) {
        setState(() {
          errorMessage = 'GIS data not available for this barangay. The server may not have the required geographic data. Please contact your administrator.';
        });
      } else if (e.toString().contains('SocketException') || e.toString().contains('NetworkException')) {
        setState(() {
          errorMessage = 'Network connection error. Please check your internet connection and try again.';
        });
      } else if (e.toString().contains('TimeoutException')) {
        setState(() {
          errorMessage = 'Download timed out. Please check your internet connection and try again.';
        });
      } else {
        setState(() {
          errorMessage = 'Download failed: ${e.toString()}';
        });
      }
      
      print('🗺️ OFFLINE DOWNLOAD - Error occurred: $e');
    }
  }
  
  /// Fetch classifications and puroks from server on login
  Future<void> _fetchInitialData() async {
    try {
      print('🔄 AUTO-FETCH - Starting automatic data fetch...');
      
      // Get municipality ID from user data
      final userData = await _offlineAuth.getCurrentUser();
      int? municipalityId;
      
      if (userData?.targetType == 'municipality') {
        municipalityId = userData?.targetId;
      } else if (userData?.targetType == 'barangay') {
        // Get municipality ID from barangay data
        final barangayId = userData?.targetId;
        if (barangayId != null) {
          try {
            final dbHelper = DatabaseHelper.instance;
            final db = await dbHelper.database;
            final barangays = await db.query(
              'barangays',
              where: 'id = ?',
              whereArgs: [barangayId],
            );
            if (barangays.isNotEmpty) {
              municipalityId = barangays.first['municipality_id'] as int?;
            }
          } catch (e) {
            print('🔄 AUTO-FETCH - Error getting municipality ID: $e');
          }
        }
      }
      
      if (municipalityId == null) {
        print('🔄 AUTO-FETCH - Municipality ID not found, skipping');
        return;
      }
      
      print('🔄 AUTO-FETCH - Municipality ID: $municipalityId');
      
      // Fetch classifications
      print('🔄 AUTO-FETCH - Fetching classifications from server...');
      try {
        final classSuccess = await _classificationSync.fetchClassificationTypesFromServer(municipalityId);
        if (classSuccess) {
          print('✅ AUTO-FETCH - Classifications updated from server');
        } else {
          print('⚠️ AUTO-FETCH - Classifications fetch returned false');
        }
      } catch (e) {
        print('⚠️ AUTO-FETCH - Error fetching classifications: $e');
      }
      
      // Fetch puroks
      print('🔄 AUTO-FETCH - Fetching puroks from server...');
      try {
        final barangayId = userData?.targetId;
        if (barangayId != null) {
          final response = await _apiService.dio.get(
            '/puroks',
            queryParameters: {'barangay_id': barangayId},
          );
          
          if (response.statusCode == 200) {
            final data = response.data;
            if (data['data'] != null) {
              final serverPuroks = data['data'] as List;
              print('✅ AUTO-FETCH - Fetched ${serverPuroks.length} puroks from server');
              
              // Get server IDs that exist on server
              final serverIds = serverPuroks.map((p) => p['id']).toSet();
              
              // Update local database with server data
              final dbHelper = DatabaseHelper.instance;
              final db = await dbHelper.database;
              int updated = 0;
              int created = 0;
              int kept = 0;
              
              for (final serverPurok in serverPuroks) {
                try {
                  final existing = await db.query(
                    'puroks',
                    where: 'server_id = ?',
                    whereArgs: [serverPurok['id']],
                  );
                  
                  final purokData = {
                    'barangay_id': barangayId,
                    'name': serverPurok['name'],
                    'leader': serverPurok['leader'],
                    'description': serverPurok['description'],
                    'server_id': serverPurok['id'],
                    'sync_status': 'synced',
                  };
                  
                  if (existing.isNotEmpty) {
                    await db.update(
                      'puroks',
                      purokData,
                      where: 'id = ?',
                      whereArgs: [existing.first['id']],
                    );
                    updated++;
                  } else {
                    await db.insert('puroks', purokData);
                    created++;
                  }
                } catch (e) {
                  print('⚠️ AUTO-FETCH - Error processing purok ${serverPurok['name']}: $e');
                }
              }
              
              // Handle puroks deleted from server
              // Keep them if they're used by households (don't delete to preserve data integrity)
              final localPuroks = await db.query(
                'puroks',
                where: 'barangay_id = ? AND server_id IS NOT NULL',
                whereArgs: [barangayId],
              );
              
              for (final localPurok in localPuroks) {
                final serverId = localPurok['server_id'] as int?;
                if (serverId != null && !serverIds.contains(serverId)) {
                  // This purok was deleted on server
                  // Check if it's in use by any households
                  final inUse = await db.query(
                    'households',
                    where: 'purok_id = ?',
                    whereArgs: [localPurok['id']],
                    limit: 1,
                  );
                  
                  if (inUse.isNotEmpty) {
                    // Keep it (mark in description that it was deleted on server)
                    print('⚠️ Purok "${localPurok['name']}" deleted on server but used by households - keeping it');
                    await db.update(
                      'puroks',
                      {
                        'description': '${localPurok['description'] ?? ''} [Deleted on server]',
                      },
                      where: 'id = ?',
                      whereArgs: [localPurok['id']],
                    );
                    kept++;
                  } else {
                    // Not in use, safe to delete
                    print('🗑️ Deleting unused purok "${localPurok['name']}"');
                    await db.delete(
                      'puroks',
                      where: 'id = ?',
                      whereArgs: [localPurok['id']],
                    );
                  }
                }
              }
              
              print('✅ AUTO-FETCH - Puroks updated: $created created, $updated updated');
              if (kept > 0) {
                print('ℹ️ Note: $kept puroks were deleted on server but kept locally because they are used by households');
              }
            }
          }
        }
      } catch (e) {
        print('⚠️ AUTO-FETCH - Error fetching puroks: $e');
      }
      
      print('✅ AUTO-FETCH - Initial data fetch completed');
      
    } catch (e) {
      print('❌ AUTO-FETCH - Error in fetch initial data: $e');
      // Don't throw - allow navigation to continue even if fetch fails
    }
  }
  
  // Fetch barangay GeoJSON data using the barangay ID
  Future<Map<String, dynamic>> _fetchBarangayData(String barangayId) async {
    try {
      // Use OfflineMappingService which has the ApiService with custom IP
      final mappingService = OfflineMappingService();
      
      // Debug: Check API service status
      print('🗺️ OFFLINE DOWNLOAD - API Service Status:');
      print('   Base URL: ${mappingService.apiService.dio.options.baseUrl}');
      print('   Using Custom IP: ${mappingService.apiService.isUsingCustomIp}');
      print('   Current Base URL: ${mappingService.apiService.currentBaseUrl}');
      
      final endpoint = ApiConfig.getBarangayGeojsonEndpoint(int.parse(barangayId));
      final fullUrl = '${mappingService.apiService.dio.options.baseUrl}$endpoint';
      print('🗺️ OFFLINE DOWNLOAD - Fetching barangay data from: $fullUrl');
      
      final response = await mappingService.apiService.dio.get(endpoint);
      
      print('🗺️ OFFLINE DOWNLOAD - Response status: ${response.statusCode}');
      print('🗺️ OFFLINE DOWNLOAD - Response data: ${response.data}');
      
      if (response.statusCode == 200) {
        return response.data;
      } else {
        throw Exception('Failed to fetch barangay data: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to fetch barangay data: $e');
    }
  }
  
  // Store GeoJSON in SQLite
  Future<void> _storeBarangayPolygon(String barangayId, Map<String, dynamic> geojson) async {
    final dbHelper = DatabaseHelper.instance;
    await dbHelper.storeBarangayPolygon(barangayId, geojson);
  }
  
  // Extract coordinates from GeoJSON
  List<List<double>> _extractCoordinates(Map<String, dynamic> geojson) {
    try {
      print('🗺️ OFFLINE DOWNLOAD - Extracting coordinates from GeoJSON...');
      final features = geojson['features'] as List;
      print('🗺️ OFFLINE DOWNLOAD - Found ${features.length} features');
      
      if (features.isNotEmpty) {
        final geometry = features[0]['geometry'];
        print('🗺️ OFFLINE DOWNLOAD - Geometry type: ${geometry['type']}');
        
        if (geometry['type'] == 'Polygon') {
          final coordinates = geometry['coordinates'][0] as List;
          print('🗺️ OFFLINE DOWNLOAD - Found ${coordinates.length} coordinate points (Polygon)');
          return coordinates.map<List<double>>((coord) => [coord[0].toDouble(), coord[1].toDouble()]).toList();
        } else if (geometry['type'] == 'MultiPolygon') {
          // Handle MultiPolygon case - use the first polygon
          final coordinates = geometry['coordinates'][0][0] as List;
          print('🗺️ OFFLINE DOWNLOAD - Found ${coordinates.length} coordinate points (MultiPolygon)');
          return coordinates.map<List<double>>((coord) => [coord[0].toDouble(), coord[1].toDouble()]).toList();
        } else {
          print('🗺️ OFFLINE DOWNLOAD - Unsupported geometry type: ${geometry['type']}');
        }
      }
    } catch (e) {
      print('🗺️ OFFLINE DOWNLOAD - Error extracting coordinates: $e');
    }
    return [];
  }
  
  // Calculate bounding box from coordinates with small buffer
  Map<String, double> _calculateBoundingBox(List<List<double>> coordinates) {
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
    
    // Add small buffer (100m) to create minimal area around polygon
    final bufferKm = 0.1; // 100 meters buffer
    final latBuffer = bufferKm / 111.0; // Approximate km per degree latitude
    final lngBuffer = bufferKm / (111.0 * math.cos(minLat * math.pi / 180)); // Adjust for longitude
    
    print('🗺️ Bounding box calculation:');
    print('🗺️ Original bounds: lat ${minLat}-${maxLat}, lng ${minLng}-${maxLng}');
    print('🗺️ Buffer: ${bufferKm}km (${latBuffer}° lat, ${lngBuffer}° lng)');
    print('🗺️ Final bounds: lat ${minLat - latBuffer}-${maxLat + latBuffer}, lng ${minLng - lngBuffer}-${maxLng + lngBuffer}');
    
    return {
      'minLat': minLat - latBuffer,
      'maxLat': maxLat + latBuffer,
      'minLng': minLng - lngBuffer,
      'maxLng': maxLng + lngBuffer,
    };
  }
  
  // Download tiles for specific area (optimized for storage)
  Future<void> _downloadMapTiles(String barangayId, Map<String, double> bounds) async {
    print('🗺️ OFFLINE DOWNLOAD - _downloadMapTiles called with bounds: $bounds');
    
    int totalTiles = 0;
    int downloadedTiles = 0;
    
    // Use selective zoom levels: household viewing (10-18)
    // Zoom 10: Wide regional view
    // Zoom 11: City/municipality level
    // Zoom 12: District level
    // Zoom 13: Neighborhood overview
    // Zoom 14: Barangay overview
    // Zoom 15: Street level
    // Zoom 16: Household level
    // Zoom 17: Individual buildings clearly visible
    // Zoom 18: Detailed house view (tiny houses visible)
    final zoomLevels = [10, 11, 12, 13, 14, 15, 16, 17, 18];
    
    // Calculate total tiles needed first
    for (int zoom in zoomLevels) {
      final minTileX = ((bounds['minLng']! + 180) / 360 * math.pow(2, zoom)).floor();
      final maxTileX = ((bounds['maxLng']! + 180) / 360 * math.pow(2, zoom)).floor();
      final minTileY = ((1 - math.log(math.tan(bounds['maxLat']! * math.pi / 180) + 
          1 / math.cos(bounds['maxLat']! * math.pi / 180)) / math.pi) / 2 * math.pow(2, zoom)).floor();
      final maxTileY = ((1 - math.log(math.tan(bounds['minLat']! * math.pi / 180) + 
          1 / math.cos(bounds['minLat']! * math.pi / 180)) / math.pi) / 2 * math.pow(2, zoom)).floor();
      
      totalTiles += (maxTileX - minTileX + 1) * (maxTileY - minTileY + 1);
    }
    
    print('🗺️ Total tiles to download: $totalTiles (selective zoom levels: ${zoomLevels.join(', ')})');
    
    if (totalTiles == 0) {
      print('🗺️ WARNING: No tiles to download! This might be an issue with bounds calculation.');
      return;
    }
    
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
          await _mappingService.downloadTile(barangayId, zoom, x, y);
          downloadedTiles++;
          
          // Update UI progress during tile download
          final tileProgress = 0.5 + (downloadedTiles / totalTiles) * 0.4; // 50% to 90%
          final percentage = (downloadedTiles / totalTiles * 100).toStringAsFixed(1);
          
          if (mounted) {
            setState(() {
              progress = tileProgress;
              currentStep = 'Downloading tiles: $downloadedTiles/$totalTiles ($percentage%)';
            });
          }
          
          if (downloadedTiles % 5 == 0) {
            print('🗺️ Progress: $downloadedTiles/$totalTiles tiles downloaded ($percentage%)');
          }
        }
      }
    }
    
    print('🗺️ Optimized tile download completed: $downloadedTiles tiles downloaded');
    print('🗺️ Estimated storage: ~${(downloadedTiles * 15 / 1024).toStringAsFixed(1)} MB');
  }
  
  
  // Complete setup
  Future<void> _completeSetup() async {
    // Any final setup tasks can be added here
    await Future.delayed(const Duration(milliseconds: 500));
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
              // App Logo or Icon
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(60),
                ),
                child: const Icon(
                  Icons.map,
                  size: 40,
                  color: Colors.blue,
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Title
              const Text(
                'Setting Up Offline Maps',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 8),
              
              // Subtitle
              const Text(
                'Automatically downloading optimized map data for your barangay (minimal storage usage)',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
              
              const SizedBox(height: 20),
              
              // Progress Indicator
              Container(
                width: 150,
                height: 150,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Background circle
                    Container(
                      width: 150,
                      height: 150,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.grey.withOpacity(0.1),
                      ),
                    ),
                    // Progress circle
                    SizedBox(
                      width: 150,
                      height: 150,
                      child: isDownloading 
                        ? CircularProgressIndicator(
                            value: progress,
                            strokeWidth: 8,
                            backgroundColor: Colors.grey.withOpacity(0.2),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              hasError ? Colors.red : Colors.blue,
                            ),
                          )
                        : downloadCompleted
                          ? Container(
                              width: 150,
                              height: 150,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.green.withOpacity(0.1),
                                border: Border.all(color: Colors.green, width: 8),
                              ),
                              child: const SizedBox.shrink(),
                            )
                          : Container(
                              width: 150,
                              height: 150,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.grey.withOpacity(0.1),
                                border: Border.all(color: Colors.grey, width: 8),
                              ),
                              child: const Icon(
                                Icons.download,
                                size: 60,
                                color: Colors.grey,
                              ),
                            ),
                    ),
                    // Progress text
                    if (isDownloading) ...[
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${(progress * 100).toInt()}%',
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            hasError ? 'Error' : 'Progress',
                            style: TextStyle(
                              fontSize: 14,
                              color: hasError ? Colors.red : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ] else if (downloadCompleted) ...[
                      const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '100%',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '0%',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Ready',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Current Step
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                decoration: BoxDecoration(
                  color: hasError ? Colors.red.withOpacity(0.1) : Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: hasError ? Colors.red.withOpacity(0.3) : Colors.blue.withOpacity(0.3),
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      hasError ? Icons.error : Icons.info,
                      color: hasError ? Colors.red : Colors.blue,
                      size: 24,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      currentStep,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: hasError ? Colors.red : Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (hasError && errorMessage.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 300),
                        child: Text(
                          errorMessage,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.red,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 5,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Action Buttons
              if (hasError) ...[
                // Error state buttons
                Column(
                  children: [
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            setState(() {
                              progress = 0.0;
                              currentStep = 'Retrying download...';
                              errorMessage = '';
                              hasError = false;
                              isDownloading = false;
                              downloadCompleted = false;
                            });
                            _startDownloadProcess();
                          },
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry Download'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                        ),
                        ElevatedButton.icon(
                          onPressed: () async {
                            // Fetch classifications and puroks before skipping
                            await _fetchInitialData();
                            
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(builder: (context) => const HomeScreen()),
                            );
                          },
                          icon: const Icon(Icons.skip_next),
                          label: const Text('Skip & Continue'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.orange,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.orange.withOpacity(0.3)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline, color: Colors.orange, size: 20),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'You can skip the download and continue to the app. Offline maps can be downloaded later from the map screen.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.orange,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ] else if (downloadCompleted) ...[
                // Download completed state
                Column(
                  children: [
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.green.withOpacity(0.3)),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle, color: Colors.green, size: 24),
                          SizedBox(width: 8),
                          Text(
                            'Download completed successfully!',
                            style: TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Redirecting to home screen...',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    ),
    );
  }
}
