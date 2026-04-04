import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import 'secure_storage_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late Dio _dio;
  bool _isInitialized = false;
  String? _customBaseUrl;
  final SecureStorageService _secureStorage = SecureStorageService();

  Dio get dio => _dio;

  Future<void> initialize({String? customBaseUrl}) async {
    if (_isInitialized && _customBaseUrl == customBaseUrl) {
      print('🌐 API SERVICE - Already initialized with same base URL');
      return;
    }
    
    // If already initialized with custom IP and no new custom IP provided, don't reinitialize
    if (_isInitialized && _customBaseUrl != null && customBaseUrl == null) {
      print('🌐 API SERVICE - Already initialized with custom IP, keeping existing configuration');
      return;
    }

    // If no custom URL provided, try to load from SharedPreferences
    String? finalCustomBaseUrl = customBaseUrl;
    if (finalCustomBaseUrl == null) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final savedIp = prefs.getString('last_used_server_url');
        if (savedIp != null && savedIp.isNotEmpty) {
          finalCustomBaseUrl = savedIp;
          print('🌐 API SERVICE - Loaded saved server URL: $savedIp');
        }
      } catch (e) {
        print('🌐 API SERVICE - Error loading saved server URL: $e');
      }
    }

    // Store custom base URL
    _customBaseUrl = finalCustomBaseUrl;
    
    // Determine the base URL to use
    final baseUrl = finalCustomBaseUrl != null 
        ? _buildBaseUrl(finalCustomBaseUrl)
        : ApiConfig.baseUrl;

    print('🌐 API SERVICE - Initializing...');
    print('   Custom Base URL: $customBaseUrl');
    print('   Final Base URL: $baseUrl');
    print('   SSL Bypass: ${ApiConfig.bypassSSL}');
    print('   Connect Timeout: ${ApiConfig.connectTimeout}ms');
    print('   Receive Timeout: ${ApiConfig.receiveTimeout}ms');

    _dio = Dio();

    // Configure base options
    _dio.options = BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: Duration(milliseconds: ApiConfig.connectTimeout),
      receiveTimeout: Duration(milliseconds: ApiConfig.receiveTimeout),
      sendTimeout: Duration(milliseconds: ApiConfig.sendTimeout),
      headers: ApiConfig.defaultHeaders,
    );

    // Add interceptors
    _dio.interceptors.addAll([
      _createAuthInterceptor(),
      _createLoggingInterceptor(),
    ]);

    // Configure SSL bypass for development
    if (ApiConfig.bypassSSL) {
      _configureSSLBypass();
      print('   ⚠️ SSL bypass enabled for development');
    }

    _isInitialized = true;
    print('   ✅ API Service initialized successfully');
  }

  // Method to reinitialize with new base URL
  Future<void> reinitializeWithCustomUrl(String ipAddress) async {
    _isInitialized = false;
    await initialize(customBaseUrl: ipAddress);
  }

  void _configureSSLBypass() {
    // SSL bypass configuration for development
    (_dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () {
      final client = HttpClient();
      client.badCertificateCallback = (cert, host, port) {
        // WARNING: This bypasses SSL certificate validation
        // Only use in development environment
        return true;
      };
      return client;
    };
  }

  Interceptor _createAuthInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Add JWT token to requests
        final token = await _getStoredToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onResponse: (response, handler) {
        handler.next(response);
      },
      onError: (error, handler) async {
        // Handle token expiration
        if (error.response?.statusCode == 401) {
          final refreshed = await _refreshToken();
          if (refreshed) {
            // Retry the original request
            final options = error.requestOptions;
            final token = await _getStoredToken();
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
            try {
              final response = await _dio.fetch(options);
              handler.resolve(response);
              return;
            } catch (e) {
              // If retry fails, clear tokens and redirect to login
              await _clearTokens();
            }
          } else {
            await _clearTokens();
          }
        }
        handler.next(error);
      },
    );
  }

  Interceptor _createLoggingInterceptor() {
    return LogInterceptor(
      requestBody: true,
      responseBody: true,
      requestHeader: true,
      responseHeader: false,
      error: true,
      logPrint: (object) {
        // You can replace this with your preferred logging method
        print('API: $object');
      },
    );
  }

  Future<String?> _getStoredToken() async {
    return await _secureStorage.getToken();
  }

  Future<String?> _getStoredRefreshToken() async {
    return await _secureStorage.getRefreshToken();
  }

  Future<void> _storeTokens(String token, String? refreshToken) async {
    await _secureStorage.storeTokens(token, refreshToken);
  }

  Future<void> _clearTokens() async {
    await _secureStorage.clearTokens();
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _getStoredRefreshToken();
      if (refreshToken == null) return false;

      final response = await _dio.post(
        ApiConfig.refreshTokenEndpoint,
        data: {'refresh_token': refreshToken},
      );

      if (response.statusCode == 200) {
        final data = response.data;
        await _storeTokens(
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

  // Public methods for token management
  Future<void> setTokens(String token, String? refreshToken) async {
    await _storeTokens(token, refreshToken);
  }

  Future<void> clearTokens() async {
    await _clearTokens();
  }

  Future<bool> isAuthenticated() async {
    return await _secureStorage.isAuthenticated();
  }

  Future<String?> getToken() async {
    return await _getStoredToken();
  }

  // Get secure storage service for additional operations
  SecureStorageService get secureStorage => _secureStorage;
  
  // Get current base URL for debugging
  String get currentBaseUrl => _dio.options.baseUrl;
  
  // Check if using custom IP
  bool get isUsingCustomIp {
    final result = _customBaseUrl != null;
    print('🌐 API SERVICE - isUsingCustomIp: $result (customBaseUrl: $_customBaseUrl)');
    return result;
  }

  /// Build the complete base URL from custom URL/IP
  String _buildBaseUrl(String customUrl) {
    // Check if it's already a complete URL (starts with http:// or https://)
    if (customUrl.startsWith('http://') || customUrl.startsWith('https://')) {
      // It's a complete URL (like ngrok or IP with port), just add /api if not already present
      if (customUrl.endsWith('/api')) {
        return customUrl;
      } else {
        return customUrl.endsWith('/') ? '${customUrl}api' : '$customUrl/api';
      }
    } else {
      // It's an IP address or hostname, check if it already has a port
      if (customUrl.contains(':')) {
        // Already has a port (e.g., "192.168.1.200:3000" or "localhost:8000")
        return 'http://$customUrl/api';
      } else {
        // No port specified, use default port 5000
        return 'http://$customUrl:5000/api';
      }
    }
  }
}
