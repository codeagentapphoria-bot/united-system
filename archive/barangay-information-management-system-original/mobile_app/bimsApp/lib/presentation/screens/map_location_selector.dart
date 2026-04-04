import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:math' as math;
import '../../core/services/offline_mapping_service.dart';
import '../../core/services/offline_tile_provider.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../data/database/database_helper.dart';

class MapLocationSelector extends StatefulWidget {
  final double? initialLatitude;
  final double? initialLongitude;
  final String? barangayId; // Made optional - will fetch from secure storage if null
  
  const MapLocationSelector({
    Key? key,
    this.initialLatitude,
    this.initialLongitude,
    this.barangayId,
  }) : super(key: key);
  
  @override
  _MapLocationSelectorState createState() => _MapLocationSelectorState();
}

class _MapLocationSelectorState extends State<MapLocationSelector> {
  final OfflineMappingService _mappingService = OfflineMappingService();
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  
  MapController? _mapController;
  Map<String, dynamic>? _barangayPolygon;
  LatLng? _center;
  LatLng? _selectedLocation;
  bool _isLoading = true;
  bool _showPlaceholderTiles = false;
  String? _errorMessage;
  String? _currentBarangayId; // Store the actual barangay ID being used
  
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
      print('🗺️ MAP LOCATION SELECTOR - Initializing...');
      
      // Always fetch fresh barangay ID from secure storage
      final barangayId = await _offlineAuth.getBarangayId();
      
