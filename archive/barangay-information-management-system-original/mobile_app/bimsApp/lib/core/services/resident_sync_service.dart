import 'dart:io';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import 'api_service.dart';
import 'resident_image_upload_service.dart';
import '../../data/models/resident.dart';
import '../../data/models/classification.dart';

class ResidentSyncService {
  static final ResidentSyncService _instance = ResidentSyncService._internal();
  factory ResidentSyncService() => _instance;
  ResidentSyncService._internal();

  final ApiService _apiService = ApiService();
  final ResidentImageUploadService _imageUploadService = ResidentImageUploadService();

  /// Sync a single resident to the server
  /// Returns the server resident ID if successful, null if failed
  Future<String?> syncResident(Resident resident) async {
    const int maxRetries = 3;
    const int retryDelay = 2000; // 2 seconds
    
    try {
      // API service should already be initialized with custom IP from login
      // Only initialize if not already done and not using custom IP
      if (!_apiService.dio.options.baseUrl.isNotEmpty) {
        print('⚠️ API service not initialized, initializing with default config');
        await _apiService.initialize();
      } else {
        print('🌐 RESIDENT SYNC - Using existing API service with base URL: ${_apiService.dio.options.baseUrl}');
        print('🌐 RESIDENT SYNC - Using custom IP: ${_apiService.isUsingCustomIp}');
      }

      // Upload resident image first (outside of retry logic to avoid multiple uploads)
      String? serverImageFilename;
      if (resident.picturePath != null && resident.picturePath!.isNotEmpty) {
        print('📤 Uploading resident image first...');
        final pictureFile = File(resident.picturePath!);
        if (await pictureFile.exists()) {
          serverImageFilename = await _imageUploadService.uploadResidentImage(pictureFile);
          if (serverImageFilename != null) {
            print('✅ Resident image uploaded successfully: $serverImageFilename');
          } else {
            print('⚠️ Failed to upload resident image, proceeding without image');
          }
        } else {
          print('⚠️ Resident image file does not exist: ${resident.picturePath}');
        }
      }

      // Use the resident's offline ID (mobile-generated UUID/ID)
      // Server will use this to check if resident already exists
      print('🆔 Using resident offline ID: ${resident.id}');

      // Prepare JSON payload (much faster than FormData)
      final payload = {
        'id': resident.id, // Use the mobile's offline ID, not a temp ID
        'barangayId': resident.barangayId,
        'lastName': resident.lastName,
        'firstName': resident.firstName,
        if (resident.middleName != null) 'middleName': resident.middleName,
        if (resident.suffix != null) 'suffix': resident.suffix,
        'sex': resident.sex,
        'civilStatus': resident.civilStatus,
        'birthdate': resident.birthdate,
        if (resident.birthplace != null) 'birthplace': resident.birthplace,
        if (resident.contactNumber != null) 'contactNumber': resident.contactNumber,
        if (resident.email != null) 'email': resident.email,
        if (resident.occupation != null) 'occupation': resident.occupation,
        if (resident.monthlyIncome != null) 'monthlyIncome': resident.monthlyIncome,
        if (resident.employmentStatus != null) 'employmentStatus': resident.employmentStatus,
        if (resident.educationAttainment != null) 'educationAttainment': resident.educationAttainment,
        'residentStatus': resident.residentStatus,
        'indigentPerson': resident.indigenousPerson ? 1 : 0, // Backend expects indigentPerson (typo in backend)
        // Add server image filename if available
        if (serverImageFilename != null) 'picturePath': serverImageFilename,
      };

      // Debug logging
      print('🔄 Syncing resident: ${resident.fullName}');
      print('📤 Sending JSON payload with ${payload.length} fields');
      print('📤 Server image filename: ${serverImageFilename ?? 'None'}');

      // Retry logic only for the sync request (not image upload)
      for (int attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Make the API request to sync resident (JSON payload - much faster)
          final response = await _apiService.dio.post(
            ApiConfig.syncResidentEndpoint,
            data: payload,
            options: Options(
              headers: ApiConfig.defaultHeaders, // Use JSON headers
              sendTimeout: const Duration(seconds: 15), // Much faster without FormData
              receiveTimeout: const Duration(seconds: 15),
            ),
          );

          if (response.statusCode == 200 || response.statusCode == 201) {
            final responseData = response.data;
            
            // Extract server resident ID from response
            // The server returns: {"message": "...", "data": {"resident": {"id": "PREFIX-2024-0000001", ...}, "action": "created"}}
            if (responseData is Map<String, dynamic>) {
              final data = responseData['data'];
              if (data is Map<String, dynamic>) {
                final resident = data['resident'];
                if (resident is Map<String, dynamic>) {
                  final serverId = resident['id']?.toString();
                  final action = data['action']?.toString();
                  if (serverId != null) {
                    if (action == 'created') {
                      print('✅ Successfully created resident with server-generated ID: $serverId');
                    } else if (action == 'updated') {
                      print('✅ Successfully updated existing resident with ID: $serverId');
                    } else {
                      print('✅ Successfully synced resident with ID: $serverId');
                    }
                    return serverId;
                  }
                }
              }
            }
            
            print('⚠️ Unexpected response format: $responseData');
            return null;
          } else {
            print('❌ Sync failed with status: ${response.statusCode}');
            print('Response: ${response.data}');
            
            // Don't retry for client errors (4xx)
            if (response.statusCode != null && response.statusCode! >= 400 && response.statusCode! < 500) {
              return null;
            }
            
            // Retry for server errors (5xx) or network issues
            if (attempt < maxRetries) {
              print('⏳ Retrying sync in ${retryDelay}ms... (attempt ${attempt + 1}/$maxRetries)');
              await Future.delayed(Duration(milliseconds: retryDelay * attempt));
            }
          }
        } catch (e) {
          print('❌ Error syncing resident ${resident.fullName} (attempt $attempt/$maxRetries): $e');
          
          if (e is DioException) {
            print('Dio error details: ${e.response?.data}');
            print('Status code: ${e.response?.statusCode}');
            print('Error type: ${e.type}');
            
            // Handle specific error types
            switch (e.type) {
              case DioExceptionType.receiveTimeout:
                print('⏰ Receive timeout - server took too long to respond');
                break;
              case DioExceptionType.sendTimeout:
                print('⏰ Send timeout - request took too long');
                break;
              case DioExceptionType.connectionTimeout:
                print('⏰ Connection timeout - could not connect to server');
                break;
              case DioExceptionType.badResponse:
                print('❌ Bad response from server: ${e.response?.statusCode}');
                // Don't retry for client errors (4xx)
                if (e.response?.statusCode != null && 
                    e.response!.statusCode! >= 400 && 
                    e.response!.statusCode! < 500) {
                  return null;
                }
                break;
              case DioExceptionType.cancel:
                print('❌ Request was cancelled');
                break;
              case DioExceptionType.connectionError:
                print('❌ Connection error - check network connectivity');
                break;
              default:
                print('❌ Unknown Dio error: ${e.type}');
            }
          }
          
          // Retry for network errors, timeouts, or server errors
          if (attempt < maxRetries) {
            // Progressive delay: 2s, 4s, 8s for better retry strategy
            final delayMs = retryDelay * attempt;
            print('⏳ Retrying sync in ${delayMs}ms...');
            await Future.delayed(Duration(milliseconds: delayMs));
          } else {
            print('❌ Max retries reached for resident ${resident.fullName}');
            return null;
          }
        }
      }
    } catch (e) {
      print('❌ Error preparing resident data: $e');
    }
    
