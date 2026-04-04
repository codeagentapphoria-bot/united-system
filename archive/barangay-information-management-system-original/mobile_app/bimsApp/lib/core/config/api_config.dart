class ApiConfig {
  // Environment configuration - Change this to switch environments
  static const bool isProduction = false; // Set to true for production, false for development
  
  // Base URLs
  static const String productionBaseUrl = 'https://54.66.251.27/api'; // Self-signed certificate - SSL bypass enabled - tempoararily bypass SSL for now if we have propper domain i will remove this 
  static const String developmentBaseUrl = 'http://192.168.137.120:5000/api';
  
  // Dynamic base URL based on environment
  static String get baseUrl {
    return isProduction ? productionBaseUrl : developmentBaseUrl;
  }
  
  // API Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String logoutEndpoint = '/auth/logout';
  static const String refreshTokenEndpoint = '/auth/refresh';
  static const String profileEndpoint = '/auth/profile';
  
  // Barangay Endpoints
  static String getBarangayEndpoint(int barangayId) => '/public/$barangayId/barangay';
  static String getBarangayEndpointAuthenticated(int barangayId) => '/$barangayId/barangay';
  
  // Purok Endpoints
  static String getPurokListEndpoint(int barangayId) => '/list/$barangayId/purok';
  static String getPurokInfoEndpoint(int purokId) => '/$purokId/purok';
  
  // Classification Types Endpoints
  static const String getClassificationTypesEndpoint = '/classification-types';
  static String getClassificationTypeByIdEndpoint(int id) => '/classification-types/$id';
  
  // Resident Sync Endpoints
  static const String syncResidentEndpoint = '/sync/resident'; // Fast JSON endpoint
  static const String syncResidentClassificationEndpoint = '/sync/resident-classification';
  static const String createResidentEndpoint = '/resident';
  static const String uploadResidentImageEndpoint = '/sync/resident/image';
  
  // Household Sync Endpoints
  static const String syncHouseholdEndpoint = '/sync/household';
  static const String uploadHouseholdImageEndpoint = '/sync/household/image';
  
  // Pet Sync Endpoints
  static const String syncPetEndpoint = '/sync/pet';
  static const String createPetEndpoint = '/pet';
  static const String uploadPetImageEndpoint = '/sync/pet/image';
  static const String createVaccineEndpoint = '/vaccine';
  
  // GIS Endpoints
  static String getBarangayGeojsonEndpoint(int barangayId) => '/public/geojson/barangays/$barangayId';
  // static String getMunicipalityGeojsonEndpoint(int municipalityId) => '/public/geojson/municipalities/$municipalityId';
  // static const String getAllBarangaysGeojsonEndpoint = '/public/geojson/barangays';
  // static const String getAllMunicipalitiesGeojsonEndpoint = '/public/geojson/municipalities';
  
  
  static const String recipientEmail = 'vittorioraagas06@gmail.com'; // Who receives the email
  
  // SendGrid Configuration
  // Get your API key from: https://app.sendgrid.com/settings/api_keys
  static const String sendGridApiKey = 'REMOVED_FOR_SECURITY'; 
  static const String sendGridApiUrl = 'https://api.sendgrid.com/v3/mail/send';
  static const String senderEmail = 'vittorioraagas06@gmail.com'; // Can be any email (SendGrid verified sender)
  static const String senderName = 'RBI Mobile System';
  
  // Request timeout settings
  static const int connectTimeout = 30000; // 30 seconds
  static const int receiveTimeout = 30000; // 30 seconds
  static const int sendTimeout = 30000; // 30 seconds
  
  // Extended timeout settings for file uploads (images, documents)
  static const int fileUploadConnectTimeout = 60000; // 60 seconds
  static const int fileUploadReceiveTimeout = 120000; // 2 minutes
  static const int fileUploadSendTimeout = 120000; // 2 minutes
  
  // SSL Bypass settings
  // - Enabled in development (for HTTP/local testing)
  // - Enabled in production when using self-signed certificates (like EC2 IP addresses)
  // - Disabled in production when using proper SSL certificates (domain names)
  static bool get bypassSSL => !isProduction || _hasSelfSignedCertificate;
  
  // Check if production URL uses self-signed certificate (IP address instead of domain)
  static bool get _hasSelfSignedCertificate => isProduction && productionBaseUrl.contains('54.66.251.27');
  
  // JWT Token storage key
  static const String tokenKey = 'jwt_token';
  static const String refreshTokenKey = 'refresh_token';
  
  // Headers
  static const Map<String, String> defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}
