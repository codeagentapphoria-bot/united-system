import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../data/models/auth_models.dart';
import '../../data/database/database_helper.dart';

class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  SecureStorageService._internal();

  static const FlutterSecureStorage _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  // Storage keys
  static const String _tokenKey = 'jwt_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userDataKey = 'user_data';
  static const String _loginCredentialsKey = 'login_credentials';

  // Token management
  Future<void> storeTokens(String token, String? refreshToken) async {
    print('🎫 SECURE STORAGE - Storing Tokens:');
    print('   Access Token: ${token.length} characters');
    print('   Refresh Token: ${refreshToken != null ? '${refreshToken.length} characters' : 'null'}');
    
    await _storage.write(key: _tokenKey, value: token);
    print('   ✅ Access token stored');
    
    if (refreshToken != null) {
      await _storage.write(key: _refreshTokenKey, value: refreshToken);
      print('   ✅ Refresh token stored');
    }
  }

  Future<String?> getToken() async {
    final token = await _storage.read(key: _tokenKey);
    print('🎫 SECURE STORAGE - Reading Access Token: ${token != null ? 'Present (${token.length} chars)' : 'null'}');
    return token;
  }

  Future<String?> getRefreshToken() async {
    final refreshToken = await _storage.read(key: _refreshTokenKey);
    print('🔄 SECURE STORAGE - Reading Refresh Token: ${refreshToken != null ? 'Present (${refreshToken.length} chars)' : 'null'}');
    return refreshToken;
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  /// Check if we have valid tokens stored
  Future<bool> hasValidTokens() async {
    try {
      final accessToken = await _storage.read(key: _tokenKey);
      return accessToken != null && accessToken.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  // User data management
  Future<void> storeUserData(UserData userData) async {
    print('💾 SECURE STORAGE - Storing User Data:');
    print('   User ID: ${userData.id}');
    print('   Name: ${userData.name}');
    print('   Email: ${userData.email}');
    print('   Barangay: ${userData.barangayName}');
    
    final userJson = userData.toJson();
    final jsonString = jsonEncode(userJson);
    print('   JSON Length: ${jsonString.length} characters');
    
    await _storage.write(key: _userDataKey, value: jsonString);
    print('   ✅ User data written to secure storage');
  }

  Future<UserData?> getUserData() async {
    print('📖 SECURE STORAGE - Reading User Data:');
    
    final userJsonString = await _storage.read(key: _userDataKey);
    print('   Raw data from storage: ${userJsonString != null ? 'Present (${userJsonString.length} chars)' : 'null'}');
    
    if (userJsonString != null) {
      try {
        final userJson = jsonDecode(userJsonString) as Map<String, dynamic>;
        print('   Parsed JSON: $userJson');
        
        final userData = UserData.fromJson(userJson);
        print('   ✅ User data retrieved successfully');
        print('   User: ${userData.name} (${userData.email})');
        
        return userData;
      } catch (e) {
        print('   ❌ Error parsing user data: $e');
        return null;
      }
    }
    
    print('   ❌ No user data found in storage');
    return null;
  }

  // Login credentials management (for display purposes)
  Future<void> storeLoginCredentials(String email, String password) async {
    print('🔐 SECURE STORAGE - Storing Login Credentials:');
    print('   Email: $email');
    print('   Password: ${password.replaceRange(2, password.length, '*' * (password.length - 2))}');
    
    final credentials = {
      'email': email,
      'password': password, // Note: In production, consider hashing this
      'login_time': DateTime.now().toIso8601String(),
    };
    
    final jsonString = jsonEncode(credentials);
    print('   JSON Length: ${jsonString.length} characters');
    
    await _storage.write(key: _loginCredentialsKey, value: jsonString);
    print('   ✅ Login credentials stored');
  }

  Future<Map<String, dynamic>?> getLoginCredentials() async {
    print('🔐 SECURE STORAGE - Reading Login Credentials:');
    
    final credentialsString = await _storage.read(key: _loginCredentialsKey);
    print('   Raw data: ${credentialsString != null ? 'Present (${credentialsString.length} chars)' : 'null'}');
    
    if (credentialsString != null) {
      try {
        final credentials = jsonDecode(credentialsString) as Map<String, dynamic>;
        print('   ✅ Login credentials retrieved successfully');
        return credentials;
      } catch (e) {
        print('   ❌ Error parsing login credentials: $e');
        return null;
      }
    }
    
    print('   ❌ No login credentials found');
    return null;
  }

  // Authentication status
  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  // Clear all stored data
  Future<void> clearAll() async {
    await _storage.deleteAll();
  }

  // Get all stored data for display (for settings screen)
  Future<Map<String, String?>> getAllStoredData() async {
    print('📋 SECURE STORAGE - Getting All Stored Data:');
    
    final token = await getToken();
    final refreshToken = await getRefreshToken();
    final userData = await _storage.read(key: _userDataKey);
    final credentials = await _storage.read(key: _loginCredentialsKey);
    
    print('   Token: ${token != null ? 'Present' : 'Missing'}');
    print('   Refresh Token: ${refreshToken != null ? 'Present' : 'Missing'}');
    print('   User Data: ${userData != null ? 'Present' : 'Missing'}');
    print('   Credentials: ${credentials != null ? 'Present' : 'Missing'}');
    
    final result = {
      'token': token,
      'refresh_token': refreshToken,
      'user_data': userData,
      'login_credentials': credentials,
    };
    
    print('   ✅ Returning ${result.length} data items');
    return result;
  }

  // Get barangay information from stored user data
  Future<Map<String, String?>> getBarangayInfo() async {
    print('🏘️ SECURE STORAGE - Getting Barangay Information:');
    
    final userData = await getUserData();
    if (userData != null) {
      final barangayInfo = {
        'barangay_name': userData.barangayName,
        'barangay_code': userData.barangayCode,
        'barangay_logo_path': userData.barangayLogoPath,
        'certificate_background_path': userData.certificateBackgroundPath,
        'organizational_chart_path': userData.organizationalChartPath,
        'contact_number': userData.barangayContactNumber,
        'barangay_email': userData.barangayEmail,
        'gis_code': userData.gisCode,
        'municipality_name': userData.municipalityName,
        'municipality_logo_path': userData.municipalityLogoPath,
        'province_name': userData.provinceName,
        'region': userData.region,
        'captain_name': userData.captainName,
        'captain_position': userData.captainPosition,
        'target_id': userData.targetId?.toString(),
        'target_type': userData.targetType,
      };
      
      print('   ✅ Barangay info retrieved:');
      print('     Barangay: ${userData.barangayName}');
      print('     Municipality: ${userData.municipalityName}');
      print('     Province: ${userData.provinceName}');
      print('     Captain: ${userData.captainName} (${userData.captainPosition})');
      
      return barangayInfo;
    }
    
    print('   ❌ No user data found');
    return {};
  }

  /// Get puroks information from stored data
  Future<List<Map<String, dynamic>>> getPuroksInfo() async {
    print('🏘️ SECURE STORAGE - Getting Puroks Information:');
    
    try {
      final db = await DatabaseHelper.instance.database;
      final puroks = await db.query(
        'puroks',
        orderBy: 'name ASC',
      );
      
      print('   ✅ Puroks info retrieved:');
      print('     Total puroks: ${puroks.length}');
      for (final purok in puroks) {
        print('     - ${purok['name']} (ID: ${purok['id']})');
      }
      
      return puroks;
    } catch (error) {
      print('   ❌ Error getting puroks info: $error');
      return [];
    }
  }

  /// Get puroks for a specific barangay
  Future<List<Map<String, dynamic>>> getPuroksForBarangay(int barangayId) async {
    print('🏘️ SECURE STORAGE - Getting Puroks for Barangay:');
    print('   Barangay ID: $barangayId');
    
    try {
      final db = await DatabaseHelper.instance.database;
      final puroks = await db.query(
        'puroks',
        where: 'barangay_id = ?',
        whereArgs: [barangayId],
        orderBy: 'name ASC',
      );
      
      print('   ✅ Puroks retrieved:');
      print('     Total puroks: ${puroks.length}');
      for (final purok in puroks) {
        print('     - ${purok['name']} (ID: ${purok['id']})');
      }
      
      return puroks;
    } catch (error) {
      print('   ❌ Error getting puroks for barangay: $error');
      return [];
    }
  }

  /// Clear all puroks data
  Future<void> clearPuroksData() async {
    print('🗑️ SECURE STORAGE - Clearing Puroks Data:');
    print('   ⚠️ DISABLED: Purok clearing disabled to prevent CASCADE DELETE');
    print('   ℹ️ Puroks are now updated/inserted instead of deleted/recreated');
    print('   ℹ️ This prevents household data loss during login');
    
    // DISABLED: No longer clear puroks to prevent CASCADE DELETE
    // The purok fetching logic now uses update/insert instead of delete/recreate
    // This ensures households are never deleted due to purok changes
  }

  /// Get classification types information from stored data
  Future<List<Map<String, dynamic>>> getClassificationTypesInfo() async {
    print('🏷️ SECURE STORAGE - Getting Classification Types Information:');
    
    try {
      final db = await DatabaseHelper.instance.database;
      final classificationTypes = await db.query(
        'classification_types',
        orderBy: 'municipality_id ASC, name ASC',
      );
      
      print('   ✅ Classification types info retrieved:');
      print('     Total classification types: ${classificationTypes.length}');
      for (final classificationType in classificationTypes) {
        print('     - ${classificationType['name']} (ID: ${classificationType['id']}, Municipality: ${classificationType['municipality_id']})');
      }
      
      return classificationTypes;
    } catch (error) {
      print('   ❌ Error getting classification types info: $error');
      return [];
    }
  }

  /// Get classification types for a specific municipality
  Future<List<Map<String, dynamic>>> getClassificationTypesForMunicipality(int municipalityId) async {
    print('🏷️ SECURE STORAGE - Getting Classification Types for Municipality:');
    print('   Municipality ID: $municipalityId');
    
    try {
      final db = await DatabaseHelper.instance.database;
      final classificationTypes = await db.query(
        'classification_types',
        where: 'municipality_id = ? AND is_active = 1',
        whereArgs: [municipalityId],
        orderBy: 'name ASC',
      );
      
      print('   ✅ Classification types for municipality retrieved:');
      print('     Total classification types: ${classificationTypes.length}');
      for (final classificationType in classificationTypes) {
        print('     - ${classificationType['name']} (ID: ${classificationType['id']})');
      }
      
      return classificationTypes;
    } catch (error) {
      print('   ❌ Error getting classification types for municipality: $error');
      return [];
    }
  }

  /// Clear all classification types data
  Future<void> clearClassificationTypesData() async {
    print('🗑️ SECURE STORAGE - Clearing Classification Types Data:');
    print('   ⚠️ DISABLED: Classification clearing disabled to prevent data loss');
    print('   ℹ️ Classifications are now updated/inserted instead of deleted/recreated');
    print('   ℹ️ This prevents resident data loss during login');
    
    // DISABLED: No longer clear classifications to prevent data loss
    // The classification fetching logic now uses update/insert instead of delete/recreate
    // This ensures resident data is never lost due to classification changes
  }
}