    return null;
  }


  /// Sync multiple residents in batch
  /// Returns a map of local_id -> server_resident_id for successful syncs
  Future<Map<String, String>> syncResidents(List<Resident> residents) async {
    final Map<String, String> syncResults = {};
    
    for (final resident in residents) {
      if (resident.localId != null) {
        final serverId = await syncResident(resident);
        if (serverId != null) {
          syncResults[resident.localId.toString()] = serverId;
        }
      }
    }
    
    return syncResults;
  }

  /// Sync a single classification to the server
  /// Returns true if successful, false if failed
  Future<bool> syncClassification(Classification classification, String serverResidentId) async {
    const int maxRetries = 2; // Fewer retries for classifications
    const int retryDelay = 1000; // 1 second delay
    
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // API service should already be initialized with custom IP from login
        // Only initialize if not already done and not using custom IP
        if (!_apiService.dio.options.baseUrl.isNotEmpty) {
          print('⚠️ API service not initialized, initializing with default config');
          await _apiService.initialize();
        } else {
          print('🌐 RESIDENT SYNC - Using existing API service with base URL: ${_apiService.dio.options.baseUrl}');
          print('🌐 RESIDENT SYNC - Using custom IP: ${_apiService.isUsingCustomIp}');
        }

        // Prepare the payload for the API
        final payload = classification.toApiJson(serverResidentId);

        // Debug logging
        print('🔄 Syncing classification: ${classification.classificationType} for resident: $serverResidentId (attempt $attempt/$maxRetries)');

        // Make the API request with timeout
        final response = await _apiService.dio.post(
          ApiConfig.syncResidentClassificationEndpoint,
          data: payload,
          options: Options(
            headers: ApiConfig.defaultHeaders,
            sendTimeout: const Duration(seconds: 15), // 15 second timeout for sending
            receiveTimeout: const Duration(seconds: 15), // 15 second timeout for receiving
          ),
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          print('✅ Successfully synced classification: ${classification.classificationType}');
          return true;
        } else {
          print('❌ Classification sync failed with status: ${response.statusCode}');
          print('Response: ${response.data}');
          
          // Don't retry for client errors (4xx)
          if (response.statusCode != null && response.statusCode! >= 400 && response.statusCode! < 500) {
            return false;
          }
          
          // Retry for server errors (5xx)
          if (attempt < maxRetries) {
            print('⏳ Retrying classification sync in ${retryDelay}ms...');
            await Future.delayed(Duration(milliseconds: retryDelay * attempt));
            continue;
          }
          return false;
        }
      } catch (e) {
        print('❌ Error syncing classification ${classification.classificationType} (attempt $attempt/$maxRetries): $e');
        
        if (e is DioException) {
          print('Dio error details: ${e.response?.data}');
          print('Status code: ${e.response?.statusCode}');
          print('Error type: ${e.type}');
          
          // Don't retry for certain error types
          if (e.type == DioExceptionType.badResponse && 
              e.response?.statusCode != null && 
              e.response!.statusCode! >= 400 && 
              e.response!.statusCode! < 500) {
            return false;
          }
        }
        
        // Retry for network errors or server errors
        if (attempt < maxRetries) {
          print('⏳ Retrying classification sync in ${retryDelay}ms...');
          await Future.delayed(Duration(milliseconds: retryDelay * attempt));
        } else {
          return false;
        }
      }
    }
    
    return false;
  }

  /// Sync multiple classifications for a resident
  /// Returns the number of successful syncs
  Future<int> syncClassifications(List<Classification> classifications, String serverResidentId) async {
    int successCount = 0;
    
    for (final classification in classifications) {
      final success = await syncClassification(classification, serverResidentId);
      if (success) {
        successCount++;
      }
    }
    
    return successCount;
  }

  /// Check if the API service is properly configured
  Future<bool> isApiConfigured() async {
    try {
      await _apiService.initialize();
      return _apiService.dio.options.baseUrl.isNotEmpty;
    } catch (e) {
      print('❌ API service not configured: $e');
      return false;
    }
  }
}
