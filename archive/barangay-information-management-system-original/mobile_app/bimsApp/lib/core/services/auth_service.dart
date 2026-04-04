import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../data/models/auth_models.dart';
import '../config/api_config.dart';
import 'api_service.dart';
import 'secure_storage_service.dart';
import '../../data/database/database_helper.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final ApiService _apiService = ApiService();
  final SecureStorageService _secureStorage = SecureStorageService();

  /// Initialize the auth service
  Future<void> initialize({String? customIpAddress}) async {
    await _apiService.initialize(customBaseUrl: customIpAddress);
  }

  /// Debug function to test API response format
  Future<void> debugApiResponse(String email, String password) async {
    try {
      print('🔍 DEBUG: Testing API response format...');
      
      final loginRequest = LoginRequest(
        email: email,
        password: password,
      );

      print('📤 Sending request to: ${ApiConfig.baseUrl}${ApiConfig.loginEndpoint}');
      print('📤 Request data: ${loginRequest.toJson()}');

      final response = await _apiService.dio.post(
        ApiConfig.loginEndpoint,
        data: loginRequest.toJson(),
      );

      print('📥 DEBUG RESPONSE:');
      print('   Status Code: ${response.statusCode}');
      print('   Headers: ${response.headers}');
      print('   Data Type: ${response.data.runtimeType}');
      print('   Raw Data: ${response.data}');
      
      // Try to pretty print the JSON
      if (response.data is Map) {
        print('   Formatted JSON:');
        final data = response.data as Map<String, dynamic>;
        data.forEach((key, value) {
          print('     $key: $value (${value.runtimeType})');
        });
      }
      
    } catch (e) {
      print('❌ DEBUG ERROR: $e');
    }
  }

  /// Login user with email and password
  Future<LoginResponse> login(String email, String password) async {
    try {
      final loginRequest = LoginRequest(
        email: email,
        password: password,
      );

      print('🔐 LOGIN REQUEST:');
      print('📧 Email: $email');
      print('🔑 Password: ${password.replaceRange(2, password.length, '*' * (password.length - 2))}');
      print('🌐 API URL: ${ApiConfig.baseUrl}${ApiConfig.loginEndpoint}');
      print('📤 Request Data: ${loginRequest.toJson()}');

      final response = await _apiService.dio.post(
        ApiConfig.loginEndpoint,
        data: loginRequest.toJson(),
      );

      print('📥 LOGIN RESPONSE:');
      print('📊 Status Code: ${response.statusCode}');
      print('📋 Response Data: ${response.data}');
      print('📋 Response Data Type: ${response.data.runtimeType}');
      print('📋 Response Headers: ${response.headers}');

      if (response.statusCode == 200) {
        print('🔍 PARSING RESPONSE DATA:');
        print('   Raw data: ${response.data}');
        
        try {
          // Parse the response data
          Map<String, dynamic> responseData;
          
          if (response.data is Map<String, dynamic>) {
            responseData = response.data as Map<String, dynamic>;
          } else if (response.data is String) {
            // If it's a string, try to parse as JSON
            responseData = jsonDecode(response.data as String) as Map<String, dynamic>;
          } else {
            // Convert to string and try to parse
            responseData = jsonDecode(response.data.toString()) as Map<String, dynamic>;
          }
          
          print('🔍 PARSED RESPONSE DATA: $responseData');
          
          // Create LoginResponse using the updated parsing logic
          final loginResponse = LoginResponse.fromJson(responseData);
          
          print('✅ LOGIN RESPONSE PARSED:');
          print('🎯 Success: ${loginResponse.success}');
          print('💬 Message: ${loginResponse.message}');
          print('🎫 Access Token: ${loginResponse.accessToken != null ? 'Present (${loginResponse.accessToken!.length} chars)' : 'Missing'}');
          print('🔄 Refresh Token: ${loginResponse.refreshToken != null ? 'Present (${loginResponse.refreshToken!.length} chars)' : 'Missing'}');
          print('👤 User Data: ${loginResponse.user != null ? 'Present' : 'Missing'}');
          
          if (loginResponse.user != null) {
            print('👤 USER DETAILS PARSED:');
            print('   ID: ${loginResponse.user!.id}');
            print('   Name: ${loginResponse.user!.name}');
            print('   Email: ${loginResponse.user!.email}');
            print('   Role: ${loginResponse.user!.role}');
            print('   Target ID: ${loginResponse.user!.targetId} (${loginResponse.user!.targetId.runtimeType})');
            print('   Target Type: ${loginResponse.user!.targetType}');
            print('   Barangay Name: ${loginResponse.user!.barangayName}');
            print('   Municipality: ${loginResponse.user!.municipalityName}');
            print('   Province: ${loginResponse.user!.provinceName}');
          }
          
          // Store tokens and user data if login is successful
          if (loginResponse.success && loginResponse.accessToken != null) {
            print('💾 STORING DATA:');
            
            await _apiService.setTokens(
              loginResponse.accessToken!,
              loginResponse.refreshToken,
            );
            print('   ✅ Tokens stored');
            
            // Store user data securely and fetch barangay details if needed
            if (loginResponse.user != null) {
              print('   📝 Storing user data: ${loginResponse.user!.name} (${loginResponse.user!.email})');
              
              // Check if this is a different user or different barangay logging in
              final existingUser = await _secureStorage.getUserData();
              if (existingUser != null) {
                final isDifferentUser = existingUser.id != loginResponse.user!.id;
                final isDifferentBarangay = existingUser.targetId != loginResponse.user!.targetId;
                
                if (isDifferentUser || isDifferentBarangay) {
                  if (isDifferentUser) {
                    print('   🔄 Different user detected (${existingUser.id} -> ${loginResponse.user!.id})');
                  }
                  if (isDifferentBarangay) {
                    print('   🔄 Different barangay detected (${existingUser.targetId} -> ${loginResponse.user!.targetId})');
                    print('   🗺️ Clearing old map tiles and polygon data...');
                    
                    // Clear ALL offline map data (tiles and polygons from previous barangay)
                    try {
                      final dbHelper = DatabaseHelper.instance;
                      
                      // Verify before cleanup
                      final beforeCount = await dbHelper.getMapTileCount();
                      print('   📊 Tiles before cleanup: $beforeCount');
                      
                      await dbHelper.clearAllOfflineMapData();
                      
                      // Verify after cleanup
                      final afterCount = await dbHelper.getMapTileCount();
                      print('   📊 Tiles after cleanup: $afterCount');
                      
                      if (afterCount == 0) {
                        print('   ✅ Old map data cleared from database SUCCESSFULLY');
                      } else {
                        print('   ⚠️ WARNING: $afterCount tiles still remain in database!');
                      }
                      
                      // IMPORTANT: Clear Flutter's image cache to remove cached tiles
                      // This prevents old tiles from being displayed after switching barangays
                      print('   🧹 Clearing Flutter image cache...');
                      imageCache.clear();
                      imageCache.clearLiveImages();
                      print('   ✅ Image cache cleared');
                      
                      // Additional cache clearing - force immediate eviction
                      print('   🧹 Forcing cache eviction...');
                      await Future.delayed(const Duration(milliseconds: 100));
                      imageCache.clear();
                      print('   ✅ Cache eviction complete');
                      
                      print('   ✅ Old map data cleared successfully');
                    } catch (error) {
                      print('   ⚠️ Failed to clear map data: $error');
                      print('   ⚠️ Error details: ${error.toString()}');
                      // Don't fail the login if map clearing fails
                    }
                  }
                  
                  // Clear old purok and classification data
                  print('   🧹 Clearing old purok and classification data...');
                  await _secureStorage.clearPuroksData();
                  await _secureStorage.clearClassificationTypesData();
                  print('   ✅ Old data cleared');
                }
              }
              
              // Check if user is associated with a barangay and fetch complete details
              if (loginResponse.user!.targetId != null && loginResponse.user!.targetType == 'barangay') {
                print('   🏘️ User is associated with barangay, fetching complete details...');
                print('   📋 User targetId: ${loginResponse.user!.targetId}');
                print('   📋 User targetType: ${loginResponse.user!.targetType}');
                await updateUserBarangayInfo(loginResponse.user!);
                
                // Store barangay and municipality data in database first
                print('   🏘️ Storing barangay and municipality data...');
                try {
                  await storeBarangayAndMunicipalityData(loginResponse.user!.targetId!);
                  print('   ✅ Barangay and municipality data stored successfully');
                } catch (error) {
                  print('   ⚠️ Failed to store barangay data: $error');
                  // Don't fail the login if barangay data storage fails
                }

                // Also fetch and store puroks for this barangay
                print('   🏘️ Fetching puroks for barangay...');
                try {
                  await fetchAndStorePuroks(loginResponse.user!.targetId!);
                  print('   ✅ Puroks fetched and stored successfully');
                } catch (error) {
                  print('   ⚠️ Failed to fetch puroks: $error');
                  // Don't fail the login if puroks fetch fails
                }

                // Also fetch and store classification types for this municipality
                print('   🏷️ Fetching classification types for municipality...');
                try {
                  // Get the updated user data to access municipality_id
                  final updatedUserData = await _secureStorage.getUserData();
                  print('   📋 Updated user data: ${updatedUserData?.toJson()}');
                  
                  if (updatedUserData != null && updatedUserData.targetId != null) {
                    // We need to fetch the barangay data again to get municipality_id
                    print('   🔍 Fetching barangay details for targetId: ${updatedUserData.targetId}');
                    final barangayData = await fetchBarangayDetails(updatedUserData.targetId!);
                    print('   📋 Barangay data: ${barangayData?.toJson()}');
                    
                    if (barangayData?.municipalityId != null) {
                      print('   🏛️ Municipality ID found: ${barangayData!.municipalityId}');
                      await fetchAndStoreClassificationTypes(barangayData.municipalityId);
                      print('   ✅ Classification types fetched and stored successfully');
                    } else {
                      print('   ⚠️ Could not get municipality_id from barangay data');
                      print('   📋 Barangay data municipalityId: ${barangayData?.municipalityId}');
                    }
                  } else {
                    print('   ⚠️ No user data or targetId found');
                  }
                } catch (error) {
                  print('   ❌ Failed to fetch classification types: $error');
                  print('   📋 Error details: ${error.toString()}');
                  // Don't fail the login if classification types fetch fails
                }
              } else {
                print('   📝 User not associated with barangay, storing basic user data');
                await _secureStorage.storeUserData(loginResponse.user!);
              }
              
              print('   ✅ User data stored');
              
              // Verify the data was stored
              final storedUser = await _secureStorage.getUserData();
              if (storedUser != null) {
                print('   ✅ User data verification successful: ${storedUser.name}');
                if (storedUser.barangayName != null) {
                  print('   🏘️ Barangay details available: ${storedUser.barangayName}');
                }
              } else {
                print('   ❌ User data verification failed - data not found');
              }
            } else {
              print('   ❌ No user data to store');
            }
            
            // Store login credentials for display purposes
            await _secureStorage.storeLoginCredentials(email, password);
            print('   ✅ Login credentials stored');
            
            print('🎉 ALL DATA STORED SUCCESSFULLY!');
          } else {
            print('❌ LOGIN FAILED - NOT STORING DATA');
            print('   Success: ${loginResponse.success}');
            print('   Access Token: ${loginResponse.accessToken != null}');
          }
          
          return loginResponse;
        } catch (parseError) {
          print('❌ ERROR PARSING RESPONSE: $parseError');
          print('   Raw response data: ${response.data}');
          print('   Response data type: ${response.data.runtimeType}');
          
          return LoginResponse(
            success: false,
            message: 'Failed to parse server response: $parseError',
          );
        }
      } else {
        print('❌ HTTP ERROR: ${response.statusCode}');
        return LoginResponse(
          success: false,
          message: 'Login failed with status: ${response.statusCode}',
        );
      }
    } on DioException catch (e) {
      print('🌐 DIO ERROR:');
      print('   Type: ${e.type}');
      print('   Message: ${e.message}');
      print('   Response: ${e.response?.data}');
      print('   Status Code: ${e.response?.statusCode}');
      
      final apiError = ApiError.fromDioError(e);
      return LoginResponse(
        success: false,
        message: apiError.message,
      );
    } catch (e) {
      print('💥 UNEXPECTED ERROR: $e');
      return LoginResponse(
        success: false,
        message: 'An unexpected error occurred: $e',
      );
    }
  }

  /// Logout user
  Future<bool> logout() async {
    try {
      final response = await _apiService.dio.post(
        ApiConfig.logoutEndpoint,
      );

      // Clear only authentication tokens, preserve purok and classification data
      await _apiService.clearTokens();
      await _secureStorage.clearTokens();
      
      return response.statusCode == 200;
    } catch (e) {
      // Clear tokens even if logout request fails
      await _apiService.clearTokens();
      await _secureStorage.clearTokens();
      return false;
    }
  }

  /// Complete logout - clears all data including puroks and classification types
  Future<bool> completeLogout() async {
    try {
      final response = await _apiService.dio.post(
        ApiConfig.logoutEndpoint,
      );

      // Clear all data including puroks and classification types
      await _apiService.clearTokens();
      await _secureStorage.clearAll();
      
      return response.statusCode == 200;
    } catch (e) {
      // Clear all data even if logout request fails
      await _apiService.clearTokens();
      await _secureStorage.clearAll();
      return false;
    }
  }

  /// Check if user is logged in offline (without network)
  Future<bool> isLoggedInOffline() async {
    try {
      print('🔍 Checking offline login status...');
      
      // Check if we have valid tokens and user data stored
      final hasTokens = await _secureStorage.hasValidTokens();
      final userData = await _secureStorage.getUserData();
      
      print('   📋 Has tokens: $hasTokens');
      print('   📋 Has user data: ${userData != null}');
      
      if (hasTokens && userData != null) {
        print('   ✅ User is logged in offline');
        return true;
      }
      
      print('   ❌ User is not logged in offline');
      return false;
    } catch (e) {
      print('   ❌ Error checking offline login status: $e');
      return false;
    }
  }

  /// Get stored user data for offline use
  Future<UserData?> getStoredUserData() async {
    return await _secureStorage.getUserData();
  }

  /// Check if this is the first app launch (no stored data)
  Future<bool> isFirstLaunch() async {
    try {
      final hasTokens = await _secureStorage.hasValidTokens();
      final userData = await _secureStorage.getUserData();
      
      return !hasTokens && userData == null;
    } catch (e) {
      print('Error checking first launch status: $e');
      return true; // Assume first launch if error
    }
  }

  /// Get user profile
  Future<UserData?> getProfile() async {
    try {
      final response = await _apiService.dio.get(
        ApiConfig.profileEndpoint,
      );

      if (response.statusCode == 200) {
        return UserData.fromJson(response.data['user']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    return await _apiService.isAuthenticated();
  }

  /// Get current access token
  Future<String?> getToken() async {
    return await _apiService.getToken();
  }

  /// Refresh access token
  Future<bool> refreshToken() async {
    try {
      final response = await _apiService.dio.post(
        ApiConfig.refreshTokenEndpoint,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        await _apiService.setTokens(
          data['access_token'],
          data['refresh_token'],
        );
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Clear all authentication data
  Future<void> clearAuth() async {
    await _apiService.clearTokens();
    await _secureStorage.clearAll();
  }


  /// Get stored login credentials
  Future<Map<String, dynamic>?> getStoredLoginCredentials() async {
    return await _secureStorage.getLoginCredentials();
  }

  /// Get barangay information from stored user data
  Future<Map<String, String?>> getBarangayInfo() async {
    return await _secureStorage.getBarangayInfo();
  }

  /// Get all stored data for display
  Future<Map<String, String?>> getAllStoredData() async {
    return await _secureStorage.getAllStoredData();
  }

  /// Fetch barangay details by ID
  Future<BarangayData?> fetchBarangayDetails(int barangayId) async {
    try {
      print('🏘️ FETCHING BARANGAY DETAILS:');
      print('   Barangay ID: $barangayId');
      print('   Endpoint: ${ApiConfig.baseUrl}${ApiConfig.getBarangayEndpointAuthenticated(barangayId)}');

      final response = await _apiService.dio.get(
        ApiConfig.getBarangayEndpointAuthenticated(barangayId),
      );

      print('📥 BARANGAY DETAILS RESPONSE:');
      print('   Status Code: ${response.statusCode}');
      print('   Response Data: ${response.data}');
      
      // Debug GIS code specifically
      if (response.data is Map<String, dynamic> && response.data['data'] != null) {
        final data = response.data['data'];
        print('   🗺️ GIS Code Debug:');
        print('     gis_code field: "${data['gis_code']}"');
        print('     gis_code type: ${data['gis_code'].runtimeType}');
        print('     All data fields: ${data.keys.toList()}');
      }

      if (response.statusCode == 200) {
        final data = response.data;
        if (data is Map<String, dynamic> && data.containsKey('data')) {
          final barangayData = BarangayData.fromJson(data['data']);
          print('✅ BARANGAY DETAILS PARSED:');
          print('   Barangay Name: ${barangayData.barangayName}');
          print('   Municipality: ${barangayData.municipalityName}');
          print('   Province: ${barangayData.province}');
          print('   Captain: ${barangayData.captainName} (${barangayData.captainPosition})');
          return barangayData;
        }
      }
      
      print('❌ Failed to fetch barangay details');
      return null;
    } on DioException catch (e) {
      print('🌐 DIO ERROR (Barangay Details):');
      print('   Type: ${e.type}');
      print('   Message: ${e.message}');
      print('   Response: ${e.response?.data}');
      print('   Status Code: ${e.response?.statusCode}');
      return null;
    } catch (e) {
      print('💥 UNEXPECTED ERROR (Barangay Details): $e');
      return null;
    }
  }

  /// Fetch and update user's barangay information
  Future<UserData?> updateUserBarangayInfo(UserData userData) async {
    if (userData.targetId == null || userData.targetType != 'barangay') {
      print('⚠️ User is not associated with a barangay or target_id is missing');
      return userData;
    }

    print('🔄 UPDATING USER BARANGAY INFO:');
    print('   Target ID: ${userData.targetId}');
    print('   Target Type: ${userData.targetType}');

    final barangayData = await fetchBarangayDetails(userData.targetId!);
    
    if (barangayData != null) {
      // Create updated user data with barangay information
      final updatedUserData = UserData(
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        location: userData.location,
        targetId: userData.targetId,
        targetType: userData.targetType,
        barangayName: barangayData.barangayName,
        barangayCode: barangayData.barangayCode,
        barangayLogoPath: barangayData.barangayLogoPath,
        certificateBackgroundPath: barangayData.certificateBackgroundPath,
        organizationalChartPath: barangayData.organizationalChartPath,
        barangayContactNumber: barangayData.contactNumber,
        barangayEmail: barangayData.email,
        gisCode: barangayData.gisCode,
        municipalityName: barangayData.municipalityName,
        municipalityLogoPath: barangayData.municipalityLogoPath,
        provinceName: barangayData.province,
        region: barangayData.region,
        captainName: barangayData.captainName,
        captainPosition: barangayData.captainPosition,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      );

      print('✅ USER BARANGAY INFO UPDATED:');
      print('   Barangay Name: ${updatedUserData.barangayName}');
      print('   Municipality: ${updatedUserData.municipalityName}');
      print('   Province: ${updatedUserData.provinceName}');
      print('   Captain: ${updatedUserData.captainName} (${updatedUserData.captainPosition})');

      // Store updated user data
      await _secureStorage.storeUserData(updatedUserData);
      print('💾 Updated user data stored in secure storage');

      return updatedUserData;
    } else {
      print('❌ Failed to fetch barangay details, keeping original user data');
      return userData;
    }
  }

  // Fetch puroks for a specific barangay
  Future<List<PurokData>> fetchPuroks(int barangayId) async {
    try {
      print('🏘️ FETCHING PUROKS:');
      print('   Barangay ID: $barangayId');
      print('   Endpoint: ${ApiConfig.baseUrl}${ApiConfig.getPurokListEndpoint(barangayId)}');

      final response = await _apiService.dio.get(
        ApiConfig.getPurokListEndpoint(barangayId),
      );

      print('📥 PUROKS RESPONSE:');
      print('   Status Code: ${response.statusCode}');
      print('   Response Data: ${response.data}');

      if (response.statusCode == 200) {
        final data = response.data;
        if (data is Map<String, dynamic> && data.containsKey('data')) {
          final puroksList = data['data'] as List;
          final puroks = puroksList
              .map((purokJson) => PurokData.fromJson(purokJson as Map<String, dynamic>))
              .toList();
          
          print('✅ PUROKS PARSED:');
          print('   Total Puroks: ${puroks.length}');
          for (int i = 0; i < puroks.length; i++) {
            final purok = puroks[i];
            print('   ${i + 1}. ${purok.purokName} (ID: ${purok.purokId})');
          }

          return puroks;
        } else {
          print('❌ Invalid response format');
          throw Exception('Invalid response format');
        }
      } else {
        print('❌ Failed to fetch puroks: ${response.statusCode}');
        throw Exception('Failed to fetch puroks: ${response.statusCode}');
      }
    } catch (error) {
      print('❌ Error fetching puroks: $error');
      if (error is DioException) {
        print('   Dio Error Type: ${error.type}');
        print('   Dio Error Message: ${error.message}');
        if (error.response != null) {
          print('   Response Status: ${error.response!.statusCode}');
          print('   Response Data: ${error.response!.data}');
        }
      }
      rethrow;
    }
  }

  // Store puroks in local database
  Future<void> storePuroksLocally(List<PurokData> puroks) async {
    try {
      print('💾 STORING PUROKS LOCALLY:');
      print('   Total Puroks to Store: ${puroks.length}');

      final db = await DatabaseHelper.instance.database;
      
      // CRITICAL: Don't delete existing puroks to prevent CASCADE DELETE
      // Instead, we'll update existing ones and insert new ones
      if (puroks.isNotEmpty) {
        print('   ⚠️ DISABLED: Purok deletion disabled to prevent CASCADE DELETE');
        print('   ℹ️ Will update existing puroks and insert new ones instead');
        
        // Clear cache for this barangay (but don't delete from database)
        _purokCache.remove(puroks.first.barangayId);
        _purokCacheTimestamps.remove(puroks.first.barangayId);
        print('   🗑️ Cleared cache for barangay ${puroks.first.barangayId}');
      }

      // Update existing puroks or insert new ones (fetched from server)
      for (final purok in puroks) {
        try {
          // Check if purok already exists
          final existing = await db.query(
            'puroks',
            where: 'server_id = ? OR id = ?',
            whereArgs: [purok.purokId, purok.purokId],
          );
          
          final purokData = {
            'barangay_id': purok.barangayId,
            'name': purok.purokName,
            'leader': purok.purokLeader,
            'description': purok.description,
            'server_id': purok.purokId,  // ✅ Server ID is the same as ID (fetched from server)
            'sync_status': 'synced',     // ✅ Already on server, mark as synced
            'updated_at': DateTime.now().toIso8601String(),
          };
          
          if (existing.isNotEmpty) {
            // Update existing purok
            await db.update(
              'puroks',
              purokData,
              where: 'id = ?',
              whereArgs: [existing.first['id']],
            );
            print('   Updated: ${purok.purokName} (ID: ${purok.purokId})');
          } else {
            // Insert new purok
            await db.insert('puroks', {
              ...purokData,
              'id': purok.purokId,
              'created_at': DateTime.now().toIso8601String(),
            });
            print('   Inserted: ${purok.purokName} (ID: ${purok.purokId})');
          }
        } catch (e) {
          print('   ⚠️ Error processing purok ${purok.purokName}: $e');
        }
      }

      print('✅ All puroks stored successfully');
    } catch (error) {
      print('❌ Error storing puroks locally: $error');
      rethrow;
    }
  }

  // Store barangay and municipality data in database
  Future<void> storeBarangayAndMunicipalityData(int barangayId) async {
    try {
      print('💾 STORING BARANGAY AND MUNICIPALITY DATA:');
      print('   Barangay ID: $barangayId');

      final db = await DatabaseHelper.instance.database;
      
      // Get barangay details from API
      final barangayData = await fetchBarangayDetails(barangayId);
      if (barangayData == null) {
        throw Exception('Failed to fetch barangay details');
      }

      // Store municipality first (if not exists)
      final municipalityId = barangayData.municipalityId;
      
      // Check if municipality exists
      final existingMunicipality = await db.query(
        'municipalities',
        where: 'id = ?',
        whereArgs: [municipalityId],
      );
      
      if (existingMunicipality.isEmpty) {
        await db.insert('municipalities', {
          'id': municipalityId,
          'name': barangayData.municipalityName,
          'province': barangayData.province,
          'region': barangayData.region,
          'created_at': DateTime.now().toIso8601String(),
          'updated_at': DateTime.now().toIso8601String(),
        });
        print('   ✅ Municipality stored: ${barangayData.municipalityName}');
      } else {
        print('   ✅ Municipality already exists: ${barangayData.municipalityName}');
      }

      // Store barangay (if not exists)
      final existingBarangay = await db.query(
        'barangays',
        where: 'id = ?',
        whereArgs: [barangayId],
      );
      
      if (existingBarangay.isEmpty) {
        await db.insert('barangays', {
          'id': barangayId,
          'municipality_id': municipalityId,
          'name': barangayData.barangayName,
          'created_at': DateTime.now().toIso8601String(),
          'updated_at': DateTime.now().toIso8601String(),
        });
        print('   ✅ Barangay stored: ${barangayData.barangayName}');
      } else {
        print('   ✅ Barangay already exists: ${barangayData.barangayName}');
      }

      print('✅ Barangay and municipality data stored successfully');
    } catch (error) {
      print('❌ Error storing barangay and municipality data: $error');
      rethrow;
    }
  }

  // Fetch and store puroks for a barangay
  Future<List<PurokData>> fetchAndStorePuroks(int barangayId) async {
    try {
      print('🔄 FETCHING AND STORING PUROKS:');
      print('   Barangay ID: $barangayId');

      // Fetch puroks from API
      final puroks = await fetchPuroks(barangayId);

      // Store puroks locally
      if (puroks.isNotEmpty) {
        await storePuroksLocally(puroks);
      }

      return puroks;
    } catch (error) {
      print('❌ Error in fetchAndStorePuroks: $error');
      rethrow;
    }
  }

  // Static cache for purok data to improve performance
  static Map<int, List<Map<String, dynamic>>> _purokCache = {};
  static Map<int, DateTime> _purokCacheTimestamps = {};
  static const Duration _cacheExpiry = Duration(minutes: 5); // Cache for 5 minutes

  // Get stored puroks from local database with caching
  Future<List<Map<String, dynamic>>> getStoredPuroks(int barangayId) async {
    try {
      print('📖 GETTING STORED PUROKS:');
      print('   Barangay ID: $barangayId');

      // Check cache first
      final now = DateTime.now();
      if (_purokCache.containsKey(barangayId) && 
          _purokCacheTimestamps.containsKey(barangayId)) {
        final cacheAge = now.difference(_purokCacheTimestamps[barangayId]!);
        if (cacheAge < _cacheExpiry) {
          print('   ✅ Using cached purok data (age: ${cacheAge.inSeconds}s)');
          return _purokCache[barangayId]!;
        } else {
          print('   ⏰ Cache expired, refreshing...');
        }
      }

      final db = await DatabaseHelper.instance.database;
      final puroks = await db.query(
        'puroks',
        where: 'barangay_id = ?',
        whereArgs: [barangayId],
        orderBy: 'name ASC',
      );

      // Update cache
      _purokCache[barangayId] = puroks;
      _purokCacheTimestamps[barangayId] = now;

      print('   Found ${puroks.length} stored puroks');
      for (final purok in puroks) {
        print('   - ${purok['name']} (ID: ${purok['id']})');
      }

      return puroks;
    } catch (error) {
      print('❌ Error getting stored puroks: $error');
      rethrow;
    }
  }

  // Clear purok cache for a specific barangay
  static void clearPurokCache(int barangayId) {
    _purokCache.remove(barangayId);
    _purokCacheTimestamps.remove(barangayId);
    print('🗑️ Cleared purok cache for barangay $barangayId');
  }

  // Clear all purok cache
  static void clearAllPurokCache() {
    _purokCache.clear();
    _purokCacheTimestamps.clear();
    print('🗑️ Cleared all purok cache');
  }

  // Classification Types Methods

  /// Fetch classification types for a municipality
  Future<List<ClassificationTypeData>> fetchClassificationTypes(int municipalityId) async {
    try {
      print('🔍 FETCHING CLASSIFICATION TYPES:');
      print('   Municipality ID: $municipalityId');

      final response = await _apiService.dio.get(
        ApiConfig.getClassificationTypesEndpoint,
      );

      print('   Response Status: ${response.statusCode}');
      print('   Response Headers: ${response.headers}');
      print('   Response Data: ${response.data}');
      print('   Response Data Type: ${response.data.runtimeType}');
      
      // Enhanced debugging for classification types response
      print('   📊 DETAILED RESPONSE ANALYSIS:');
      if (response.data is Map<String, dynamic>) {
        final responseMap = response.data as Map<String, dynamic>;
        print('   📋 Response Keys: ${responseMap.keys.toList()}');
        print('   📋 Message: ${responseMap['message']}');
        
        if (responseMap['data'] != null) {
          print('   📋 Data Type: ${responseMap['data'].runtimeType}');
          if (responseMap['data'] is List) {
            final dataList = responseMap['data'] as List;
            print('   📋 Data Length: ${dataList.length}');
            for (int i = 0; i < dataList.length; i++) {
              print('   📋 Item $i: ${dataList[i]}');
              if (dataList[i] is Map) {
                final item = dataList[i] as Map<String, dynamic>;
                print('   📋 Item $i Keys: ${item.keys.toList()}');
              }
            }
          } else {
            print('   📋 Data (not a list): ${responseMap['data']}');
          }
        } else {
          print('   📋 Data is null');
        }
      } else {
        print('   📋 Response is not a Map: ${response.data}');
      }

      if (response.statusCode == 200) {
        if (response.data is Map<String, dynamic> && response.data['data'] != null) {
          final List<dynamic> classificationTypesJson = response.data['data'];
          
          print('✅ CLASSIFICATION TYPES RAW DATA:');
          print('   Total Items: ${classificationTypesJson.length}');
          for (int i = 0; i < classificationTypesJson.length; i++) {
            final item = classificationTypesJson[i];
            print('   ${i + 1}. ${item['name']} (ID: ${item['id']})');
          }

          final classificationTypes = classificationTypesJson
              .map((json) => ClassificationTypeData.fromJson(json))
              .toList();
          
          print('✅ CLASSIFICATION TYPES PARSED:');
          print('   Total Classification Types: ${classificationTypes.length}');
          for (int i = 0; i < classificationTypes.length; i++) {
            final classificationType = classificationTypes[i];
            print('   ${i + 1}. ${classificationType.name} (ID: ${classificationType.id})');
          }

          return classificationTypes;
        } else {
          print('❌ Invalid response format');
          throw Exception('Invalid response format');
        }
      } else {
        print('❌ Failed to fetch classification types: ${response.statusCode}');
        throw Exception('Failed to fetch classification types: ${response.statusCode}');
      }
    } catch (error) {
      print('❌ Error fetching classification types: $error');
      if (error is DioException) {
        print('   Dio Error Type: ${error.type}');
        print('   Dio Error Message: ${error.message}');
        if (error.response != null) {
          print('   Response Status: ${error.response!.statusCode}');
          print('   Response Data: ${error.response!.data}');
        }
      }
      rethrow;
    }
  }

  /// Store classification types in local database
  Future<void> storeClassificationTypesLocally(List<ClassificationTypeData> classificationTypes) async {
    try {
      print('💾 STORING CLASSIFICATION TYPES LOCALLY:');
      print('   Total Classification Types: ${classificationTypes.length}');

      final dbHelper = DatabaseHelper.instance;
      
      // Convert to local format
      final classificationTypesData = classificationTypes
          .map((ct) => ct.toLocalJson())
          .toList();

      print('   📋 Converted data for storage:');
      for (int i = 0; i < classificationTypesData.length; i++) {
        print('   ${i + 1}. ${classificationTypesData[i]}');
      }

      // Store in database
      await dbHelper.insertClassificationTypes(classificationTypesData);

      print('✅ Classification types stored successfully');
    } catch (error) {
      print('❌ Error storing classification types locally: $error');
      print('❌ Error details: ${error.toString()}');
      rethrow;
    }
  }

  /// Fetch and store classification types for a municipality
  Future<List<ClassificationTypeData>> fetchAndStoreClassificationTypes(int municipalityId) async {
    try {
      print('🔄 FETCHING AND STORING CLASSIFICATION TYPES:');
      print('   Municipality ID: $municipalityId');

      // Fetch from API
      final classificationTypes = await fetchClassificationTypes(municipalityId);

      if (classificationTypes.isNotEmpty) {
        // Clear existing classification types for this municipality
        final dbHelper = DatabaseHelper.instance;
        await dbHelper.clearClassificationTypesByMunicipality(municipalityId);
        
        // Store new classification types
        await storeClassificationTypesLocally(classificationTypes);
        
        print('✅ Classification types fetched and stored successfully');
      } else {
        print('ℹ️ No classification types found for municipality');
      }

      return classificationTypes;
    } catch (error) {
      print('❌ Error fetching and storing classification types: $error');
      rethrow;
    }
  }

  /// Get stored classification types from local database
  Future<List<Map<String, dynamic>>> getStoredClassificationTypes(int municipalityId) async {
    try {
      print('📖 GETTING STORED CLASSIFICATION TYPES:');
      print('   Municipality ID: $municipalityId');

      final dbHelper = DatabaseHelper.instance;
      final classificationTypes = await dbHelper.getClassificationTypesByMunicipality(municipalityId);

      print('   Found ${classificationTypes.length} stored classification types');
      for (final classificationType in classificationTypes) {
        print('   - ${classificationType['name']} (ID: ${classificationType['id']})');
      }

      return classificationTypes;
    } catch (error) {
      print('❌ Error getting stored classification types: $error');
      rethrow;
    }
  }

  /// Test method to check what's in the database (for debugging)
  Future<void> testDatabaseContents() async {
    try {
      print('🗄️ CHECKING DATABASE CONTENTS...');
      
      final dbHelper = DatabaseHelper.instance;
      
      // Check if classification_types table exists
      try {
        final db = await dbHelper.database;
        final result = await db.rawQuery('SELECT COUNT(*) as count FROM classification_types');
        print('✅ classification_types table exists');
        print('   Total classification types in database: ${result[0]['count']}');
        
        // Get all classification types
        final allTypes = await dbHelper.getAllClassificationTypes();
        print('   All classification types:');
        for (final type in allTypes) {
          print('     - ${type['name']} (ID: ${type['id']}, Municipality: ${type['municipality_id']})');
        }
      } catch (e) {
        print('❌ classification_types table does not exist: $e');
      }
      
      // Check puroks table
      try {
        final db = await dbHelper.database;
        final result = await db.rawQuery('SELECT COUNT(*) as count FROM puroks');
        print('✅ puroks table exists');
        print('   Total puroks in database: ${result[0]['count']}');
      } catch (e) {
        print('❌ puroks table does not exist: $e');
      }
      
    } catch (error) {
      print('❌ Error checking database contents: $error');
    }
  }

  /// Test method to directly call classification types API (for debugging)
  Future<void> testClassificationTypesAPI() async {
    try {
      print('🧪 TESTING CLASSIFICATION TYPES API DIRECTLY...');
      
      final response = await _apiService.dio.get(
        ApiConfig.getClassificationTypesEndpoint,
      );

      print('🧪 TEST RESPONSE:');
      print('   Status Code: ${response.statusCode}');
      print('   Full Response: ${response.data}');
      
      if (response.statusCode == 200) {
        print('✅ API call successful!');
        
        if (response.data is Map<String, dynamic>) {
          final responseMap = response.data as Map<String, dynamic>;
          print('✅ Response structure is correct (Map)');
          print('   Message: ${responseMap['message']}');
          print('   Data exists: ${responseMap['data'] != null}');
          
          if (responseMap['data'] is List) {
            final dataList = responseMap['data'] as List;
            print('✅ Data is a List with ${dataList.length} items');
            
            for (int i = 0; i < dataList.length; i++) {
              print('   Item $i: ${dataList[i]}');
            }
          } else {
            print('❌ Data is not a List: ${responseMap['data']}');
          }
        } else {
          print('❌ Response is not a Map: ${response.data}');
        }
      } else {
        print('❌ API call failed with status: ${response.statusCode}');
        print('   Response: ${response.data}');
      }
    } catch (error) {
      print('❌ Error testing classification types API: $error');
      if (error is DioException) {
        print('   Dio Error Type: ${error.type}');
        print('   Dio Error Message: ${error.message}');
        if (error.response != null) {
          print('   Response Status: ${error.response!.statusCode}');
          print('   Response Data: ${error.response!.data}');
        }
      }
    }
  }
}
