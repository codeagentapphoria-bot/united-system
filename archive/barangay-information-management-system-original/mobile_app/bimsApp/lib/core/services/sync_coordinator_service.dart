import '../../data/database/database_helper.dart';
import '../../data/models/classification.dart';
import 'purok_sync_service.dart';
import 'classification_sync_service.dart';
import 'resident_sync_service.dart';
import 'household_sync_service.dart';
import 'pets_sync_service.dart';
import 'database_service.dart';

class SyncCoordinatorService {
  static final SyncCoordinatorService _instance = SyncCoordinatorService._internal();
  factory SyncCoordinatorService() => _instance;
  SyncCoordinatorService._internal();

  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final PurokSyncService _purokSync = PurokSyncService();
  final ClassificationSyncService _classificationSync = ClassificationSyncService();
  final ResidentSyncService _residentSync = ResidentSyncService();
  final HouseholdSyncService _householdSync = HouseholdSyncService();
  final PetsSyncService _petSync = PetsSyncService();

  /// Comprehensive sync that handles puroks, classifications, residents, households, and pets in correct order
  Future<Map<String, dynamic>> syncAll() async {
    final results = {
      'puroks_synced': 0,
      'puroks_failed': 0,
      'classifications_synced': 0,
      'classifications_failed': 0,
      'residents_synced': 0,
      'residents_failed': 0,
      'resident_classifications_synced': 0,
      'resident_classifications_failed': 0,
      'households_synced': 0,
      'households_failed': 0,
      'pets_synced': 0,
      'pets_failed': 0,
      'purok_mappings': <int, int>{},
      'classification_mappings': <int, int>{},
      'errors': <String>[],
    };

    try {
      print('🚀 ===== STARTING COMPREHENSIVE SYNC =====');
      
      // Step 1: Sync Puroks first (needed for households)
      print('\n📍 STEP 1: Syncing Puroks...');
      try {
        final purokMappings = await _purokSync.syncPuroks();
        results['puroks_synced'] = purokMappings.length;
        results['purok_mappings'] = purokMappings;
        
        final pendingCount = await _purokSync.getPendingPurokCount();
        results['puroks_failed'] = pendingCount;
        
        print('✅ Puroks sync complete: ${purokMappings.length} synced, $pendingCount failed/pending');
      } catch (e) {
        print('❌ Purok sync error: $e');
        final errorMessage = _categorizeError('Purok sync', e.toString());
        (results['errors'] as List<String>).add(errorMessage);
      }
      
      // Step 2: Sync Classification Types (needed for residents)
      print('\n📋 STEP 2: Syncing Classification Types...');
      try {
        final classificationMappings = await _classificationSync.syncClassificationTypes();
        results['classifications_synced'] = classificationMappings.length;
        results['classification_mappings'] = classificationMappings;
        
        final pendingCount = await _classificationSync.getPendingClassificationTypeCount();
        results['classifications_failed'] = pendingCount;
        
        print('✅ Classification types sync complete: ${classificationMappings.length} synced, $pendingCount failed/pending');
      } catch (e) {
        print('❌ Classification sync error: $e');
        (results['errors'] as List<String>).add('Classification sync failed: $e');
      }
      
      // Step 3: Sync Residents (uses classification mappings)
      print('\n👥 STEP 3: Syncing Residents...');
      try {
        final databaseService = DatabaseService();
        if (!databaseService.isInitialized) {
          await databaseService.initialize();
        }
        
        final pendingResidents = await databaseService.residentRepository.getPendingSync();
        print('Found ${pendingResidents.length} pending residents');
        
        int residentsSynced = 0;
        int residentsFailed = 0;
        int residentClassificationsSynced = 0;
        int residentClassificationsFailed = 0;
        
        for (final resident in pendingResidents) {
          try {
            final serverId = await _residentSync.syncResident(resident);
            if (serverId != null) {
              // Update resident with server ID and mark as synced
              final updated = await databaseService.residentRepository.updateServerResidentId(resident.id!, serverId);
              if (updated) {
                print('✅ Updated local DB: server_resident_id=$serverId, sync_status=synced');
              } else {
                print('⚠️ Failed to update local DB after sync');
              }
              residentsSynced++;
              print('✅ Resident synced: ${resident.fullName} ($serverId)');
              
              // Sync resident classifications (the link between resident and classification types)
              try {
                final classifications = await _dbHelper.getResidentClassifications(resident.id!);
                print('  Found ${classifications.length} classifications for resident ${resident.fullName}');
                
                for (final classificationData in classifications) {
                  try {
                    final classification = Classification.fromJson(classificationData);
                    
                    // Check if classification type is still active (not deleted on server)
                    final db = await _dbHelper.database;
                    
                    // Get municipality_id from barangay
                    final barangayResult = await db.query(
                      'barangays',
                      where: 'id = ?',
                      whereArgs: [resident.barangayId],
                      limit: 1,
                    );
                    
                    int? municipalityId;
                    if (barangayResult.isNotEmpty) {
                      municipalityId = barangayResult.first['municipality_id'] as int?;
                    }
                    
                    bool isDeleted = false;
                    if (municipalityId != null) {
                      final classTypeCheck = await db.query(
                        'classification_types',
                        where: 'name = ? AND municipality_id = ?',
                        whereArgs: [classification.classificationType, municipalityId],
                      );
                      
                      if (classTypeCheck.isNotEmpty) {
                        final classType = classTypeCheck.first;
                        final isActive = (classType['is_active'] ?? 1) as int;
                        if (isActive == 0) {
                          isDeleted = true;
                          print('    ⚠️ Classification "${classification.classificationType}" was deleted on server');
                          print('       Syncing anyway to preserve historical data...');
                        }
                      }
                    }
                    
                    final success = await _residentSync.syncClassification(classification, serverId);
                    if (success) {
                      residentClassificationsSynced++;
                      if (isDeleted) {
                        print('    ✅ Legacy classification synced: ${classification.classificationType} (deleted on server but data preserved)');
                      } else {
                        print('    ✅ Classification synced: ${classification.classificationType}');
                      }
                    } else {
                      residentClassificationsFailed++;
                      print('    ❌ Failed to sync classification: ${classification.classificationType}');
                    }
                  } catch (e) {
                    residentClassificationsFailed++;
                    print('    ❌ Error syncing classification: $e');
                  }
                }
              } catch (e) {
                print('  ⚠️ Error getting classifications for resident ${resident.fullName}: $e');
              }
            } else {
              residentsFailed++;
              print('❌ Failed to sync resident: ${resident.fullName}');
            }
          } catch (e) {
            residentsFailed++;
            print('❌ Error syncing resident ${resident.fullName}: $e');
            (results['errors'] as List<String>).add('Resident sync failed (${resident.fullName}): $e');
          }
        }
        
        results['residents_synced'] = residentsSynced;
        results['residents_failed'] = residentsFailed;
        results['resident_classifications_synced'] = residentClassificationsSynced;
        results['resident_classifications_failed'] = residentClassificationsFailed;
        print('✅ Residents sync complete: $residentsSynced synced, $residentsFailed failed');
        print('✅ Resident classifications sync complete: $residentClassificationsSynced synced, $residentClassificationsFailed failed');
      } catch (e) {
        print('❌ Resident sync error: $e');
        (results['errors'] as List).add('Resident sync failed: $e');
      }
      
      // Step 4: Sync Households (uses purok and resident mappings)
      print('\n🏠 STEP 4: Syncing Households...');
      try {
        final databaseService = DatabaseService();
        if (!databaseService.isInitialized) {
          await databaseService.initialize();
        }
        
        final pendingHouseholds = await databaseService.householdRepository.getPendingSync();
        print('Found ${pendingHouseholds.length} pending households');
        
        int householdsSynced = 0;
        int householdsFailed = 0;
        
        for (final household in pendingHouseholds) {
          try {
            // Get server purok ID if purok was locally created
            int? purokIdToUse = household.purokId;
            final serverPurokId = await _dbHelper.getPurokServerId(household.purokId);
            if (serverPurokId != null) {
              purokIdToUse = serverPurokId;
              print('  Mapped local purok ${household.purokId} to server purok $serverPurokId');
            }
            
            // Create household with mapped purok ID
            final householdToSync = household.copyWith(purokId: purokIdToUse);
            
            final serverId = await _householdSync.syncHousehold(householdToSync);
            if (serverId != null) {
              // Update household with server ID (convert String to int)
              final serverIdInt = int.tryParse(serverId);
              if (serverIdInt != null) {
                await databaseService.householdRepository.updateServerId(household.id!, serverIdInt);
              }
              householdsSynced++;
              print('✅ Household synced: ${household.houseNumber} ($serverId)');
            } else {
              householdsFailed++;
              print('❌ Failed to sync household: ${household.houseNumber}');
            }
          } catch (e) {
            householdsFailed++;
            print('❌ Error syncing household ${household.houseNumber}: $e');
            (results['errors'] as List<String>).add('Household sync failed (${household.houseNumber}): $e');
          }
        }
        
        results['households_synced'] = householdsSynced;
        results['households_failed'] = householdsFailed;
        print('✅ Households sync complete: $householdsSynced synced, $householdsFailed failed');
      } catch (e) {
        print('❌ Household sync error: $e');
        (results['errors'] as List<String>).add('Household sync failed: $e');
      }
      
      // Step 5: Sync Pets (needs residents to be synced first)
      print('\n🐾 STEP 5: Syncing Pets...');
      try {
        final databaseService = DatabaseService();
        if (!databaseService.isInitialized) {
          await databaseService.initialize();
        }
        
        final pendingPets = await databaseService.petsRepository.getPendingSync();
        print('Found ${pendingPets.length} pending pets');
        
        int petsSynced = 0;
        int petsFailed = 0;
        
        for (final pet in pendingPets) {
          try {
            final serverId = await _petSync.syncPet(pet);
            if (serverId != null) {
              // Update pet with server ID
              final serverIdInt = int.tryParse(serverId);
              if (serverIdInt != null && pet.id != null) {
                await databaseService.petsRepository.updateServerId(pet.id!, serverIdInt);
                petsSynced++;
                print('✅ Pet synced: ${pet.petName} ($serverId)');
              } else {
                petsFailed++;
                print('❌ Failed to parse server ID for pet: ${pet.petName}');
              }
            } else {
              petsFailed++;
              print('❌ Failed to sync pet: ${pet.petName}');
            }
          } catch (e) {
            petsFailed++;
            print('❌ Error syncing pet ${pet.petName}: $e');
            (results['errors'] as List<String>).add('Pet sync failed (${pet.petName}): $e');
          }
        }
        
        results['pets_synced'] = petsSynced;
        results['pets_failed'] = petsFailed;
        print('✅ Pets sync complete: $petsSynced synced, $petsFailed failed');
      } catch (e) {
        print('❌ Pet sync error: $e');
        (results['errors'] as List<String>).add('Pet sync failed: $e');
      }
      
      print('\n🎉 ===== COMPREHENSIVE SYNC COMPLETE =====');
      print('Summary:');
      print('  Puroks: ${results['puroks_synced']} synced, ${results['puroks_failed']} failed');
      print('  Classifications: ${results['classifications_synced']} synced, ${results['classifications_failed']} failed');
      print('  Residents: ${results['residents_synced']} synced, ${results['residents_failed']} failed');
      print('  Resident Classifications: ${results['resident_classifications_synced']} synced, ${results['resident_classifications_failed']} failed');
      print('  Households: ${results['households_synced']} synced, ${results['households_failed']} failed');
      print('  Pets: ${results['pets_synced']} synced, ${results['pets_failed']} failed');
      
      if ((results['errors'] as List).isNotEmpty) {
        print('\n⚠️ Errors encountered: ${(results['errors'] as List).length}');
      }
      
    } catch (e) {
      print('❌ Comprehensive sync error: $e');
      (results['errors'] as List<String>).add('Comprehensive sync failed: $e');
    }
    
    return results;
  }
  
