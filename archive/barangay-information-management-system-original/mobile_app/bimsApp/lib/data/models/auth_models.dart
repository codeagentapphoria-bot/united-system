import 'dart:convert';
import 'package:dio/dio.dart';

// Login Request Model
class LoginRequest {
  final String email;
  final String password;

  LoginRequest({
    required this.email,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email,
      'password': password,
    };
  }

  factory LoginRequest.fromJson(Map<String, dynamic> json) {
    return LoginRequest(
      email: json['email'] ?? '',
      password: json['password'] ?? '',
    );
  }
}

// Login Response Model
class LoginResponse {
  final bool success;
  final String message;
  final String? accessToken;
  final String? refreshToken;
  final UserData? user;

  LoginResponse({
    required this.success,
    required this.message,
    this.accessToken,
    this.refreshToken,
    this.user,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    // Handle different server response formats
    bool success = false;
    String message = '';
    String? accessToken;
    String? refreshToken;
    UserData? user;

    // Check for different response formats
    if (json.containsKey('status') && json['status'] == 'success') {
      // Server format: { "status": "success", "token": "...", "data": { "user": {...} } }
      success = true;
      message = 'Login successful';
      accessToken = json['token'];
      refreshToken = json['refresh_token'];
      
      // Extract user data from nested structure
      if (json['data'] != null && json['data'] is Map) {
        final data = json['data'] as Map<String, dynamic>;
        if (data['user'] != null) {
          user = UserData.fromJson(data['user']);
        }
      }
    } else if (json.containsKey('success')) {
      // Standard format: { "success": true, "message": "...", "access_token": "...", "user": {...} }
      success = json['success'] ?? false;
      message = json['message'] ?? '';
      accessToken = json['access_token'];
      refreshToken = json['refresh_token'];
      user = json['user'] != null ? UserData.fromJson(json['user']) : null;
    } else {
      // Fallback - assume success if we have a token
      accessToken = json['token'] ?? json['access_token'];
      if (accessToken != null) {
        success = true;
        message = 'Login successful';
        user = json['user'] != null ? UserData.fromJson(json['user']) : null;
      }
    }

    return LoginResponse(
      success: success,
      message: message,
      accessToken: accessToken,
      refreshToken: refreshToken,
      user: user,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'success': success,
      'message': message,
      'access_token': accessToken,
      'refresh_token': refreshToken,
      'user': user?.toJson(),
    };
  }
}

// User Data Model
class UserData {
  final int id;
  final String name;
  final String email;
  final String? role;
  final String? department;
  final String? location;
  final int? targetId; // Barangay ID or Municipality ID
  final String? targetType; // "barangay" or "municipality"
  final String? barangayName;
  final String? barangayCode;
  final String? barangayLogoPath;
  final String? certificateBackgroundPath;
  final String? organizationalChartPath;
  final String? barangayContactNumber;
  final String? barangayEmail;
  final String? gisCode;
  final String? municipalityName;
  final String? municipalityLogoPath;
  final String? provinceName;
  final String? region;
  final String? captainName;
  final String? captainPosition;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  UserData({
    required this.id,
    required this.name,
    required this.email,
    this.role,
    this.department,
    this.location,
    this.targetId,
    this.targetType,
    this.barangayName,
    this.barangayCode,
    this.barangayLogoPath,
    this.certificateBackgroundPath,
    this.organizationalChartPath,
    this.barangayContactNumber,
    this.barangayEmail,
    this.gisCode,
    this.municipalityName,
    this.municipalityLogoPath,
    this.provinceName,
    this.region,
    this.captainName,
    this.captainPosition,
    this.createdAt,
    this.updatedAt,
  });

