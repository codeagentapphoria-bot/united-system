import 'dart:io';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class PetImageUploadService {
  static final PetImageUploadService _instance = PetImageUploadService._internal();
  factory PetImageUploadService() => _instance;
  PetImageUploadService._internal();

  final ApiService _apiService = ApiService();

  /// Upload a single pet image to the server
  /// Returns the server filename if successful, null if failed
  Future<String?> uploadPetImage(File imageFile) async {
    const int maxRetries = 3;
    const int retryDelay = 2000; // 2 seconds
    
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure API service is initialized
        if (!_apiService.dio.options.baseUrl.isNotEmpty) {
          print('⚠️ API service not initialized, initializing with default config');
          await _apiService.initialize();
        } else {
          print('🌐 PET IMAGE UPLOAD - Using existing API service with base URL: ${_apiService.dio.options.baseUrl}');
        }

        // Check if file exists
        if (!await imageFile.exists()) {
          print('❌ Image file does not exist: ${imageFile.path}');
          return null;
        }

        // Prepare form data
        final formData = FormData.fromMap({
          'picturePath': await MultipartFile.fromFile(
            imageFile.path,
            filename: imageFile.path.split('/').last,
          ),
        });

        // Debug logging
        print('📤 Uploading pet image: ${imageFile.path} (attempt $attempt/$maxRetries)');
        print('📁 File size: ${await imageFile.length()} bytes');

        // Make the API request with timeout
        final response = await _apiService.dio.post(
          ApiConfig.uploadPetImageEndpoint,
          data: formData,
          options: Options(
            headers: {
              ...ApiConfig.defaultHeaders,
              'Content-Type': 'multipart/form-data', // ✅ Required for file uploads
            },
            sendTimeout: const Duration(seconds: 60), // Longer timeout for file uploads
            receiveTimeout: const Duration(seconds: 30),
          ),
        );

        print('📤 Pet image upload response status: ${response.statusCode}');
        print('📤 Pet image upload response data: ${response.data}');
        print('📤 Pet image upload response headers: ${response.headers}');

        if (response.statusCode == 200 || response.statusCode == 201) {
          final responseData = response.data;
          
          // Extract server filename from response
          String? serverFilename;
          if (responseData is Map<String, dynamic>) {
            final data = responseData['data'];
            if (data is Map<String, dynamic>) {
              // Server returns relativePath (e.g., 'uploads/pets/image.jpg') for database storage
              serverFilename = data['relativePath'] ?? 
                              data['path'] ?? 
                              data['filename'];
              
              if (serverFilename != null) {
                print('✅ Pet image uploaded successfully: $serverFilename');
                return serverFilename;
              }
            }
          }
          
          print('⚠️ Unexpected response format: $responseData');
          return null;
        } else {
          print('❌ Pet image upload failed with status: ${response.statusCode}');
          print('❌ Response: ${response.data}');
          
          if (attempt < maxRetries) {
            print('⏳ Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/$maxRetries)');
            await Future.delayed(const Duration(milliseconds: retryDelay));
          }
        }
      } catch (e) {
        print('❌ Error uploading pet image (attempt $attempt/$maxRetries): $e');
        
        if (attempt < maxRetries) {
          print('⏳ Retrying in ${retryDelay}ms...');
          await Future.delayed(const Duration(milliseconds: retryDelay));
        }
      }
    }
    
    return null;
  }
}
