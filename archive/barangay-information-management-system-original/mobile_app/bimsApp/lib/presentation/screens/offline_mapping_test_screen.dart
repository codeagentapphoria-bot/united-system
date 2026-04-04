import 'package:flutter/material.dart';
import '../../core/services/offline_mapping_service.dart';
import '../../data/database/database_helper.dart';

class OfflineMappingTestScreen extends StatefulWidget {
  const OfflineMappingTestScreen({Key? key}) : super(key: key);

  @override
  _OfflineMappingTestScreenState createState() => _OfflineMappingTestScreenState();
}

class _OfflineMappingTestScreenState extends State<OfflineMappingTestScreen> {
  final OfflineMappingService _mappingService = OfflineMappingService();
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  
  String _status = 'Ready to test';
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Offline Mapping Test'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Offline Mapping Test',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('Status: $_status'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _testOfflineMapping,
                      child: _isLoading
                          ? const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                                SizedBox(width: 8),
                                Text('Testing...'),
                              ],
                            )
                          : const Text('Test Offline Mapping'),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _checkOfflineData,
                      child: const Text('Check Offline Data'),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _clearOfflineData,
                      child: const Text('Clear Offline Data'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Test Results',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      FutureBuilder<Map<String, dynamic>>(
                        future: _getOfflineDataInfo(),
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.waiting) {
                            return const CircularProgressIndicator();
                          }
                          
                          final info = snapshot.data ?? {};
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Barangay Polygons: ${info['polygonCount'] ?? 0}'),
                              Text('Map Tiles: ${info['tileCount'] ?? 0}'),
                              Text('Database Version: ${info['dbVersion'] ?? 'Unknown'}'),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _testOfflineMapping() async {
    setState(() {
      _isLoading = true;
      _status = 'Testing offline mapping...';
    });

    try {
      // Test with a sample barangay ID
      const testBarangayId = '1';
      
      setState(() {
        _status = 'Checking if offline mapping is needed...';
      });
      
      final needsMapping = await _mappingService.hasBarangayPolygon(testBarangayId);
      
      if (!needsMapping) {
        setState(() {
          _status = 'Offline mapping already exists for barangay $testBarangayId';
        });
      } else {
        setState(() {
          _status = 'Offline mapping needed for barangay $testBarangayId';
        });
      }
      
    } catch (e) {
      setState(() {
        _status = 'Error: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _checkOfflineData() async {
    setState(() {
      _isLoading = true;
      _status = 'Checking offline data...';
    });

    try {
      final tileCount = await _mappingService.getMapTileCount();
      final hasPolygon = await _mappingService.hasBarangayPolygon('1');
      
      setState(() {
        _status = 'Found $tileCount tiles and ${hasPolygon ? '1' : '0'} polygons';
      });
    } catch (e) {
      setState(() {
        _status = 'Error checking data: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _clearOfflineData() async {
    setState(() {
      _isLoading = true;
      _status = 'Clearing offline data...';
    });

    try {
      await _mappingService.clearOfflineMappingData();
      setState(() {
        _status = 'Offline data cleared successfully';
      });
    } catch (e) {
      setState(() {
        _status = 'Error clearing data: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<Map<String, dynamic>> _getOfflineDataInfo() async {
    try {
      final tileCount = await _mappingService.getMapTileCount();
      final db = await _dbHelper.database;
      final polygonResult = await db.rawQuery('SELECT COUNT(*) as count FROM barangay_polygons');
      final polygonCount = polygonResult.first['count'] as int;
      
      return {
        'tileCount': tileCount,
        'polygonCount': polygonCount,
        'dbVersion': '6',
      };
    } catch (e) {
      return {
        'tileCount': 0,
        'polygonCount': 0,
        'dbVersion': 'Error: $e',
      };
    }
  }
}
