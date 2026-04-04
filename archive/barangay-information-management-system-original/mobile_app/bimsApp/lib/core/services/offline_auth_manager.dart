import '../../data/models/auth_models.dart';
import 'secure_storage_service.dart';

class OfflineAuthManager {
  static final OfflineAuthManager _instance = OfflineAuthManager._internal();
  factory OfflineAuthManager() => _instance;
  OfflineAuthManager._internal();

  final SecureStorageService _secureStorage = SecureStorageService();

  /// Check if user is logged in (offline check)
  Future<bool> isLoggedIn() async {
    try {
      final token = await _secureStorage.getToken();
      final userData = await _secureStorage.getUserData();
      
      // User is considered logged in if both token and user data exist
      return token != null && token.isNotEmpty && userData != null;
    } catch (e) {
      return false;
    }
  }

  /// Get current user data (offline)
  Future<UserData?> getCurrentUser() async {
    try {
      return await _secureStorage.getUserData();
    } catch (e) {
      return null;
    }
  }

  /// Get current JWT token (offline)
  Future<String?> getCurrentToken() async {
    try {
      return await _secureStorage.getToken();
    } catch (e) {
      return null;
    }
  }

  /// Get barangay ID from stored user data (offline)
  Future<int?> getBarangayId() async {
    try {
      final userData = await _secureStorage.getUserData();
      return userData?.targetId;
    } catch (e) {
      return null;
    }
  }

  /// Get barangay name from stored user data (offline)
  Future<String?> getBarangayName() async {
    try {
      final userData = await _secureStorage.getUserData();
      return userData?.barangayName;
    } catch (e) {
      return null;
    }
  }

  /// Get municipality name from stored user data (offline)
  Future<String?> getMunicipalityName() async {
    try {
      final userData = await _secureStorage.getUserData();
      return userData?.municipalityName;
    } catch (e) {
      return null;
    }
  }

  /// Get province name from stored user data (offline)
  Future<String?> getProvinceName() async {
    try {
      final userData = await _secureStorage.getUserData();
      return userData?.provinceName;
    } catch (e) {
      return null;
    }
  }

  /// Get user role from stored user data (offline)
  Future<String?> getUserRole() async {
    try {
      final userData = await _secureStorage.getUserData();
      return userData?.role;
    } catch (e) {
      return null;
    }
  }

  /// Get target type (barangay/municipality) from stored user data (offline)
  Future<String?> getTargetType() async {
    try {
      final userData = await _secureStorage.getUserData();
      return userData?.targetType;
    } catch (e) {
      return null;
    }
  }

  /// Get captain name from stored user data (offline)
  Future<String?> getCaptainName() async {
    try {
      final userData = await _secureStorage.getUserData();
      return userData?.captainName;
    } catch (e) {
      return null;
    }
  }

  /// Get captain position from stored user data (offline)
  Future<String?> getCaptainPosition() async {
    try {
      final userData = await _secureStorage.getUserData();
      return userData?.captainPosition;
    } catch (e) {
      return null;
    }
  }

  /// Get all user location information (offline)
  Future<Map<String, String?>> getUserLocationInfo() async {
    try {
      final userData = await _secureStorage.getUserData();
      if (userData == null) {
        return {
          'barangayName': null,
          'municipalityName': null,
          'provinceName': null,
          'barangayId': null,
          'targetType': null,
        };
      }

      return {
        'barangayName': userData.barangayName,
        'municipalityName': userData.municipalityName,
        'provinceName': userData.provinceName,
        'barangayId': userData.targetId?.toString(),
        'targetType': userData.targetType,
      };
    } catch (e) {
      return {
        'barangayName': null,
        'municipalityName': null,
        'provinceName': null,
        'barangayId': null,
        'targetType': null,
      };
    }
  }

  /// Get complete user profile for display (offline)
  Future<Map<String, dynamic>> getUserProfile() async {
    try {
      final userData = await _secureStorage.getUserData();
      if (userData == null) {
        return {
          'isLoggedIn': false,
          'userData': null,
        };
      }

      return {
        'isLoggedIn': true,
        'userData': {
          'id': userData.id,
          'name': userData.name,
          'email': userData.email,
          'role': userData.role,
          'department': userData.department,
          'location': userData.location,
          'targetId': userData.targetId,
          'targetType': userData.targetType,
          'barangayName': userData.barangayName,
          'municipalityName': userData.municipalityName,
          'provinceName': userData.provinceName,
          'captainName': userData.captainName,
          'captainPosition': userData.captainPosition,
          'createdAt': userData.createdAt?.toIso8601String(),
          'updatedAt': userData.updatedAt?.toIso8601String(),
        },
      };
    } catch (e) {
      return {
        'isLoggedIn': false,
        'userData': null,
      };
    }
  }

  /// Clear all authentication data (logout)
  Future<void> logout() async {
    await _secureStorage.clearAll();
  }
}
