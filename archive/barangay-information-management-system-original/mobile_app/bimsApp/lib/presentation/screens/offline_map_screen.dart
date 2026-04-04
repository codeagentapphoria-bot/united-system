import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'dart:math' as math;
import 'dart:async';
import '../../core/services/offline_mapping_service.dart';
import '../../core/services/offline_tile_provider.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../data/database/database_helper.dart';
import '../../core/config/api_config.dart';

class OfflineMapScreen extends StatefulWidget {
  final String? barangayId; // Made optional - will fetch from secure storage if null
  
  const OfflineMapScreen({Key? key, this.barangayId}) : super(key: key);
  
  @override
  _OfflineMapScreenState createState() => _OfflineMapScreenState();
}

class _OfflineMapScreenState extends State<OfflineMapScreen> {
  final OfflineMappingService _mappingService = OfflineMappingService();
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  
  MapController? _mapController;
  Map<String, dynamic>? _barangayPolygon;
  LatLng? _center;
  bool _isLoading = true;
  bool _showPlaceholderTiles = false;
  String? _errorMessage;
  List<Map<String, dynamic>> _households = [];
  String? _currentBarangayId; // Store the actual barangay ID being used
  
  // Download states
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String _downloadStep = '';
  String? _downloadError;
  
  @override
  void initState() {
    super.initState();
    // Schedule the initialization for next frame to avoid blocking UI
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeBarangayAndLoadMap();
    });
  }
  
  Future<void> _initializeBarangayAndLoadMap() async {
    try {
      print('🗺️ OFFLINE MAP - Initializing...');
      
      // Always fetch fresh barangay ID from secure storage
      final barangayId = await _offlineAuth.getBarangayId();
      
      if (barangayId != null) {
        if (mounted) {
          setState(() {
            _currentBarangayId = barangayId.toString();
          });
        }
        print('🗺️ OFFLINE MAP - Using barangay ID from secure storage: $_currentBarangayId');
        
        // Load map data in background
        if (mounted) {
          await _loadMapData();
        }
      } else {
        print('🗺️ OFFLINE MAP - No barangay ID found');
        if (mounted) {
          setState(() {
            _errorMessage = 'Barangay information not found. Please log in again.';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      print('🗺️ OFFLINE MAP - Error during initialization: $e');
      if (mounted) {
        setState(() {
          _errorMessage = 'Error initializing map: $e';
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
  
  Future<void> _loadHouseholdCoordinates() async {
    try {
      final barangayId = int.tryParse(_currentBarangayId ?? '');
      final households = await _dbHelper.getHouseholdsWithCoordinates(barangayId);
      if (mounted) {
        setState(() {
          _households = households;
        });
      }
    } catch (e) {
      print('Error loading household coordinates: $e');
    }
  }

  Future<void> _loadMapData() async {
    if (_currentBarangayId == null) {
      print('🗺️ OFFLINE MAP SCREEN - No barangay ID available');
      return;
    }
    
    try {
      print('🗺️ OFFLINE MAP SCREEN - Loading map data');
      print('🗺️ OFFLINE MAP SCREEN - _currentBarangayId: $_currentBarangayId');
      print('🗺️ OFFLINE MAP SCREEN - barangayId type: ${_currentBarangayId.runtimeType}');
      
      // Check if tiles exist for this specific barangay
      final hasTiles = await _dbHelper.hasMapTilesForBarangay(_currentBarangayId!);
      final tileCount = await _dbHelper.getMapTileCountForBarangay(_currentBarangayId!);
      print('🗺️ OFFLINE MAP SCREEN - hasTiles: $hasTiles');
      print('🗺️ OFFLINE MAP SCREEN - tileCount: $tileCount');
      
      if (!hasTiles) {
        print('🗺️ No tiles found for barangay $_currentBarangayId, will show placeholder tiles');
        setState(() {
          _showPlaceholderTiles = true;
        });
        
        // Show a message to the user about downloading tiles
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('No offline tiles found for this barangay. Tap "Download Offline Data" to download tiles.'),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: 'Download',
                textColor: Colors.white,
                onPressed: () {
                  _startDownload();
                },
              ),
            ),
          );
        }
      } else {
        // Check if tiles have sufficient zoom levels for household viewing
        final hasHighZoomTiles = await _checkHighZoomTiles(_currentBarangayId!);
        if (!hasHighZoomTiles) {
          print('🗺️ Tiles exist but may not have zoom levels 14-18 for household viewing');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Tiles exist but may need zoom levels 14-18 for detailed household viewing. Tap "Download" to update tiles.'),
                backgroundColor: Colors.amber,
                duration: const Duration(seconds: 4),
                action: SnackBarAction(
                  label: 'Update',
                  textColor: Colors.white,
                  onPressed: () {
                    _startDownload();
                  },
                ),
              ),
            );
          }
        }
      }
      
      // Load barangay polygon data
      final polygonData = await _mappingService.loadBarangayPolygon(_currentBarangayId!);
      
      if (polygonData != null) {
        print('🗺️ Polygon data loaded successfully');
        setState(() {
          _barangayPolygon = polygonData;
          _center = _calculatePolygonCenter(polygonData);
          _isLoading = false;
        });
        
        // Load household coordinates
        await _loadHouseholdCoordinates();
        
        // Map will be centered when FlutterMap initializes
        if (_center != null) {
          print('🗺️ Map will center at: ${_center!.latitude}, ${_center!.longitude}');
          // Initialize map controller after data is loaded
          _mapController = MapController();
        }
      } else {
        print('🗺️ No polygon data found for barangay: $_currentBarangayId');
        setState(() {
          _errorMessage = 'No offline map data found for this barangay. Please download offline data first.';
          _isLoading = false;
        });
      }
    } catch (e) {
      print('🗺️ Error loading map data: $e');
      setState(() {
        _errorMessage = 'Error loading map data: $e';
        _isLoading = false;
      });
    }
  }
  
  LatLng _calculatePolygonCenter(Map<String, dynamic> polygonData) {
    try {
      print('🗺️ Calculating polygon center...');
      final features = polygonData['features'] as List;
      if (features.isNotEmpty) {
        final geometry = features[0]['geometry'];
        print('🗺️ Geometry type: ${geometry['type']}');
        
        if (geometry['type'] == 'Polygon') {
          final coordinates = geometry['coordinates'][0] as List;
          print('🗺️ Found ${coordinates.length} coordinate points');
          
          double totalLat = 0;
          double totalLng = 0;
          
          for (var coord in coordinates) {
            totalLat += coord[1].toDouble();
            totalLng += coord[0].toDouble();
          }
          
          final center = LatLng(
            totalLat / coordinates.length,
            totalLng / coordinates.length,
          );
          print('🗺️ Calculated center: ${center.latitude}, ${center.longitude}');
          return center;
        } else if (geometry['type'] == 'MultiPolygon') {
          // Handle MultiPolygon case
          final coordinates = geometry['coordinates'][0][0] as List;
          print('🗺️ Found MultiPolygon with ${coordinates.length} coordinate points');
          
          double totalLat = 0;
          double totalLng = 0;
          
          for (var coord in coordinates) {
            totalLat += coord[1].toDouble();
            totalLng += coord[0].toDouble();
          }
          
          final center = LatLng(
            totalLat / coordinates.length,
            totalLng / coordinates.length,
          );
          print('🗺️ Calculated center from MultiPolygon: ${center.latitude}, ${center.longitude}');
          return center;
        }
      }
    } catch (e) {
      print('🗺️ Error calculating polygon center: $e');
    }
    
    // Default center for Eastern Samar
    print('🗺️ Using default center: 11.5, 125.5');
    return const LatLng(11.5, 125.5);
  }
  
  List<LatLng> _extractPolygonCoordinates(Map<String, dynamic> polygonData) {
    try {
      print('🗺️ Extracting polygon coordinates...');
      final features = polygonData['features'] as List;
      if (features.isNotEmpty) {
        final geometry = features[0]['geometry'];
        print('🗺️ Geometry type for coordinates: ${geometry['type']}');
        
        if (geometry['type'] == 'Polygon') {
          final coordinates = geometry['coordinates'][0] as List;
          print('🗺️ Found ${coordinates.length} coordinate points for polygon');
          return coordinates.map((coord) => LatLng(coord[1].toDouble(), coord[0].toDouble())).toList();
        } else if (geometry['type'] == 'MultiPolygon') {
          // Handle MultiPolygon case - use the first polygon
          final coordinates = geometry['coordinates'][0][0] as List;
          print('🗺️ Found MultiPolygon with ${coordinates.length} coordinate points');
          return coordinates.map((coord) => LatLng(coord[1].toDouble(), coord[0].toDouble())).toList();
        }
      }
    } catch (e) {
      print('🗺️ Error extracting polygon coordinates: $e');
    }
    return [];
  }
  
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading offline map...'),
            ],
          ),
        ),
      );
    }
    
    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Offline Map'),
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red,
              ),
              const SizedBox(height: 16),
              Text(
                _errorMessage!,
                style: const TextStyle(fontSize: 16),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _isLoading = true;
                    _errorMessage = null;
                  });
                  _loadMapData();
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Geographical Map'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
        actions: [
          const SizedBox(width: 8),
        ],
      ),
      body: _isDownloading ? _buildDownloadProgressDialog() : _buildMapBody(),
      floatingActionButton: FloatingActionButton(
        onPressed: _showMapInfo,
        child: const Icon(Icons.info),
      ),
    );
  }
  
  void _showMapInfo() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Offline Map Info'),
        content: FutureBuilder<Map<String, dynamic>>(
          future: _getMapInfo(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const CircularProgressIndicator();
            }
            
            final info = snapshot.data ?? {};
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Barangay ID: $_currentBarangayId'),
                const SizedBox(height: 8),
                Text('Map Tiles: ${info['tileCount'] ?? 0}'),
                const SizedBox(height: 8),
                Text('Polygon Data: ${info['hasPolygon'] ? 'Available' : 'Not Available'}'),
                const SizedBox(height: 8),
                if (_center != null)
                  Text('Center: ${_center!.latitude.toStringAsFixed(4)}, ${_center!.longitude.toStringAsFixed(4)}'),
              ],
            );
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
  
  Future<Map<String, dynamic>> _getMapInfo() async {
    final tileCount = await _dbHelper.getMapTileCount();
    final hasPolygon = await _mappingService.hasBarangayPolygon(_currentBarangayId!);
    
    print('🗺️ Map Info - Tiles: $tileCount, Polygon: $hasPolygon');
    
    return {
      'tileCount': tileCount,
      'hasPolygon': hasPolygon,
    };
  }

  void _fitMapToPolygon() {
    if (_mapController != null && _barangayPolygon != null) {
      final coordinates = _extractPolygonCoordinates(_barangayPolygon!);
      if (coordinates.isNotEmpty) {
        // Calculate bounds of the polygon
        double minLat = coordinates[0].latitude;
        double maxLat = coordinates[0].latitude;
        double minLng = coordinates[0].longitude;
        double maxLng = coordinates[0].longitude;
        
        for (var coord in coordinates) {
          minLat = math.min(minLat, coord.latitude);
          maxLat = math.max(maxLat, coord.latitude);
          minLng = math.min(minLng, coord.longitude);
          maxLng = math.max(maxLng, coord.longitude);
        }
        
        // Add small padding
        final latPadding = (maxLat - minLat) * 0.1;
        final lngPadding = (maxLng - minLng) * 0.1;
        
        final bounds = LatLngBounds(
          LatLng(minLat - latPadding, minLng - lngPadding),
          LatLng(maxLat + latPadding, maxLng + lngPadding),
        );
        
        // Fit to polygon bounds with optimal zoom for downloaded tiles (14-18)
        _mapController!.fitCamera(CameraFit.bounds(
          bounds: bounds, 
          padding: const EdgeInsets.all(50),
          maxZoom: 18.0, // Limit max zoom to downloaded level
        ));
        print('🗺️ Map fitted to polygon bounds with zoom 14-18');
      }
    }
  }

  void _goToCenter() {
    if (_mapController != null && _center != null) {
      _mapController!.move(_center!, 15.0); // Use optimal zoom for downloaded tiles
      print('🗺️ Map centered on barangay: ${_center!.latitude}, ${_center!.longitude} at zoom 15.0');
      
      // Show a brief confirmation
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Map centered on barangay (zoom 15.0)'),
          duration: Duration(seconds: 2),
          backgroundColor: Colors.blue,
        ),
      );
    }
  }

  // Set optimal zoom level to show downloaded tiles (10-18)
  void _setOptimalZoomForDownloadedTiles() {
    if (_mapController != null) {
      final currentZoom = _mapController!.camera.zoom;
      // If current zoom is outside downloaded range (10-18), adjust it
      if (currentZoom < 10.0) {
        _mapController!.move(_mapController!.camera.center, 10.0);
        print('🗺️ Adjusted zoom to 10.0 to show downloaded tiles');
      } else if (currentZoom > 18.0) {
        _mapController!.move(_mapController!.camera.center, 18.0);
        print('🗺️ Adjusted zoom to 18.0 to show downloaded tiles');
      }
    }
  }

  // Download offline map data
  Future<void> _downloadOfflineMaps() async {
    if (_isDownloading) return;
    
    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
      _downloadStep = 'Initializing download...';
      _downloadError = null;
    });

    try {
      // Step 1: Download polygon data
      setState(() {
        _downloadStep = 'Downloading barangay polygon...';
        _downloadProgress = 0.1;
      });
      
      final barangayData = await _fetchBarangayData(_currentBarangayId!);
      await _storeBarangayPolygon(_currentBarangayId!, barangayData);
      
      setState(() {
        _downloadStep = 'Calculating map area...';
        _downloadProgress = 0.3;
      });
      
      // Step 2: Calculate bounding box
      final coordinates = _extractCoordinates(barangayData);
      final bounds = _calculateBoundingBox(coordinates);
      
      setState(() {
        _downloadStep = 'Downloading detailed map tiles (zoom 14-18)...';
        _downloadProgress = 0.5;
      });
      
      // Step 3: Download map tiles
      await _downloadMapTiles(_currentBarangayId!, bounds);
      
      setState(() {
        _downloadStep = 'Finalizing offline data...';
        _downloadProgress = 0.9;
      });
      
      // Step 4: Complete setup
      await _completeSetup();
      
      // Step 5: Verify download
      setState(() {
        _downloadStep = 'Verifying downloaded tiles...';
        _downloadProgress = 0.95;
      });
      
      final tileCount = await _dbHelper.getMapTileCount();
      print('🗺️ Verification: $tileCount tiles stored in database');
      
      setState(() {
        _downloadStep = 'Download complete! ($tileCount tiles downloaded)';
        _downloadProgress = 1.0;
      });
      
      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Offline maps downloaded successfully!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 3),
        ),
      );
      
      // Reload map data to show offline tiles
      await _loadMapData();
      
    } catch (e) {
      setState(() {
        _downloadStep = 'Error occurred';
        _downloadError = e.toString();
      });
      
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Download failed: ${e.toString()}'),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ),
      );
    } finally {
      setState(() {
        _isDownloading = false;
      });
    }
  }

  // Fetch barangay GeoJSON data using the barangay ID
  Future<Map<String, dynamic>> _fetchBarangayData(String barangayId) async {
    try {
      // Debug: Check API service status
      print('🗺️ OFFLINE DOWNLOAD - API Service Status:');
      print('   Base URL: ${_mappingService.apiService.dio.options.baseUrl}');
      print('   Using Custom IP: ${_mappingService.apiService.isUsingCustomIp}');
      print('   Current Base URL: ${_mappingService.apiService.currentBaseUrl}');
      
      final endpoint = ApiConfig.getBarangayGeojsonEndpoint(int.parse(barangayId));
      final fullUrl = '${_mappingService.apiService.dio.options.baseUrl}$endpoint';
      print('🗺️ OFFLINE DOWNLOAD - Fetching barangay data from: $fullUrl');
      
      final response = await _mappingService.apiService.dio.get(endpoint);
      
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
          
          // Update progress with proper calculation (20% to 90%)
          final progress = 0.2 + (downloadedTiles / totalTiles) * 0.7;
          final percentage = (downloadedTiles / totalTiles * 100).toStringAsFixed(1);
          
          if (mounted) {
            setState(() {
              _downloadProgress = progress;
              _downloadStep = 'Downloading tiles: $downloadedTiles/$totalTiles ($percentage%)';
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

  // Check if tiles have sufficient zoom levels for household viewing
  Future<bool> _checkHighZoomTiles(String barangayId) async {
    try {
      return await _dbHelper.hasHighZoomTilesForBarangay(barangayId);
    } catch (e) {
      print('🗺️ Error checking high zoom tiles: $e');
      return false;
    }
  }

  // Start download process
  Future<void> _startDownload() async {
    if (_barangayPolygon == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No polygon data available for download'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
      _downloadStep = 'Preparing download...';
    });
    
    // Add a small delay to show the initial state
    await Future.delayed(const Duration(milliseconds: 500));

    try {
      // Update progress for bounds calculation
      if (mounted) {
        setState(() {
          _downloadProgress = 0.1;
          _downloadStep = 'Calculating polygon bounds...';
        });
      }
      
      // Calculate bounds from polygon
      final coordinates = _extractPolygonCoordinates(_barangayPolygon!);
      if (coordinates.isNotEmpty) {
        double minLat = coordinates[0].latitude;
        double maxLat = coordinates[0].latitude;
        double minLng = coordinates[0].longitude;
        double maxLng = coordinates[0].longitude;
        
        for (var coord in coordinates) {
          minLat = math.min(minLat, coord.latitude);
          maxLat = math.max(maxLat, coord.latitude);
          minLng = math.min(minLng, coord.longitude);
          maxLng = math.max(maxLng, coord.longitude);
        }
        
        // Add larger buffer around the polygon for better coverage
        // Use 20% buffer instead of 10% for household-level viewing
        final latBuffer = (maxLat - minLat) * 0.2;
        final lngBuffer = (maxLng - minLng) * 0.2;
        
        // Ensure minimum buffer of 0.01 degrees (about 1km) for small polygons
        final minBuffer = 0.01;
        final finalLatBuffer = math.max(latBuffer, minBuffer);
        final finalLngBuffer = math.max(lngBuffer, minBuffer);
        
        final bounds = {
          'minLat': minLat - finalLatBuffer,
          'maxLat': maxLat + finalLatBuffer,
          'minLng': minLng - finalLngBuffer,
          'maxLng': maxLng + finalLngBuffer,
        };
        
        // Update progress before starting tile download
        if (mounted) {
          setState(() {
            _downloadProgress = 0.2;
            _downloadStep = 'Starting tile download...';
          });
        }
        
        // Download tiles
        await _downloadMapTiles(_currentBarangayId!, bounds);
        
        // Update progress to completion
        if (mounted) {
          setState(() {
            _downloadProgress = 1.0;
            _downloadStep = 'Download completed successfully!';
          });
        }
        
        // Add a small delay to show completion
        await Future.delayed(const Duration(milliseconds: 1000));
        
        // Update tile status
        if (mounted) {
          setState(() {
            _showPlaceholderTiles = false;
            _isDownloading = false;
          });
          
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Offline tiles downloaded successfully!'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      setState(() {
        _isDownloading = false;
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Download failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildMapBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Loading offline map...'),
          ],
        ),
      );
    }
    
    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _errorMessage = null;
                });
                _loadMapData();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    
    return _center != null
        ? Stack(
            children: [
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  center: _center!,
                  zoom: 15.0, // Start at zoom level 15.0 to show downloaded tiles (10-18)
                  minZoom: 10.0, // Prevent zooming out below downloaded tiles
                  maxZoom: 18.0,
                  onMapReady: () {
                    print('🗺️ Map is ready and centered at: ${_center!.latitude}, ${_center!.longitude}');
                    // Auto-fit to polygon bounds after a short delay
                    Future.delayed(const Duration(milliseconds: 500), () {
                      _fitMapToPolygon();
                      // Ensure we're at optimal zoom for downloaded tiles
                      _setOptimalZoomForDownloadedTiles();
                    });
                  },
                ),
                children: [
                  // Try offline tiles first, then fallback to online
                  TileLayer(
                    key: ValueKey('map_tiles_$_currentBarangayId'), // Force recreation on barangay change
                    tileProvider: _showPlaceholderTiles 
                        ? FallbackTileProvider()
                        : OfflineTileProvider(barangayId: _currentBarangayId!),
                    maxZoom: 18,
                    minZoom: 8,
                    fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    errorTileCallback: (tile, error, stackTrace) {
                      // Silent error handling to prevent console spam
                    },
                    tileBuilder: (context, tileWidget, tile) {
                      return tileWidget;
                    },
                  ),
                  
                  // Barangay polygon layer
                  if (_barangayPolygon != null)
                    PolygonLayer(
                      polygons: [
                        Polygon(
                          points: _extractPolygonCoordinates(_barangayPolygon!),
                          color: Colors.blue.withOpacity(0.3),
                          borderColor: Colors.blue,
                          borderStrokeWidth: 2.0,
                          isFilled: true,
                        ),
                      ],
                    ),
                  
                  // Household markers
                  MarkerLayer(
                    markers: [
                      // Household markers as simple dots
                      ..._households.map((household) {
                        final lat = household['latitude'] as double?;
                        final lng = household['longitude'] as double?;
                        if (lat != null && lng != null) {
                          return Marker(
                            point: LatLng(lat, lng),
                            width: 8,
                            height: 8,
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.blue,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 1),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.2),
                                    blurRadius: 2,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        return null;
                      }).where((marker) => marker != null).cast<Marker>(),
                    ],
                  ),
                ],
              ),
              
              // Zoom controls - Horizontal layout
              Positioned(
                right: 16,
                bottom: 16,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    FloatingActionButton.small(
                      onPressed: () {
                        if (_mapController != null) {
                          final newZoom = _mapController!.camera.zoom + 1;
                          // Limit zoom in to downloaded level (18)
                          final limitedZoom = newZoom > 18.0 ? 18.0 : newZoom;
                          _mapController!.move(_mapController!.camera.center, limitedZoom);
                          if (newZoom > 18.0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Maximum zoom reached (level 18 - Detailed house view)'),
                                duration: Duration(seconds: 2),
                                backgroundColor: Colors.orange,
                              ),
                            );
                          }
                        }
                      },
                      heroTag: "zoom_in",
                      child: const Icon(Icons.add),
                      tooltip: 'Zoom In (Max: 18 - Tiny houses visible)',
                    ),
                    const SizedBox(width: 8),
                    FloatingActionButton.small(
                      onPressed: () {
                        if (_mapController != null) {
                          final newZoom = _mapController!.camera.zoom - 1;
                          // Limit zoom out to downloaded level (14)
                          final limitedZoom = newZoom < 14.0 ? 14.0 : newZoom;
                          _mapController!.move(_mapController!.camera.center, limitedZoom);
                          if (newZoom < 14.0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Minimum zoom reached (level 14 - Barangay overview)'),
                                duration: Duration(seconds: 2),
                                backgroundColor: Colors.orange,
                              ),
                            );
                          }
                        }
                      },
                      heroTag: "zoom_out",
                      child: const Icon(Icons.remove),
                      tooltip: 'Zoom Out (Min: 14)',
                    ),
                    const SizedBox(width: 8),
                    FloatingActionButton.small(
                      onPressed: _goToCenter,
                      heroTag: "go_to_center",
                      child: const Icon(Icons.my_location),
                      tooltip: 'Go to Center',
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                    const SizedBox(width: 8),
                    FloatingActionButton.small(
                      onPressed: _fitMapToPolygon,
                      heroTag: "fit_bounds",
                      child: const Icon(Icons.fit_screen),
                      tooltip: 'Fit to Polygon',
                    ),
                    const SizedBox(width: 8),
                    FloatingActionButton.small(
                      onPressed: _setOptimalZoomForDownloadedTiles,
                      heroTag: "optimal_zoom",
                      child: const Icon(Icons.zoom_in_map),
                      tooltip: 'Optimal Zoom (14-15)',
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                    if (_showPlaceholderTiles) ...[
                      const SizedBox(width: 8),
                      FloatingActionButton.small(
                        onPressed: _startDownload,
                        heroTag: "download_tiles",
                        child: const Icon(Icons.download),
                        tooltip: 'Download Offline Tiles',
                        backgroundColor: Colors.orange,
                        foregroundColor: Colors.white,
                      ),
                    ],
                    const SizedBox(width: 8),
                  ],
                ),
              ),
            ],
          )
        : Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.map_outlined,
                  size: 64,
                  color: Colors.grey,
                ),
                const SizedBox(height: 16),
                const Text(
                  'No map data available',
                  style: TextStyle(
                    fontSize: 18,
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
  }

  Widget _buildDownloadProgressDialog() {
    return Container(
      color: Colors.white,
      child: Center(
        child: Card(
          margin: const EdgeInsets.all(24),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Download icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(40),
                  ),
                  child: const Icon(
                    Icons.download,
                    size: 40,
                    color: Colors.blue,
                  ),
                ),
                
                const SizedBox(height: 20),
                
                // Title
                const Text(
                  'Downloading Offline Maps',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 8),
                
                // Subtitle
                const Text(
                  'Optimized for minimal storage usage',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                  textAlign: TextAlign.center,
                ),
                
                const SizedBox(height: 24),
                
                // Progress indicator
                Container(
                  width: 120,
                  height: 120,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Background circle
                      Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.grey.withOpacity(0.1),
                        ),
                      ),
                      // Progress circle
                      SizedBox(
                        width: 120,
                        height: 120,
                        child: CircularProgressIndicator(
                          value: _downloadProgress,
                          strokeWidth: 8,
                          backgroundColor: Colors.grey.withOpacity(0.2),
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _downloadError != null ? Colors.red : Colors.blue,
                          ),
                        ),
                      ),
                      // Progress text
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            '${(_downloadProgress * 100).toInt()}%',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _downloadError != null ? 'Error' : 'Progress',
                            style: TextStyle(
                              fontSize: 12,
                              color: _downloadError != null ? Colors.red : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 20),
                
                // Current step
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: _downloadError != null 
                        ? Colors.red.withOpacity(0.1) 
                        : Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _downloadError != null 
                          ? Colors.red.withOpacity(0.3) 
                          : Colors.blue.withOpacity(0.3),
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        _downloadError != null ? Icons.error : Icons.info,
                        color: _downloadError != null ? Colors.red : Colors.blue,
                        size: 20,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _downloadStep,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: _downloadError != null ? Colors.red : Colors.black87,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      if (_downloadError != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _downloadError!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.red,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                
                const SizedBox(height: 20),
                
                // Action buttons (only show if there's an error)
                if (_downloadError != null) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () {
                          setState(() {
                            _downloadProgress = 0.0;
                            _downloadStep = 'Initializing download...';
                            _downloadError = null;
                          });
                          _downloadOfflineMaps();
                        },
                        icon: const Icon(Icons.refresh),
                        label: const Text('Retry'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          foregroundColor: Colors.white,
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () {
                          setState(() {
                            _isDownloading = false;
                            _downloadError = null;
                          });
                        },
                        icon: const Icon(Icons.close),
                        label: const Text('Cancel'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.grey,
                          foregroundColor: Colors.white,
                        ),
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