      if (barangayId != null) {
        if (mounted) {
          setState(() {
            _currentBarangayId = barangayId.toString();
          });
        }
        print('🗺️ MAP LOCATION SELECTOR - Using barangay ID from secure storage: $_currentBarangayId');
        
        // Load map data in background
        if (mounted) {
          await _loadMapData();
        }
      } else {
        print('🗺️ MAP LOCATION SELECTOR - No barangay ID found');
        if (mounted) {
          setState(() {
            _errorMessage = 'Barangay information not found. Please log in again.';
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      print('🗺️ MAP LOCATION SELECTOR - Error during initialization: $e');
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
  
  Future<void> _loadMapData() async {
    if (_currentBarangayId == null) {
      print('🗺️ MAP LOCATION SELECTOR - No barangay ID available');
      return;
    }
    
    try {
      print('🗺️ MAP LOCATION SELECTOR - Loading map data');
      print('🗺️ MAP LOCATION SELECTOR - _currentBarangayId: $_currentBarangayId');
      print('🗺️ MAP LOCATION SELECTOR - barangayId type: ${_currentBarangayId.runtimeType}');
      
      // Check if tiles exist for this specific barangay
      final hasTiles = await _dbHelper.hasMapTilesForBarangay(_currentBarangayId!);
      final tileCount = await _dbHelper.getMapTileCountForBarangay(_currentBarangayId!);
      print('🗺️ MAP LOCATION SELECTOR - hasTiles: $hasTiles');
      print('🗺️ MAP LOCATION SELECTOR - tileCount: $tileCount');
      
      if (!hasTiles) {
        print('🗺️ No tiles found for barangay $_currentBarangayId, will use fallback tiles');
        setState(() {
          _showPlaceholderTiles = true;
        });
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
        
        // Set initial location if provided
        if (widget.initialLatitude != null && widget.initialLongitude != null) {
          _selectedLocation = LatLng(widget.initialLatitude!, widget.initialLongitude!);
        }
        
        // Initialize map controller after data is loaded
        _mapController = MapController();
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
  
  void _onMapTap(TapPosition tapPosition, LatLng point) {
    setState(() {
      _selectedLocation = point;
    });
    
    print('🗺️ Location selected: ${point.latitude}, ${point.longitude}');
    
    // Show confirmation
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Location selected: ${point.latitude.toStringAsFixed(6)}, ${point.longitude.toStringAsFixed(6)}'),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }
  
  void _confirmLocation() {
    if (_selectedLocation != null) {
      Navigator.of(context).pop({
        'latitude': _selectedLocation!.latitude,
        'longitude': _selectedLocation!.longitude,
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a location on the map'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }
  
  void _goToCenter() {
    if (_mapController != null && _center != null) {
      _mapController!.move(_center!, 15.0);
      print('🗺️ Map centered on barangay: ${_center!.latitude}, ${_center!.longitude}');
    }
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
        
        _mapController!.fitCamera(CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(50)));
        print('🗺️ Map fitted to polygon bounds');
      }
    }
  }
  
  Future<void> _getCurrentLocation() async {
    try {
      // Show loading indicator
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 16),
              Text('Getting current location...'),
            ],
          ),
          duration: Duration(seconds: 2),
        ),
      );
      
      // Check permissions
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permission denied. Please enable it in app settings.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }
      
      if (permission != LocationPermission.whileInUse && permission != LocationPermission.always) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permission not granted'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }
      
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          await showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: const Row(
                children: [
                  Icon(Icons.location_off, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Location Required'),
                ],
              ),
              content: const Text('Location services must be turned on to get your current location. Please enable location in your phone settings.'),
              actions: [
                ElevatedButton(
                  onPressed: () async {
                    Navigator.of(context).pop();
                    await Geolocator.openLocationSettings();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Open Settings'),
                ),
              ],
            ),
          );
        }
        return;
      }
      
      // Get current position
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      
      // Set location and move map
      final currentLocation = LatLng(position.latitude, position.longitude);
      setState(() {
        _selectedLocation = currentLocation;
      });
      
      if (_mapController != null) {
        _mapController!.move(currentLocation, 17.0); // Zoom in closer
      }
      
      print('🗺️ Current GPS location: ${position.latitude}, ${position.longitude}');
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Current location: ${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      print('🗺️ Error getting current location: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to get location: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Loading offline map...'),
              ],
            ),
          ),
        ),
      );
    }
    
    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Select Location'),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 1,
        ),
        body: SafeArea(
          child: Center(
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
        ), // Closes SafeArea
      );
    }
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Location'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
        actions: [
          TextButton(
            onPressed: _confirmLocation,
            child: const Text(
              'Confirm',
              style: TextStyle(
                color: Colors.blue,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: _center != null
            ? Stack(
                children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    center: _selectedLocation ?? _center!,
                    zoom: 15.0,
                    minZoom: 10.0, // Prevent zooming out below downloaded tiles
                    maxZoom: 18.0,
                    onTap: _onMapTap,
                    onMapReady: () {
                      print('🗺️ Map is ready and centered at: ${_center!.latitude}, ${_center!.longitude}');
                      // Auto-fit to polygon bounds after a short delay
                      Future.delayed(const Duration(milliseconds: 500), () {
                        _fitMapToPolygon();
                      });
                    },
                  ),
                  children: [
                    // Try offline tiles first, then fallback to online
                    TileLayer(
                      key: ValueKey('location_tiles_$_currentBarangayId'), // Force recreation on barangay change
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
                    
                    // Selected location marker
                    if (_selectedLocation != null)
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: _selectedLocation!,
                            width: 40,
                            height: 40,
                            child: const Icon(
                              Icons.location_on,
                              color: Colors.red,
                              size: 40,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                
                // Map controls - Horizontal layout
                Positioned(
                  right: 16,
                  bottom: 16,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      FloatingActionButton.small(
                        onPressed: () {
                          if (_mapController != null) {
                            _mapController!.move(_mapController!.camera.center, _mapController!.camera.zoom + 1);
                          }
                        },
                        heroTag: "zoom_in",
                        child: const Icon(Icons.add),
                        tooltip: 'Zoom In',
                      ),
                      const SizedBox(width: 8),
                      FloatingActionButton.small(
                        onPressed: () {
                          if (_mapController != null) {
                            _mapController!.move(_mapController!.camera.center, _mapController!.camera.zoom - 1);
                          }
                        },
                        heroTag: "zoom_out",
                        child: const Icon(Icons.remove),
                        tooltip: 'Zoom Out',
                      ),
                      const SizedBox(width: 8),
                      FloatingActionButton.small(
                        onPressed: _getCurrentLocation,
                        heroTag: "get_current_location",
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        child: const Icon(Icons.navigation),
                        tooltip: 'Get Current Location',
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
                    ],
                  ),
                ),
                
                // Instructions
                Positioned(
                  top: 16,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Row(
                      children: [
                        Icon(
                          Icons.location_on,
                          color: Colors.red,
                          size: 20,
                        ),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Tap on the map to select location',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            )
          : const Center(
              child: Text('No map data available'),
            ),
      ), // Closes SafeArea
    );
  }
}
