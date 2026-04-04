import 'package:flutter/material.dart';
import '../../core/services/database_service.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/api_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../core/services/offline_mapping_service.dart';
import '../../data/models/auth_models.dart';

class AppProvider extends ChangeNotifier {
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _userToken;
  String? _userRole;
  String? _userBarangayId;
  
  final AuthService _authService = AuthService();
  final ApiService _apiService = ApiService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  final OfflineMappingService _mappingService = OfflineMappingService();
  
  // Getters
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get userToken => _userToken;
  String? get userRole => _userRole;
  String? get userBarangayId => _userBarangayId;
  
  // Loading state
  void setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  // Authentication state
  void setAuthenticated(bool authenticated) {
    _isAuthenticated = authenticated;
    notifyListeners();
  }
  
  void setUserToken(String? token) {
    _userToken = token;
    notifyListeners();
  }
  
  void setUserRole(String? role) {
    _userRole = role;
    notifyListeners();
  }
  
  void setUserBarangayId(String? barangayId) {
    _userBarangayId = barangayId;
    notifyListeners();
  }
  
  // Initialize app state
  Future<void> initializeApp() async {
    setLoading(true);
    
    try {
      // Initialize database service with retry mechanism
      bool dbInitialized = false;
      int retryCount = 0;
      const maxRetries = 3;
      
      while (!dbInitialized && retryCount < maxRetries) {
        try {
          debugPrint('Attempting database initialization (attempt ${retryCount + 1}/$maxRetries)');
          await DatabaseService().initialize();
          
          // Verify database schema after initialization
          debugPrint('Verifying database schema...');
          await DatabaseService().verifyDatabaseSchema();
          
          dbInitialized = true;
          debugPrint('Database initialization successful');
        } catch (dbError) {
          retryCount++;
          debugPrint('Database initialization failed (attempt $retryCount): $dbError');
          
          if (retryCount < maxRetries) {
            // Wait before retrying
            await Future.delayed(Duration(seconds: retryCount * 2));
          } else {
            debugPrint('Database initialization failed after $maxRetries attempts');
            // Don't throw error, continue with app initialization
            // The app can still function with limited capabilities
          }
        }
      }
      
      // Initialize API service with saved IP address
      await _apiService.initialize();
      debugPrint('API service initialized with saved IP address');
      
      // Check for stored authentication data using offline auth manager
      final isLoggedIn = await _offlineAuth.isLoggedIn();
      if (isLoggedIn) {
        final userData = await _offlineAuth.getCurrentUser();
        final token = await _offlineAuth.getCurrentToken();
        
        if (userData != null && token != null) {
          _userToken = token;
          _userRole = userData.role;
          _userBarangayId = userData.targetId?.toString();
          _isAuthenticated = true;
          
          debugPrint('User authenticated from stored data: ${userData.name}');
        }
      }
    } catch (e) {
      debugPrint('Error initializing app: $e');
      // Don't rethrow - let the app continue with limited functionality
    } finally {
      setLoading(false);
    }
  }
  
  // Login
  Future<bool> login(String username, String password, {String? customIpAddress}) async {
    setLoading(true);
    
    try {
      print('🚀 APP PROVIDER - Starting login process');
      print('   Username: $username');
      print('   Password: ${password.replaceRange(2, password.length, '*' * (password.length - 2))}');
      if (customIpAddress != null) {
        print('   🌐 Custom IP Address: $customIpAddress');
      }
      
      // Initialize auth service with custom IP if provided
      await _authService.initialize(customIpAddress: customIpAddress);
      print('   ✅ Auth service initialized');
      
      // Also initialize API service with custom IP if provided
      if (customIpAddress != null) {
        await _apiService.reinitializeWithCustomUrl(customIpAddress);
        print('   ✅ API service reinitialized with custom IP: $customIpAddress');
      }
      
      // Call the API login
      final response = await _authService.login(username, password);
      print('   📥 Login response received');
      print('   Success: ${response.success}');
      print('   Message: ${response.message}');
      
      if (response.success) {
        print('   🎯 Response indicates success, processing user data...');
        
        // Use user data directly from the response if available
        UserData? userData = response.user;
        print('   👤 User data from response: ${userData != null ? 'Present' : 'Missing'}');
        
        // If not available in response, try to get from storage
        if (userData == null) {
          print('   🔄 User data not in response, checking storage...');
          userData = await _offlineAuth.getCurrentUser();
          print('   👤 User data from storage: ${userData != null ? 'Present' : 'Missing'}');
        }
        
        if (userData != null) {
          print('   🔐 Getting authentication token...');
          _userToken = await _offlineAuth.getCurrentToken();
          print('   🎫 Token retrieved: ${_userToken != null ? 'Present (${_userToken!.length} chars)' : 'Missing'}');
          
          _userRole = userData.role;
          _userBarangayId = userData.targetId?.toString();
          _isAuthenticated = true;
          
          print('   ✅ Login successful - User data loaded');
          print('   User: ${userData.name}');
          print('   Role: ${userData.role}');
          print('   Barangay ID: ${userData.targetId}');
          print('   Target Type: ${userData.targetType}');
          print('   Authentication Status: $_isAuthenticated');
          
          // Check if offline mapping setup is needed
          if (userData.targetId != null && userData.targetType == 'barangay') {
            print('   🗺️ Checking offline mapping setup for barangay: ${userData.targetId}');
            final needsOfflineMapping = await _checkOfflineMappingNeeded(userData.targetId.toString());
            if (needsOfflineMapping) {
              print('   📥 Offline mapping setup needed - will be handled by UI');
            } else {
              print('   ✅ Offline mapping already available');
            }
          }
          
          notifyListeners();
          return true;
        } else {
          print('   ❌ Login successful but no user data found in response or storage');
          return false;
        }
      } else {
        print('   ❌ Login failed: ${response.message}');
        return false;
      }
    } catch (e) {
      print('   💥 Login error: $e');
      return false;
    } finally {
      setLoading(false);
    }
  }
  
  // Logout
  Future<void> logout() async {
    setLoading(true);
    
    try {
      print('🚪 APP PROVIDER - Starting logout process');
      
      // Clear all authentication data using auth service
      await _authService.clearAuth();
      print('   ✅ Auth service cleared');
      
      // Reset state
      _userToken = null;
      _userRole = null;
      _userBarangayId = null;
      _isAuthenticated = false;
      
      print('   ✅ App provider state reset');
      notifyListeners();
    } catch (e) {
      print('   💥 Logout error: $e');
    } finally {
      setLoading(false);
    }
  }
  
  // Check if offline mapping setup is needed
  Future<bool> _checkOfflineMappingNeeded(String barangayId) async {
    try {
      final hasPolygon = await _mappingService.hasBarangayPolygon(barangayId);
      final tileCount = await _mappingService.getMapTileCount();
      
      // If no polygon data or very few tiles, offline mapping is needed
      return !hasPolygon || tileCount < 10;
    } catch (e) {
      print('   ❌ Error checking offline mapping status: $e');
      return true; // Assume mapping is needed if check fails
    }
  }
  
  // Check if offline mapping is needed (public method for UI)
  Future<bool> needsOfflineMappingSetup() async {
    if (_userBarangayId == null) return false;
    return await _checkOfflineMappingNeeded(_userBarangayId!);
  }
}
