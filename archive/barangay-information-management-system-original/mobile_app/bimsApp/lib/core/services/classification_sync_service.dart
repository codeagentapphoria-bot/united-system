import 'dart:convert';
import '../../data/database/database_helper.dart';
import 'api_service.dart';

class ClassificationSyncService {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final ApiService _apiService = ApiService();

  /// Sync all pending classification types to server
  /// Returns map of {localId: serverId}
  Future<Map<int, int>> syncClassificationTypes() async {
    final pendingClassifications = await _dbHelper.getPendingClassificationTypes();
    final idMapping = <int, int>{};
    
    print('📤 Starting classification type sync: ${pendingClassifications.length} pending classifications');
    
    for (final classification in pendingClassifications) {
      try {
        final localId = classification['id'] as int;
        final serverId = await _syncSingleClassificationType(classification);
        
        if (serverId != null) {
          // Update local database with server ID
          await _dbHelper.updateClassificationTypeServerId(localId, serverId);
          idMapping[localId] = serverId;
          print('✅ Synced classification: ${classification['name']} (local: $localId → server: $serverId)');
        }
      } catch (e) {
        print('❌ Error syncing classification ${classification['name']}: $e');
        // Continue with next classification even if one fails
      }
    }
    
    print('✅ Classification type sync completed: ${idMapping.length}/${pendingClassifications.length} synced');
    return idMapping;
  }
  