  /// Sync only residents (with automatic purok/classification sync if needed)
  Future<Map<String, dynamic>> syncResidentsOnly() async {
    final results = {
      'puroks_synced': 0,
      'classifications_synced': 0,
      'residents_synced': 0,
      'residents_failed': 0,
      'errors': <String>[],
    };
    
    try {
      // Pre-sync puroks and classifications if needed
      final pendingPurokCount = await _purokSync.getPendingPurokCount();
      if (pendingPurokCount > 0) {
        print('📍 Pre-syncing $pendingPurokCount puroks...');
        final purokMappings = await _purokSync.syncPuroks();
        results['puroks_synced'] = purokMappings.length;
      }
      
      final pendingClassificationCount = await _classificationSync.getPendingClassificationTypeCount();
      if (pendingClassificationCount > 0) {
        print('📋 Pre-syncing $pendingClassificationCount classification types...');
        final classificationMappings = await _classificationSync.syncClassificationTypes();
        results['classifications_synced'] = classificationMappings.length;
      }
      
      // Sync residents
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      final pendingResidents = await databaseService.residentRepository.getPendingSync();
      
      int synced = 0;
      int failed = 0;
      
      for (final resident in pendingResidents) {
        try {
          final serverId = await _residentSync.syncResident(resident);
          if (serverId != null) {
            await databaseService.residentRepository.updateServerResidentId(resident.id!, serverId);
            synced++;
          } else {
            failed++;
          }
        } catch (e) {
          failed++;
          (results['errors'] as List<String>).add('Resident sync failed (${resident.fullName}): $e');
        }
      }
      
      results['residents_synced'] = synced;
      results['residents_failed'] = failed;
      
    } catch (e) {
      print('❌ Residents sync error: $e');
      (results['errors'] as List<String>).add('Residents sync failed: $e');
    }
    
    return results;
  }
  
