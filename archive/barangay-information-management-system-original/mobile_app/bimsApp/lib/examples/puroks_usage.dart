// Example usage of Puroks functionality
// This file demonstrates how to use the puroks API and local storage

import '../core/services/auth_service.dart';
import '../core/services/secure_storage_service.dart';

class PuroksUsageExample {
  final AuthService _authService = AuthService();
  final SecureStorageService _secureStorage = SecureStorageService();

  /// Example: Fetch puroks from API and store locally
  Future<void> fetchAndStorePuroksExample() async {
    try {
      // Get user's barangay ID from stored data
      final userData = await _secureStorage.getUserData();
      if (userData?.targetId != null && userData?.targetType == 'barangay') {
        final barangayId = userData!.targetId!;
        
        // Fetch puroks from API and store locally
        final puroks = await _authService.fetchAndStorePuroks(barangayId);
        
        print('✅ Fetched ${puroks.length} puroks and stored them locally');
        
        // Display puroks
        for (final purok in puroks) {
          print('🏘️ ${purok.purokName} (ID: ${purok.purokId})');
          if (purok.purokLeader != null) {
            print('   Leader: ${purok.purokLeader}');
          }
          if (purok.description != null) {
            print('   Description: ${purok.description}');
          }
        }
      } else {
        print('❌ User is not associated with a barangay');
      }
    } catch (error) {
      print('❌ Error fetching puroks: $error');
    }
  }

  /// Example: Get stored puroks from local database
  Future<void> getStoredPuroksExample() async {
    try {
      // Get user's barangay ID from stored data
      final userData = await _secureStorage.getUserData();
      if (userData?.targetId != null && userData?.targetType == 'barangay') {
        final barangayId = userData!.targetId!;
        
        // Get puroks from local database
        final storedPuroks = await _authService.getStoredPuroks(barangayId);
        
        print('📖 Retrieved ${storedPuroks.length} stored puroks:');
        for (final purok in storedPuroks) {
          print('🏘️ ${purok['name']} (ID: ${purok['id']})');
          if (purok['leader'] != null) {
            print('   Leader: ${purok['leader']}');
          }
          if (purok['description'] != null) {
            print('   Description: ${purok['description']}');
          }
        }
      } else {
        print('❌ User is not associated with a barangay');
      }
    } catch (error) {
      print('❌ Error getting stored puroks: $error');
    }
  }

  /// Example: Get all puroks using SecureStorageService
  Future<void> getAllPuroksExample() async {
    try {
      // Get all puroks from local database
      final allPuroks = await _secureStorage.getPuroksInfo();
      
      print('📋 All stored puroks: ${allPuroks.length}');
      for (final purok in allPuroks) {
        print('🏘️ ${purok['name']} (Barangay ID: ${purok['barangay_id']})');
      }
    } catch (error) {
      print('❌ Error getting all puroks: $error');
    }
  }

  /// Example: Clear puroks data
  Future<void> clearPuroksExample() async {
    try {
      await _secureStorage.clearPuroksData();
      print('🗑️ All puroks data cleared');
    } catch (error) {
      print('❌ Error clearing puroks data: $error');
    }
  }

  /// Example: Complete workflow - fetch, store, and retrieve puroks
  Future<void> completePuroksWorkflow() async {
    print('🚀 Starting complete puroks workflow...');
    
    try {
      // Step 1: Fetch and store puroks
      print('\n1️⃣ Fetching puroks from API and storing locally...');
      await fetchAndStorePuroksExample();
      
      // Step 2: Retrieve stored puroks
      print('\n2️⃣ Retrieving stored puroks...');
      await getStoredPuroksExample();
      
      // Step 3: Show all puroks
      print('\n3️⃣ Showing all stored puroks...');
      await getAllPuroksExample();
      
      print('\n✅ Complete puroks workflow finished successfully!');
    } catch (error) {
      print('\n❌ Error in complete workflow: $error');
    }
  }
}

// Usage in your app:
/*
final puroksExample = PuroksUsageExample();

// Run complete workflow
await puroksExample.completePuroksWorkflow();

// Or run individual examples
await puroksExample.fetchAndStorePuroksExample();
await puroksExample.getStoredPuroksExample();
await puroksExample.getAllPuroksExample();
*/
