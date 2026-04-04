import 'package:dio/dio.dart';
import 'dart:io';
import '../config/api_config.dart';
import 'api_service.dart';
import 'image_upload_service.dart';
import '../../data/models/household.dart';
import '../../core/services/database_service.dart';
import '../../data/database/database_helper.dart';

class HouseholdSyncService {
  static final HouseholdSyncService _instance = HouseholdSyncService._internal();
  factory HouseholdSyncService() => _instance;
  HouseholdSyncService._internal();

  final ApiService _apiService = ApiService();
  final DatabaseService _databaseService = DatabaseService();
  final ImageUploadService _imageUploadService = ImageUploadService();
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;

  /// Sync a single household to the server
  /// Returns the server household ID if successful, null if failed
  Future<String?> syncHousehold(Household household) async {
    const int maxRetries = 3;
    const int retryDelay = 2000; // 2 seconds
    
    try {
      // API service should already be initialized with custom IP from login
      // Only initialize if not already done and not using custom IP
      if (!_apiService.dio.options.baseUrl.isNotEmpty) {
        print('⚠️ API service not initialized, initializing with default config');
        await _apiService.initialize();
      } else {
        print('🌐 HOUSEHOLD SYNC - Using existing API service with base URL: ${_apiService.dio.options.baseUrl}');
        print('🌐 HOUSEHOLD SYNC - Using custom IP: ${_apiService.isUsingCustomIp}');
      }

      // Ensure database service is initialized
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      // Check if purok was deleted on server and recreate it if necessary
      await _ensurePurokExistsOnServer(household.purokId, household.barangayId);

      // Upload images first (outside of retry logic to avoid multiple uploads)
      print('📤 Uploading household images first...');
      final householdData = await _prepareHouseholdData(household);
      
      // Get family data with server_resident_id mapping
      final familiesData = await _prepareFamiliesData(household.id!);

      // Prepare the payload for the API
      final payload = {
        'householdData': householdData,
        'familiesData': familiesData,
      };

      // Debug logging
      print('🔄 Syncing household: ${household.fullAddress}');
      print('📤 Sending household data with server_resident_id mapping');

      // Retry logic only for the sync request (not image upload)
      for (int attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Make the API request with timeout
          final response = await _apiService.dio.post(
            ApiConfig.syncHouseholdEndpoint,
            data: payload,
            options: Options(
              headers: ApiConfig.defaultHeaders,
              sendTimeout: const Duration(seconds: 30), // 30 second timeout for sending
              receiveTimeout: const Duration(seconds: 30), // 30 second timeout for receiving
            ),
          );

          if (response.statusCode == 200 || response.statusCode == 201) {
            final responseData = response.data;
            
            // Extract server household ID from response
            if (responseData is Map<String, dynamic>) {
              final data = responseData['data'];
              if (data is Map<String, dynamic>) {
                final household = data['household'];
                if (household is Map<String, dynamic>) {
                  final serverId = household['id']?.toString();
                  if (serverId != null) {
                    print('✅ Successfully synced household with server ID: $serverId');
                    return serverId;
                  }
                }
              }
            }
            
            print('⚠️ Unexpected response format: $responseData');
            return null;
          } else {
            print('❌ API request failed with status: ${response.statusCode}');
            print('❌ Response: ${response.data}');
            
            if (attempt < maxRetries) {
              print('⏳ Retrying sync in ${retryDelay}ms... (attempt ${attempt + 1}/$maxRetries)');
              await Future.delayed(const Duration(milliseconds: retryDelay));
            }
          }
        } catch (e) {
          print('❌ Error syncing household (attempt $attempt/$maxRetries): $e');
          
          if (attempt < maxRetries) {
            print('⏳ Retrying sync in ${retryDelay}ms...');
            await Future.delayed(const Duration(milliseconds: retryDelay));
          }
        }
      }
    } catch (e) {
      print('❌ Error preparing household data: $e');
    }
    