  factory UserData.fromJson(Map<String, dynamic> json) {
    return UserData(
      id: _parseInt(json['id']) ?? 0,
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'],
      department: json['department'],
      location: json['location'],
      targetId: _parseInt(json['target_id'] ?? json['targetId']), // Handle both snake_case and camelCase
      targetType: json['target_type'] ?? json['targetType'], // Handle both snake_case and camelCase
      barangayName: json['barangay_name'] ?? json['barangayName'],
      barangayCode: json['barangay_code'] ?? json['barangayCode'],
      barangayLogoPath: json['barangay_logo_path'] ?? json['barangayLogoPath'],
      certificateBackgroundPath: json['certificate_background_path'] ?? json['certificateBackgroundPath'],
      organizationalChartPath: json['organizational_chart_path'] ?? json['organizationalChartPath'],
      barangayContactNumber: json['contact_number'] ?? json['barangayContactNumber'],
      barangayEmail: json['email'] ?? json['barangayEmail'],
      gisCode: json['gis_code'] ?? json['gisCode'],
      municipalityName: json['municipality_name'] ?? json['municipalityName'],
      municipalityLogoPath: json['municipality_logo_path'] ?? json['municipalityLogoPath'],
      provinceName: json['province_name'] ?? json['provinceName'],
      region: json['region'] ?? json['region'],
      captainName: json['captain_name'] ?? json['captainName'],
      captainPosition: json['captain_position'] ?? json['captainPosition'],
      createdAt: (json['created_at'] ?? json['createdAt']) != null 
          ? DateTime.tryParse(json['created_at'] ?? json['createdAt'] ?? '') 
          : null,
      updatedAt: (json['updated_at'] ?? json['updatedAt']) != null 
          ? DateTime.tryParse(json['updated_at'] ?? json['updatedAt'] ?? '') 
          : null,
    );
  }

  // Helper method to parse integers from strings or numbers
  static int? _parseInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is String) return int.tryParse(value);
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'department': department,
      'location': location,
      'target_id': targetId,
      'target_type': targetType,
      'barangay_name': barangayName,
      'barangay_code': barangayCode,
      'barangay_logo_path': barangayLogoPath,
      'certificate_background_path': certificateBackgroundPath,
      'organizational_chart_path': organizationalChartPath,
      'contact_number': barangayContactNumber,
      'barangay_email': barangayEmail,
      'gis_code': gisCode,
      'municipality_name': municipalityName,
      'municipality_logo_path': municipalityLogoPath,
      'province_name': provinceName,
      'region': region,
      'captain_name': captainName,
      'captain_position': captainPosition,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}

// Barangay Data Model (for API response)
class BarangayData {
  final int id;
  final int municipalityId;
  final String barangayName;
  final String barangayCode;
  final String? barangayLogoPath;
  final String? certificateBackgroundPath;
  final String? organizationalChartPath;
  final String? contactNumber;
  final String? email;
  final String? gisCode;
  final String? municipalityName;
  final String? province;
  final String? region;
  final String? municipalityLogoPath;
  final String? captainPosition;
  final String? captainName;

  BarangayData({
    required this.id,
    required this.municipalityId,
    required this.barangayName,
    required this.barangayCode,
    this.barangayLogoPath,
    this.certificateBackgroundPath,
    this.organizationalChartPath,
    this.contactNumber,
    this.email,
    this.gisCode,
    this.municipalityName,
    this.province,
    this.region,
    this.municipalityLogoPath,
    this.captainPosition,
    this.captainName,
  });

  factory BarangayData.fromJson(Map<String, dynamic> json) {
    // Debug GIS code parsing
    print('🔍 BarangayData.fromJson - GIS Code Debug:');
    print('   Raw gis_code value: "${json['gis_code']}"');
    print('   gis_code type: ${json['gis_code'].runtimeType}');
    print('   gis_code is null: ${json['gis_code'] == null}');
    print('   gis_code is empty string: ${json['gis_code'] == ''}');
    
    return BarangayData(
      id: _parseInt(json['id']) ?? 0,
      municipalityId: _parseInt(json['municipality_id']) ?? 0,
      barangayName: json['barangay_name'] ?? '',
      barangayCode: json['barangay_code'] ?? '',
      barangayLogoPath: json['barangay_logo_path'],
      certificateBackgroundPath: json['certificate_background_path'],
      organizationalChartPath: json['organizational_chart_path'],
      contactNumber: json['contact_number'],
      email: json['email'],
      gisCode: json['gis_code'] ?? 'N/A',
      municipalityName: json['municipality_name'],
      province: json['province'],
      region: json['region'],
      municipalityLogoPath: json['municipality_logo_path'],
      captainPosition: json['captain_position'],
      captainName: json['captain_name'],
    );
  }

  // Helper method to parse integers from strings or numbers
  static int? _parseInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is String) return int.tryParse(value);
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'municipality_id': municipalityId,
      'barangay_name': barangayName,
      'barangay_code': barangayCode,
      'barangay_logo_path': barangayLogoPath,
      'certificate_background_path': certificateBackgroundPath,
      'organizational_chart_path': organizationalChartPath,
      'contact_number': contactNumber,
      'email': email,
      'gis_code': gisCode,
      'municipality_name': municipalityName,
      'province': province,
      'region': region,
      'municipality_logo_path': municipalityLogoPath,
      'captain_position': captainPosition,
      'captain_name': captainName,
    };
  }
}

