import 'dart:io';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import 'api_service.dart';
import '../../data/models/pet.dart';
import '../../core/services/database_service.dart';

class PetsSyncService {
  static final PetsSyncService _instance = PetsSyncService._internal();
  factory PetsSyncService() => _instance;
  PetsSyncService._internal();

  final ApiService _apiService = ApiService();
  final DatabaseService _databaseService = DatabaseService();

  /// Sync a single pet to the server
  /// Returns the server pet ID if successful, null if failed
  Future<String?> syncPet(Pet pet) async {
    const int maxRetries = 3;
    const int retryDelay = 2000; // 2 seconds
    
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // API service should already be initialized with custom IP from login
        // Only initialize if not already done and not using custom IP
        if (!_apiService.dio.options.baseUrl.isNotEmpty) {
          print('⚠️ API service not initialized, initializing with default config');
          await _apiService.initialize();
        } else {
          print('🌐 PETS SYNC - Using existing API service with base URL: ${_apiService.dio.options.baseUrl}');
          print('🌐 PETS SYNC - Using custom IP: ${_apiService.isUsingCustomIp}');
        }

        // Ensure database service is initialized
        if (!_databaseService.isInitialized) {
          await _databaseService.initialize();
        }

        // Get server_resident_id for the pet owner
        final ownerServerId = await _getServerResidentId(pet.ownerId);
        if (ownerServerId == null) {
          throw Exception('Could not find server_resident_id for pet owner: ${pet.ownerId}');
        }

        // Prepare FormData with pet info AND image file (like website does)
        final formData = FormData();
        
        // Add pet data fields
        formData.fields.addAll([
          MapEntry('ownerId', ownerServerId),
          MapEntry('petName', pet.petName),
          MapEntry('species', pet.species),
          MapEntry('breed', pet.breed),
          MapEntry('sex', pet.sex),
          MapEntry('color', pet.color),
          MapEntry('birthdate', _calculateBirthdate(pet.age) ?? ''),
          if (pet.description != null) MapEntry('description', pet.description!),
        ]);

        // Add image file if available
        if (pet.picturePath != null && pet.picturePath!.isNotEmpty) {
          final pictureFile = File(pet.picturePath!);
          if (await pictureFile.exists()) {
            print('📤 Including pet image in sync request: ${pet.picturePath}');
            print('📁 File size: ${await pictureFile.length()} bytes');
            formData.files.add(
              MapEntry(
                'picturePath',
                await MultipartFile.fromFile(
                  pictureFile.path,
                  filename: pictureFile.path.split('/').last,
                ),
              ),
            );
          } else {
            print('⚠️ Pet image file does not exist: ${pet.picturePath}');
          }
        }

        // Debug logging
        print('🔄 Syncing pet: ${pet.petName} (attempt $attempt/$maxRetries)');
        print('📤 Sending pet data with image in FormData');

        // Send pet to server with image in single request
        final response = await _apiService.dio.post(
          ApiConfig.createPetEndpoint,
          data: formData,
          options: Options(
            headers: {
              ...ApiConfig.defaultHeaders,
              'Content-Type': 'multipart/form-data',
            },
            sendTimeout: const Duration(seconds: 60), // Longer for file upload
            receiveTimeout: const Duration(seconds: 30),
          ),
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          final responseData = response.data;
          
          // Extract server pet ID from response
          String? serverPetId;
          if (responseData is Map<String, dynamic>) {
            final data = responseData['data'];
            if (data is Map<String, dynamic>) {
              // Server returns pet ID directly in data.id, not data.pet.id
              serverPetId = data['id']?.toString();
            }
          }
          
          if (serverPetId != null) {
            print('✅ Successfully synced pet with server ID: $serverPetId');
            
            // Step 3: Sync vaccination records if pet is vaccinated
            if (pet.isVaccinated && pet.vaccinationDate != null) {
              await _syncVaccinationRecord(serverPetId, pet);
            }
            
            return serverPetId;
          } else {
            print('⚠️ Unexpected response format: $responseData');
            return null;
          }
        } else {
          print('❌ API request failed with status: ${response.statusCode}');
          print('❌ Response: ${response.data}');
          
          if (attempt < maxRetries) {
            print('⏳ Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/$maxRetries)');
            await Future.delayed(const Duration(milliseconds: retryDelay));
          }
        }
      } catch (e) {
        print('❌ Error syncing pet (attempt $attempt/$maxRetries): $e');
        
        if (attempt < maxRetries) {
          print('⏳ Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/$maxRetries)');
          await Future.delayed(const Duration(milliseconds: retryDelay));
        }
      }
    }
    
    print('❌ Failed to sync pet after $maxRetries attempts');
    return null;
  }

  /// Check if API service is configured
  Future<bool> isApiConfigured() async {
    try {
      await _apiService.initialize();
      return _apiService.dio.options.baseUrl.isNotEmpty;
    } catch (e) {
      print('❌ API service not configured: $e');
      return false;
    }
  }


  /// Get server_resident_id for a local resident ID
  Future<String?> _getServerResidentId(String localResidentId) async {
    try {
      final resident = await _databaseService.residentRepository.getById(localResidentId);
      if (resident != null && resident.serverResidentId != null) {
        return resident.serverResidentId.toString();
      }
      return null;
    } catch (e) {
      print('❌ Error getting server_resident_id for resident $localResidentId: $e');
      return null;
    }
  }

  /// Calculate birthdate from age
  String? _calculateBirthdate(int? age) {
    if (age == null) return null;
    
    final now = DateTime.now();
    final birthYear = now.year - age;
    // Use January 1st as default birthdate
    return '$birthYear-01-01';
  }

  /// Sync vaccination record for a pet
  Future<void> _syncVaccinationRecord(String serverPetId, Pet pet) async {
    try {
      print('💉 Syncing vaccination record for pet: ${pet.petName}');
      print('💉 Using server pet ID: $serverPetId');
      print('💉 Vaccination date: ${pet.vaccinationDate}');
      
      // Prepare vaccination data
      final vaccineData = {
        'target_type': 'pet',
        'target_id': serverPetId,
        'vaccine_name': 'General Vaccination', // Default vaccine name
        'vaccine_type': 'Annual', // Default vaccine type
        'vaccine_description': 'Pet vaccination record',
        'vaccination_date': pet.vaccinationDate,
      };

      print('💉 Sending vaccine data: $vaccineData');

      // Send vaccination record to server
      final response = await _apiService.dio.post(
        ApiConfig.createVaccineEndpoint,
        data: vaccineData,
        options: Options(
          headers: ApiConfig.defaultHeaders,
          sendTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        ),
      );

      print('💉 Vaccine API response status: ${response.statusCode}');
      print('💉 Vaccine API response data: ${response.data}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('✅ Successfully synced vaccination record for pet: ${pet.petName}');
      } else {
        print('❌ Failed to sync vaccination record. Status: ${response.statusCode}');
        print('❌ Response: ${response.data}');
      }
    } catch (e) {
      print('❌ Error syncing vaccination record for pet ${pet.petName}: $e');
    }
  }
}