    return null;
  }

  /// Prepare household data with server_resident_id mapping
  /// This replaces local resident IDs with server_resident_id values
  /// Also uploads household images and uses server filenames
  Future<Map<String, dynamic>> _prepareHouseholdData(Household household) async {
    // Get server_resident_id for house head
    final houseHeadServerId = await _getServerResidentId(household.houseHead);
    if (houseHeadServerId == null) {
      throw Exception('Could not find server_resident_id for house head: ${household.houseHead}');
    }

    // Prepare geometry data
    Map<String, dynamic>? geom;
    if (household.latitude != null && household.longitude != null) {
      geom = {
        'lat': household.latitude,
        'lng': household.longitude,
      };
    }

    // Upload household images and get server filenames
    List<String> householdImagePath = [];
    if (household.householdImagePath != null && household.householdImagePath!.isNotEmpty) {
      print('📤 Uploading household image: ${household.householdImagePath}');
      
      final imageFile = File(household.householdImagePath!);
      if (await imageFile.exists()) {
        final serverFilename = await _imageUploadService.uploadImage(imageFile);
        if (serverFilename != null) {
          householdImagePath = [serverFilename];
          print('✅ Household image uploaded successfully: $serverFilename');
        } else {
          print('⚠️ Failed to upload household image, proceeding without image');
        }
      } else {
        print('⚠️ Household image file does not exist: ${household.householdImagePath}');
      }
    }

    return {
      // Don't send ID - server will generate its own ID
      'houseNumber': household.houseNumber,
      'street': household.street,
      'purokId': household.purokId,
      'barangayId': household.barangayId,
      'houseHead': houseHeadServerId, // Use server_resident_id instead of local ID
      'housingType': household.housingType ?? 'owned',
      'structureType': household.structureType ?? 'concrete',
      'electricity': household.electricity,
      'waterSource': household.waterSource ?? 'tap_water',
      'toiletFacility': household.toiletFacility ?? 'water_sealed',
      'geom': geom,
      'area': household.area,
      'householdImagePath': householdImagePath,
    };
  }

  /// Prepare families data with server_resident_id mapping
  /// This creates a single family with the household head as family head
  Future<List<Map<String, dynamic>>> _prepareFamiliesData(int householdId) async {
    final families = await _databaseService.householdRepository.getFamiliesByHousehold(householdId);
    final List<Map<String, dynamic>> familiesData = [];

    for (final family in families) {
      // Get family members
      final familyMembers = await _databaseService.householdRepository.getFamilyMembers(family.id!);
      
      // Map family members to server_resident_id
      final List<Map<String, dynamic>> familyMembersData = [];
      
      for (final member in familyMembers) {
        final serverResidentId = await _getServerResidentId(member.familyMember);
        if (serverResidentId != null) {
          familyMembersData.add({
            'familyMember': serverResidentId, // Use server_resident_id instead of local ID
            'relationship': member.relationshipToHead ?? 'family_member',
          });
        } else {
          print('⚠️ Could not find server_resident_id for family member: ${member.familyMember}');
        }
      }

      // Get server_resident_id for family head
      final familyHeadServerId = await _getServerResidentId(family.familyHead);
      if (familyHeadServerId == null) {
        print('⚠️ Could not find server_resident_id for family head: ${family.familyHead}');
        continue; // Skip this family if we can't find the head
      }

      familiesData.add({
        'familyHead': familyHeadServerId, // Use server_resident_id instead of local ID
        'familyGroupNumber': family.familyGroup,
        'familyMembers': familyMembersData,
      });
    }

    return familiesData;
  }

  /// Get server_resident_id for a given local resident ID
  /// This looks up the server_resident_id from the residents table
  Future<String?> _getServerResidentId(String residentId) async {
    try {
      final resident = await _databaseService.residentRepository.getById(residentId);
      if (resident != null && resident.serverResidentId != null) {
        return resident.serverResidentId;
      }
      
      // If not found by ID, try by local_id
      if (residentId.startsWith('LOCAL_')) {
        final localId = int.tryParse(residentId.replaceFirst('LOCAL_', ''));
        if (localId != null) {
          final residentByLocalId = await _databaseService.residentRepository.getByLocalId(localId);
          if (residentByLocalId != null && residentByLocalId.serverResidentId != null) {
            return residentByLocalId.serverResidentId;
          }
        }
      }
      
      return null;
    } catch (e) {
      print('❌ Error getting server_resident_id for resident $residentId: $e');
      return null;
    }
  }

  /// Sync multiple households in batch
  /// Returns a map of local_id -> server_household_id for successful syncs
  Future<Map<String, String>> syncHouseholds(List<Household> households) async {
    final Map<String, String> syncResults = {};
    
    for (final household in households) {
      if (household.localId != null || household.id != null) {
        final serverId = await syncHousehold(household);
        if (serverId != null) {
          final key = household.localId?.toString() ?? 'LOCAL_${household.id}';
          syncResults[key] = serverId;
        }
      }
    }
    
    return syncResults;
  }

  /// Ensure purok exists on server - recreate if it was deleted
  /// This prevents household sync failures when puroks are deleted on server
  Future<void> _ensurePurokExistsOnServer(int purokId, int barangayId) async {
    try {
      print('🔍 PUROK CHECK - Verifying purok $purokId exists on server...');
      
      // Get purok details from local database
      final db = await _dbHelper.database;
      final puroks = await db.query(
        'puroks',
        where: 'id = ?',
        whereArgs: [purokId],
      );
      
      if (puroks.isEmpty) {
        print('⚠️ PUROK CHECK - Purok $purokId not found in local database');
        return;
      }
      
      final purok = puroks.first;
      final description = purok['description'] as String?;
      final serverIdExists = purok['server_id'] != null;
      
      // Check if purok was deleted on server (marked with "[Deleted on server]")
      if (description != null && description.contains('[Deleted on server]')) {
        print('⚠️ PUROK CHECK - Purok "${purok['name']}" was deleted on server');
        print('🔄 PUROK CHECK - Recreating purok on server...');
        
        // Recreate purok on server
        final newServerId = await _recreatePurokOnServer(purok, barangayId);
        
        if (newServerId != null) {
          print('✅ PUROK CHECK - Purok recreated on server with ID: $newServerId');
          
          // Update local purok with new server_id and clean description
          final cleanDescription = description.replaceAll('[Deleted on server]', '').trim();
          await db.update(
            'puroks',
            {
              'server_id': newServerId,
              'sync_status': 'synced',
              'description': cleanDescription.isEmpty ? null : cleanDescription,
              'updated_at': DateTime.now().toIso8601String(),
            },
            where: 'id = ?',
            whereArgs: [purokId],
          );
          
          print('✅ PUROK CHECK - Local purok updated with new server_id: $newServerId');
        } else {
          print('❌ PUROK CHECK - Failed to recreate purok on server');
          throw Exception('Failed to recreate deleted purok "${purok['name']}" on server. Cannot sync household.');
        }
      } else if (!serverIdExists) {
        // Purok was created locally but never synced - sync it now
        print('⚠️ PUROK CHECK - Purok "${purok['name']}" was created locally but not yet synced');
        print('🔄 PUROK CHECK - Syncing purok to server...');
        
        final newServerId = await _recreatePurokOnServer(purok, barangayId);
        
        if (newServerId != null) {
          print('✅ PUROK CHECK - Purok synced to server with ID: $newServerId');
          
          await db.update(
            'puroks',
            {
              'server_id': newServerId,
              'sync_status': 'synced',
              'updated_at': DateTime.now().toIso8601String(),
            },
            where: 'id = ?',
            whereArgs: [purokId],
          );
          
          print('✅ PUROK CHECK - Local purok updated with server_id: $newServerId');
        } else {
          print('❌ PUROK CHECK - Failed to sync purok to server');
          throw Exception('Failed to sync purok "${purok['name']}" to server. Cannot sync household.');
        }
      } else {
        print('✅ PUROK CHECK - Purok $purokId exists on server (server_id: ${purok['server_id']})');
      }
      
    } catch (e) {
      print('❌ PUROK CHECK - Error ensuring purok exists: $e');
      rethrow;
    }
  }

  /// Recreate (or create) a purok on the server
  /// Returns the new server ID if successful, null if failed
  Future<int?> _recreatePurokOnServer(Map<String, dynamic> purok, int barangayId) async {
    try {
      final requestData = {
        'barangayId': barangayId,
        'purokName': purok['name'],
        'purokLeader': purok['leader'],
        'description': purok['description']?.toString().replaceAll('[Deleted on server]', '').trim(),
      };
      
      print('📤 PUROK RECREATE - Sending purok to server: ${purok['name']}');
      print('   Request data: $requestData');
      
      final response = await _apiService.dio.post(
        '/purok',
        data: requestData,
      );
      
      print('   Response status: ${response.statusCode}');
      print('   Response data: ${response.data}');
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        
        // Extract server ID from response
        if (data['data'] != null && data['data']['id'] != null) {
          final serverId = data['data']['id'];
          print('✅ PUROK RECREATE - Server returned ID: $serverId');
          return serverId is int ? serverId : int.tryParse(serverId.toString());
        }
      }
      
      print('❌ PUROK RECREATE - Could not extract server ID from response');
      return null;
      
    } catch (e) {
      print('❌ PUROK RECREATE - Error: $e');
      
      // Handle duplicate error (purok might already exist on server)
      if (e.toString().contains('409') || e.toString().contains('already exists')) {
        print('ℹ️ PUROK RECREATE - Purok might already exist, fetching existing ID...');
        
        try {
          final response = await _apiService.dio.get(
            '/puroks',
            queryParameters: {'barangay_id': barangayId},
          );
          
          if (response.statusCode == 200) {
            final data = response.data;
            if (data['data'] != null) {
              final puroks = data['data'] as List;
              final matching = puroks.firstWhere(
                (p) => p['name'] == purok['name'],
                orElse: () => null,
              );
              
              if (matching != null && matching['id'] != null) {
                final serverId = matching['id'];
                print('✅ PUROK RECREATE - Found existing purok with ID: $serverId');
                return serverId is int ? serverId : int.tryParse(serverId.toString());
              }
            }
          }
        } catch (fetchError) {
          print('❌ PUROK RECREATE - Failed to fetch existing purok: $fetchError');
        }
      }
      
      return null;
    }
  }
}
