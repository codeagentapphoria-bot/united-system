import 'dart:io';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class ResidentImageUploadService {
  static final ResidentImageUploadService _instance = ResidentImageUploadService._internal();
  factory ResidentImageUploadService() => _instance;
  ResidentImageUploadService._internal();

  final ApiService _apiService = ApiService();

  /// Upload a single resident image to the server
  /// Returns the server filename if successful, null if failed
  Future<String?> uploadResidentImage(File imageFile) async {
    const int maxRetries = 3;
    const int retryDelay = 2000; // 2 seconds
    
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure API service is initialized
        if (!_apiService.dio.options.baseUrl.isNotEmpty) {
          print('⚠️ API service not initialized, initializing with default config');
          await _apiService.initialize();
        } else {
          print('🌐 RESIDENT IMAGE UPLOAD - Using existing API service with base URL: ${_apiService.dio.options.baseUrl}');
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
        print('📤 Uploading resident image: ${imageFile.path} (attempt $attempt/$maxRetries)');
        print('📁 File size: ${await imageFile.length()} bytes');

        // Make the API request with timeout
        final response = await _apiService.dio.post(
          ApiConfig.uploadResidentImageEndpoint,
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
              // Try to get full path first (includes folder structure)
              final path = data['path']?.toString();
              if (path != null) {
                print('✅ Successfully uploaded resident image with server path: $path');
                return path;
              }
              
              // Fallback: try to get filename and construct path
              final filename = data['filename']?.toString();
              if (filename != null) {
                final fullPath = 'uploads/residents/$filename';
                print('✅ Successfully uploaded resident image with constructed path: $fullPath');
                return fullPath;
              }
              
              // Fallback: try to get from file object
              final file = data['file'];
              if (file is Map<String, dynamic>) {
                final filenameFromFile = file['filename']?.toString();
                if (filenameFromFile != null) {
                  final fullPath = 'uploads/residents/$filenameFromFile';
                  print('✅ Successfully uploaded resident image with constructed path: $fullPath');
                  return fullPath;
                }
              }
            }
          }
          
          print('⚠️ Unexpected response format: $responseData');
          return null;
        } else {
          print('❌ Resident image upload failed with status: ${response.statusCode}');
          print('❌ Response: ${response.data}');
          
          if (attempt < maxRetries) {
            print('⏳ Retrying in ${retryDelay}ms... (attempt ${attempt + 1}/$maxRetries)');
            await Future.delayed(const Duration(milliseconds: retryDelay));
          }
        }
      } catch (e) {
        print('❌ Error uploading resident image (attempt $attempt/$maxRetries): $e');
        
        if (attempt < maxRetries) {
          print('⏳ Retrying in ${retryDelay}ms...');
          await Future.delayed(const Duration(milliseconds: retryDelay));
        }
      }
    }
    
    return null;
  }

  /// Upload multiple resident images and return their server filenames
  /// Returns a map of local_path -> server_filename for successful uploads
  Future<Map<String, String>> uploadResidentImages(List<File> imageFiles) async {
    final Map<String, String> uploadResults = {};
    
    for (final imageFile in imageFiles) {
      if (await imageFile.exists()) {
        final serverFilename = await uploadResidentImage(imageFile);
        if (serverFilename != null) {
          uploadResults[imageFile.path] = serverFilename;
        }
      } else {
        print('⚠️ Resident image file does not exist: ${imageFile.path}');
      }
    }
    
    return uploadResults;
  }

  /// Upload images from file paths
  /// Returns a map of local_path -> server_filename for successful uploads
  Future<Map<String, String>> uploadResidentImagesFromPaths(List<String> imagePaths) async {
    final List<File> imageFiles = imagePaths
        .map((path) => File(path))
        .where((file) => file.existsSync())
        .toList();
    
    return await uploadResidentImages(imageFiles);
  }
}
