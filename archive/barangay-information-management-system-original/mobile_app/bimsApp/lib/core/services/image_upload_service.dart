import 'dart:io';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class ImageUploadService {
  static final ImageUploadService _instance = ImageUploadService._internal();
  factory ImageUploadService() => _instance;
  ImageUploadService._internal();

  final ApiService _apiService = ApiService();

  /// Upload a single image file to the server
  /// Returns the server filename if successful, null if failed
  Future<String?> uploadImage(File imageFile, {String? entityType = 'household'}) async {
    const int maxRetries = 3;
    const int retryDelay = 2000; // 2 seconds
    
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure API service is initialized
        if (!_apiService.dio.options.baseUrl.isNotEmpty) {
          print('⚠️ API service not initialized, initializing with default config');
          await _apiService.initialize();
        } else {
          print('🌐 IMAGE UPLOAD - Using existing API service with base URL: ${_apiService.dio.options.baseUrl}');
        }

        // Check if file exists
        if (!await imageFile.exists()) {
          print('❌ Image file does not exist: ${imageFile.path}');
          return null;
        }

        // Prepare form data
        final formData = FormData.fromMap({
          'household_image_path': await MultipartFile.fromFile(
            imageFile.path,
            filename: imageFile.path.split('/').last,
          ),
        });

        // Debug logging
        print('📤 Uploading image: ${imageFile.path} (attempt $attempt/$maxRetries)');
        print('📁 File size: ${await imageFile.length()} bytes');

        // Make the API request with timeout
        final response = await _apiService.dio.post(
          ApiConfig.uploadHouseholdImageEndpoint,
          data: formData,
          options: Options(
            headers: {
              ...ApiConfig.defaultHeaders,
              'Content-Type': 'multipart/form-data',
            },
            sendTimeout: const Duration(seconds: 60), // 60 second timeout for file upload
            receiveTimeout: const Duration(seconds: 30), // 30 second timeout for receiving
          ),
        );

        if (response.statusCode == 200 || response.statusCode == 201) {
          final responseData = response.data;
          
          // Extract server filename from response
          if (responseData is Map<String, dynamic>) {
            final data = responseData['data'];
            if (data is Map<String, dynamic>) {
              // Try to get filename from the new format first
              final filename = data['filename']?.toString();
              if (filename != null) {
                print('✅ Successfully uploaded image with server filename: $filename');
                return filename;
              }
              
              // Fallback: try to get from files array
              final files = data['files'];
              if (files is List && files.isNotEmpty) {
                final firstFile = files[0];
                if (firstFile is Map<String, dynamic>) {
                  final filenameFromArray = firstFile['filename']?.toString();
                  if (filenameFromArray != null) {
                    print('✅ Successfully uploaded image with server filename: $filenameFromArray');
                    return filenameFromArray;
                  }
                }
              }
            }
          }
          
          print('⚠️ Unexpected response format: $responseData');
          return null;
        } else {
          print('❌ Image upload failed with status: ${response.statusCode}');
          print('❌ Response: ${response.data}');
          
          if (attempt < maxRetries) {
            print('⏳ Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/$maxRetries)');
            await Future.delayed(const Duration(milliseconds: retryDelay));
          }
        }
      } catch (e) {
        print('❌ Error uploading image (attempt $attempt/$maxRetries): $e');
        
        if (attempt < maxRetries) {
          print('⏳ Retrying in ${retryDelay}ms...');
          await Future.delayed(const Duration(milliseconds: retryDelay));
        }
      }
    }
    
    return null;
  }

  /// Upload multiple images and return their server filenames
  /// Returns a map of local_path -> server_filename for successful uploads
  Future<Map<String, String>> uploadImages(List<File> imageFiles, {String? entityType = 'household'}) async {
    final Map<String, String> uploadResults = {};
    
    for (final imageFile in imageFiles) {
      if (await imageFile.exists()) {
        final serverFilename = await uploadImage(imageFile, entityType: entityType);
        if (serverFilename != null) {
          uploadResults[imageFile.path] = serverFilename;
        }
      } else {
        print('⚠️ Image file does not exist: ${imageFile.path}');
      }
    }
    
    return uploadResults;
  }

  /// Upload images from file paths
  /// Returns a map of local_path -> server_filename for successful uploads
  Future<Map<String, String>> uploadImagesFromPaths(List<String> imagePaths, {String? entityType = 'household'}) async {
    final List<File> imageFiles = imagePaths
        .map((path) => File(path))
        .where((file) => file.existsSync())
        .toList();
    
    return await uploadImages(imageFiles, entityType: entityType);
  }
}