  /// Sync a single classification type to server and return the server ID
  Future<int?> _syncSingleClassificationType(Map<String, dynamic> classification) async {
    try {
      // Parse details from JSON string to array
      List<dynamic> details = [];
      if (classification['details'] != null) {
        final detailsString = classification['details'] as String;
        if (detailsString.isNotEmpty && detailsString != '[]') {
          details = jsonDecode(detailsString);
        }
      }
      
      final requestData = {
        'name': classification['name'],
        'description': classification['description'],
        'color': classification['color'],
        'details': details,
      };
      
      print('📤 Syncing classification type: ${classification['name']} to server');
      print('   Request data: $requestData');
      
      final response = await _apiService.dio.post(
        '/classification-types',
        data: requestData,
      );
      
      print('   Response: ${response.data}');
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        
        // Extract server ID from response
        // Response format: { "message": "...", "data": { "id": 123, ... } }
        if (data['data'] != null && data['data']['id'] != null) {
          final serverId = data['data']['id'];
          print('   ✅ Server returned ID: $serverId');
          return serverId is int ? serverId : int.tryParse(serverId.toString());
        }
      }
      
      print('   ❌ Could not extract server ID from response');
      return null;
    } catch (e) {
      print('❌ Error syncing classification type to server: $e');
      
      // Handle duplicate error (409 Conflict)
      if (e.toString().contains('409') || e.toString().contains('already exists')) {
        print('   ℹ️ Classification already exists on server, fetching existing ID...');
        try {
          // Fetch all classification types from server to find the matching one
          final response = await _apiService.dio.get('/classification-types');
          if (response.statusCode == 200) {
            final data = response.data;
            if (data['data'] != null) {
              final classifications = data['data'] as List;
              final matching = classifications.firstWhere(
                (c) => c['name'] == classification['name'],
                orElse: () => null,
              );
              if (matching != null && matching['id'] != null) {
                final serverId = matching['id'];
                print('   ✅ Found existing classification on server with ID: $serverId');
                return serverId is int ? serverId : int.tryParse(serverId.toString());
              }
            }
          }
        } catch (fetchError) {
          print('   ❌ Failed to fetch existing classification: $fetchError');
        }
      }
      
      rethrow;
    }
  }
  
  /// Get pending classification type count
  Future<int> getPendingClassificationTypeCount() async {
    final pending = await _dbHelper.getPendingClassificationTypes();
    return pending.length;
  }
  
  /// Mark classification type as failed sync
  Future<void> markClassificationTypeSyncFailed(int localId, String error) async {
    final db = await _dbHelper.database;
    await db.update(
      'classification_types',
      {
        'sync_status': 'failed',
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [localId],
    );
  }
  
  /// Retry failed classification type syncs
  Future<Map<int, int>> retryFailedClassificationTypeSyncs() async {
    final db = await _dbHelper.database;
    final failedClassifications = await db.query(
      'classification_types',
      where: 'sync_status = ?',
      whereArgs: ['failed'],
    );
    
    final idMapping = <int, int>{};
    
    for (final classification in failedClassifications) {
      try {
        final localId = classification['id'] as int;
        final serverId = await _syncSingleClassificationType(classification);
        
        if (serverId != null) {
          await _dbHelper.updateClassificationTypeServerId(localId, serverId);
          idMapping[localId] = serverId;
        }
      } catch (e) {
        print('❌ Retry failed for classification ${classification['name']}: $e');
      }
    }
    
    return idMapping;
  }
  
  /// Fetch all classification types from server and update local database
  /// Keeps classifications that are in use (assigned to residents) even if deleted on server
  Future<bool> fetchClassificationTypesFromServer(int municipalityId) async {
    try {
      print('📥 Fetching classification types from server for municipality $municipalityId...');
      
      final response = await _apiService.dio.get(
        '/classification-types',
        queryParameters: {'municipality_id': municipalityId},
      );
      
      if (response.statusCode == 200) {
        final data = response.data;
        if (data['data'] != null) {
          final serverClassifications = data['data'] as List;
          print('✅ Fetched ${serverClassifications.length} classification types from server');
          
          // Get server IDs that exist on server
          final serverIds = serverClassifications.map((c) => c['id']).toSet();
          
          // Update local database with server data
          int updated = 0;
          int created = 0;
          int deactivated = 0;
          
          for (final serverClass in serverClassifications) {
            try {
              // Check if classification already exists locally
              final db = await _dbHelper.database;
              final existing = await db.query(
                'classification_types',
                where: 'server_id = ?',
                whereArgs: [serverClass['id']],
              );
              
              final classificationData = {
                'municipality_id': municipalityId,
                'name': serverClass['name'],
                'description': serverClass['description'],
                'color': serverClass['color'] ?? '#4CAF50',
                'details': jsonEncode(serverClass['details'] ?? []),
                'is_active': serverClass['is_active'] ?? 1,
                'server_id': serverClass['id'],
                'sync_status': 'synced',
              };
              
              if (existing.isNotEmpty) {
                // Update existing
                await db.update(
                  'classification_types',
                  classificationData,
                  where: 'id = ?',
                  whereArgs: [existing.first['id']],
                );
                updated++;
              } else {
                // Create new
                await db.insert('classification_types', classificationData);
                created++;
              }
            } catch (e) {
              print('❌ Error processing classification ${serverClass['name']}: $e');
            }
          }
          
          // Handle classifications deleted from server
          // Mark them as inactive instead of deleting (to preserve resident assignments)
          final db = await _dbHelper.database;
          final localClassifications = await db.query(
            'classification_types',
            where: 'municipality_id = ? AND server_id IS NOT NULL',
            whereArgs: [municipalityId],
          );
          
          for (final localClass in localClassifications) {
            final serverId = localClass['server_id'] as int?;
            if (serverId != null && !serverIds.contains(serverId)) {
              // This classification was deleted on server
              // Check if it's in use by any residents
              final inUse = await db.query(
                'resident_classifications',
                where: 'classification_type = ?',
                whereArgs: [localClass['name']],
                limit: 1,
              );
              
              if (inUse.isNotEmpty) {
                // Keep it but mark as inactive (deleted on server but still in use)
                print('⚠️ Classification "${localClass['name']}" deleted on server but still assigned to residents');
                print('   Keeping locally to preserve data integrity - will still sync successfully');
                
                // Update description to make it clear this is a legacy classification
                String currentDesc = localClass['description']?.toString() ?? '';
                // Remove old marker if it exists to avoid duplication
                currentDesc = currentDesc.replaceAll('[Deleted on server]', '').trim();
                final newDesc = currentDesc.isEmpty 
                    ? '[Deleted on server - preserved for data integrity]'
                    : '$currentDesc [Deleted on server - preserved for data integrity]';
                
                await db.update(
                  'classification_types',
                  {
                    'is_active': 0,
                    'description': newDesc,
                  },
                  where: 'id = ?',
                  whereArgs: [localClass['id']],
                );
                deactivated++;
              } else {
                // Not in use, safe to delete
                print('🗑️ Deleting unused classification "${localClass['name']}"');
                await db.delete(
                  'classification_types',
                  where: 'id = ?',
                  whereArgs: [localClass['id']],
                );
              }
            }
          }
          
          print('✅ Classification types updated: $created created, $updated updated, $deactivated deactivated');
          if (deactivated > 0) {
            print('ℹ️ Note: $deactivated classifications were deleted on server but kept locally because they are assigned to residents');
          }
          return true;
        }
      }
      
      return false;
    } catch (e) {
      print('❌ Error fetching classification types from server: $e');
      return false;
    }
  }
}


