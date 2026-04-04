import '../../data/database/database_helper.dart';
import 'api_service.dart';

class PurokSyncService {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final ApiService _apiService = ApiService();

  /// Sync all pending puroks to server
  /// Returns map of {localId: serverId}
  Future<Map<int, int>> syncPuroks() async {
    final pendingPuroks = await _dbHelper.getPendingPuroks();
    final idMapping = <int, int>{};
    
    print('📤 Starting purok sync: ${pendingPuroks.length} pending puroks');
    
    for (final purok in pendingPuroks) {
      try {
        final localId = purok['id'] as int;
        final serverId = await _syncSinglePurok(purok);
        
        if (serverId != null) {
          // Update local database with server ID
          await _dbHelper.updatePurokServerId(localId, serverId);
          idMapping[localId] = serverId;
          print('✅ Synced purok: ${purok['name']} (local: $localId → server: $serverId)');
        }
      } catch (e) {
        print('❌ Error syncing purok ${purok['name']}: $e');
        // Continue with next purok even if one fails
      }
    }
    
    print('✅ Purok sync completed: ${idMapping.length}/${pendingPuroks.length} synced');
    return idMapping;
  }
  
  /// Sync a single purok to server and return the server ID
  Future<int?> _syncSinglePurok(Map<String, dynamic> purok) async {
    try {
      final requestData = {
        'barangayId': purok['barangay_id'],
        'purokName': purok['name'],
        'purokLeader': purok['leader'],
        'description': purok['description'],
      };
      
      print('📤 Syncing purok: ${purok['name']} to server');
      print('   Request data: $requestData');
      
      final response = await _apiService.dio.post(
        '/purok',
        data: requestData,
      );
      
      print('   Response: ${response.data}');
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        
        // Extract server ID from response
        // Response format: { "message": "...", "data": { "id": 123 } }
        if (data['data'] != null && data['data']['id'] != null) {
          final serverId = data['data']['id'];
          print('   ✅ Server returned ID: $serverId');
          return serverId is int ? serverId : int.tryParse(serverId.toString());
        }
      }
      
      print('   ❌ Could not extract server ID from response');
      return null;
    } catch (e) {
      print('❌ Error syncing purok to server: $e');
      
      // Handle duplicate error (409 Conflict or similar)
      if (e.toString().contains('409') || e.toString().contains('already exists')) {
        print('   ℹ️ Purok might already exist on server, fetching existing ID...');
        try {
          // Fetch puroks from server to find the matching one
          final barangayId = purok['barangay_id'];
          final response = await _apiService.dio.get('/list/$barangayId/purok');
          if (response.statusCode == 200) {
            final data = response.data;
            if (data['data'] != null) {
              final puroks = data['data'] as List;
              final matching = puroks.firstWhere(
                (p) => p['purok_name'] == purok['name'],
                orElse: () => null,
              );
              if (matching != null && matching['purok_id'] != null) {
                final serverId = matching['purok_id'];
                print('   ✅ Found existing purok on server with ID: $serverId');
                return serverId is int ? serverId : int.tryParse(serverId.toString());
              }
            }
          }
        } catch (fetchError) {
          print('   ❌ Failed to fetch existing purok: $fetchError');
        }
      }
      
      rethrow;
    }
  }
  
  /// Get pending purok count
  Future<int> getPendingPurokCount() async {
    final pending = await _dbHelper.getPendingPuroks();
    return pending.length;
  }
  
  /// Mark purok as failed sync
  Future<void> markPurokSyncFailed(int localId, String error) async {
    final db = await _dbHelper.database;
    await db.update(
      'puroks',
      {
        'sync_status': 'failed',
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [localId],
    );
  }
  
  /// Retry failed purok syncs
  Future<Map<int, int>> retryFailedPurokSyncs() async {
    final db = await _dbHelper.database;
    final failedPuroks = await db.query(
      'puroks',
      where: 'sync_status = ?',
      whereArgs: ['failed'],
    );
    
    final idMapping = <int, int>{};
    
    for (final purok in failedPuroks) {
      try {
        final localId = purok['id'] as int;
        final serverId = await _syncSinglePurok(purok);
        
        if (serverId != null) {
          await _dbHelper.updatePurokServerId(localId, serverId);
          idMapping[localId] = serverId;
        }
      } catch (e) {
        print('❌ Retry failed for purok ${purok['name']}: $e');
      }
    }
    
    return idMapping;
  }
}