// Purok Data Model (for API response)
class PurokData {
  final int purokId;
  final int barangayId;
  final String purokName;
  final String? purokLeader;
  final String? description;

  PurokData({
    required this.purokId,
    required this.barangayId,
    required this.purokName,
    this.purokLeader,
    this.description,
  });

  factory PurokData.fromJson(Map<String, dynamic> json) {
    return PurokData(
      purokId: _parseInt(json['purok_id']) ?? 0,
      barangayId: _parseInt(json['barangay_id']) ?? 0, // Use dynamic barangayId from JSON, fallback to 0 if null
      purokName: json['purok_name'] ?? '',
      purokLeader: json['purok_leader'],
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'purok_id': purokId,
      'barangay_id': barangayId,
      'purok_name': purokName,
      'purok_leader': purokLeader,
      'description': description,
    };
  }

  // Helper method to parse integers from strings or numbers
  static int? _parseInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is String) return int.tryParse(value);
    return null;
  }
}

// API Error Response Model
class ApiError {
  final bool success;
  final String message;
  final Map<String, dynamic>? errors;
  final int? statusCode;

  ApiError({
    required this.success,
    required this.message,
    this.errors,
    this.statusCode,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      success: json['success'] ?? false,
      message: json['message'] ?? 'An error occurred',
      errors: json['errors'],
      statusCode: json['status_code'],
    );
  }

  factory ApiError.fromDioError(DioException error) {
    String message = 'An error occurred';
    Map<String, dynamic>? errors;

    if (error.response != null) {
      final data = error.response?.data;
      if (data is Map<String, dynamic>) {
        message = data['message'] ?? 'An error occurred';
        errors = data['errors'];
      }
    } else {
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
          message = 'Connection timeout';
          break;
        case DioExceptionType.sendTimeout:
          message = 'Send timeout';
          break;
        case DioExceptionType.receiveTimeout:
          message = 'Receive timeout';
          break;
        case DioExceptionType.badResponse:
          message = 'Bad response from server';
          break;
        case DioExceptionType.cancel:
          message = 'Request cancelled';
          break;
        case DioExceptionType.connectionError:
          message = 'Connection error';
          break;
        case DioExceptionType.unknown:
          message = 'Unknown error occurred';
          break;
        default:
          message = 'Network error';
      }
    }

    return ApiError(
      success: false,
      message: message,
      errors: errors,
      statusCode: error.response?.statusCode,
    );
  }
}

// Classification Type Data Model (for API response)
class ClassificationTypeData {
  final int id;
  final int municipalityId;
  final String name;
  final String? description;
  final String color;
  final List<dynamic> details;
  final bool isActive;
  final String? createdAt;
  final String? updatedAt;

  ClassificationTypeData({
    required this.id,
    required this.municipalityId,
    required this.name,
    this.description,
    required this.color,
    required this.details,
    required this.isActive,
    this.createdAt,
    this.updatedAt,
  });

  factory ClassificationTypeData.fromJson(Map<String, dynamic> json) {
    return ClassificationTypeData(
      id: _parseInt(json['id']) ?? 0,
      municipalityId: _parseInt(json['municipality_id']) ?? 0,
      name: json['name'] ?? '',
      description: json['description'],
      color: json['color'] ?? '#4CAF50',
      details: json['details'] is List 
          ? json['details'] 
          : (json['details'] is String 
              ? (json['details'].isEmpty ? [] : jsonDecode(json['details']))
              : []),
      isActive: json['is_active'] == true || json['is_active'] == 1,
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'municipality_id': municipalityId,
      'name': name,
      'description': description,
      'color': color,
      'details': details,
      'is_active': isActive,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  Map<String, dynamic> toLocalJson() {
    return {
      'id': id,
      'municipality_id': municipalityId,
      'name': name,
      'description': description,
      'color': color,
      'details': jsonEncode(details),
      'is_active': isActive ? 1 : 0,
      'server_id': id,           // ✅ Mark server ID (same as id when from server)
      'sync_status': 'synced',   // ✅ Already on server, mark as synced
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  // Helper method to parse integers from strings or numbers
  static int? _parseInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is String) return int.tryParse(value);
    return null;
  }
}