  /// Sync only households (with automatic purok sync if needed)
  Future<Map<String, dynamic>> syncHouseholdsOnly() async {
    final results = {
      'puroks_synced': 0,
      'households_synced': 0,
      'households_failed': 0,
      'errors': <String>[],
    };
    
    try {
      // Pre-sync puroks if needed
      final pendingPurokCount = await _purokSync.getPendingPurokCount();
      if (pendingPurokCount > 0) {
        print('📍 Pre-syncing $pendingPurokCount puroks...');
        final purokMappings = await _purokSync.syncPuroks();
        results['puroks_synced'] = purokMappings.length;
      }
      
      // Sync households
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      final pendingHouseholds = await databaseService.householdRepository.getPendingSync();
      
      int synced = 0;
      int failed = 0;
      
      for (final household in pendingHouseholds) {
        try {
          // Map purok ID if needed
          int? purokIdToUse = household.purokId;
          final serverPurokId = await _dbHelper.getPurokServerId(household.purokId);
          if (serverPurokId != null) {
            purokIdToUse = serverPurokId;
          }
          
          final householdToSync = household.copyWith(purokId: purokIdToUse);
          final serverId = await _householdSync.syncHousehold(householdToSync);
          
          if (serverId != null) {
            // Convert String to int for updateServerId
            final serverIdInt = int.tryParse(serverId);
            if (serverIdInt != null) {
              await databaseService.householdRepository.updateServerId(household.id!, serverIdInt);
            }
            synced++;
          } else {
            failed++;
          }
        } catch (e) {
          failed++;
          (results['errors'] as List<String>).add('Household sync failed (${household.houseNumber}): $e');
        }
      }
      
      results['households_synced'] = synced;
      results['households_failed'] = failed;
      
    } catch (e) {
      print('❌ Households sync error: $e');
      (results['errors'] as List<String>).add('Households sync failed: $e');
    }
    
    return results;
  }
  
  /// Get overall sync status
  Future<Map<String, int>> getSyncStatus() async {
    final purokCount = await _purokSync.getPendingPurokCount();
    final classificationCount = await _classificationSync.getPendingClassificationTypeCount();
    
    final databaseService = DatabaseService();
    if (!databaseService.isInitialized) {
      await databaseService.initialize();
    }
    
    final pendingResidents = await databaseService.residentRepository.getPendingSync();
    final pendingHouseholds = await databaseService.householdRepository.getPendingSync();
    final pendingPets = await databaseService.petsRepository.getPendingSync();
    
    final totalPending = purokCount + classificationCount + pendingResidents.length + pendingHouseholds.length + pendingPets.length;
    
    return {
      'pending_puroks': purokCount,
      'pending_classifications': classificationCount,
      'pending_residents': pendingResidents.length,
      'pending_households': pendingHouseholds.length,
      'pending_pets': pendingPets.length,
      'total_pending': totalPending,
    };
  }

  /// Categorize and format error messages for better user understanding
  String _categorizeError(String operation, String error) {
    final errorLower = error.toLowerCase();
    
    // Network-related errors
    if (errorLower.contains('network') || 
        errorLower.contains('connection') ||
        errorLower.contains('timeout') ||
        errorLower.contains('socket') ||
        errorLower.contains('unreachable')) {
      return '$operation failed: Network connection issue. Please check your internet connection.';
    }
    
    // Server errors
    if (errorLower.contains('server') || 
        errorLower.contains('500') ||
        errorLower.contains('502') ||
        errorLower.contains('503') ||
        errorLower.contains('504')) {
      return '$operation failed: Server is temporarily unavailable. Please try again later.';
    }
    
    // Authentication errors
    if (errorLower.contains('unauthorized') || 
        errorLower.contains('401') ||
        errorLower.contains('token') ||
        errorLower.contains('auth')) {
      return '$operation failed: Authentication expired. Please log in again.';
    }
    
    // Data validation errors
    if (errorLower.contains('validation') || 
        errorLower.contains('invalid') ||
        errorLower.contains('required') ||
        errorLower.contains('format')) {
      return '$operation failed: Data validation error. Please check your data.';
    }
    
    // Database errors
    if (errorLower.contains('database') || 
        errorLower.contains('sql') ||
        errorLower.contains('constraint') ||
        errorLower.contains('duplicate')) {
      return '$operation failed: Database error. Please contact support.';
    }
    
    // File/image errors
    if (errorLower.contains('file') || 
        errorLower.contains('image') ||
        errorLower.contains('upload') ||
        errorLower.contains('permission')) {
      return '$operation failed: File processing error. Please check your files.';
    }
    
    // Generic fallback
    return '$operation failed: $error';
  }
}

