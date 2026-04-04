import 'package:flutter/material.dart';
import '../core/services/auth_service.dart';

/// Example of how to use the new barangay information functionality
class BarangayInfoUsage extends StatefulWidget {
  const BarangayInfoUsage({Key? key}) : super(key: key);

  @override
  State<BarangayInfoUsage> createState() => _BarangayInfoUsageState();
}

class _BarangayInfoUsageState extends State<BarangayInfoUsage> {
  final AuthService _authService = AuthService();
  Map<String, String?> barangayInfo = {};
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    loadBarangayInfo();
  }

  /// Load barangay information from secure storage
  Future<void> loadBarangayInfo() async {
    setState(() => isLoading = true);
    
    try {
      // Get barangay information from stored user data
      final info = await _authService.getBarangayInfo();
      setState(() {
        barangayInfo = info;
        isLoading = false;
      });
    } catch (e) {
      print('Error loading barangay info: $e');
      setState(() => isLoading = false);
    }
  }

  /// Get the barangay name for display
  String getBarangayName() {
    return barangayInfo['barangay_name'] ?? 'Unknown Barangay';
  }

  /// Get the municipality name for display
  String getMunicipalityName() {
    return barangayInfo['municipality_name'] ?? 'Unknown Municipality';
  }

  /// Get the province name for display
  String getProvinceName() {
    return barangayInfo['province_name'] ?? 'Unknown Province';
  }

  /// Get the captain name for display
  String getCaptainName() {
    return barangayInfo['captain_name'] ?? 'Unknown Captain';
  }

  /// Get the captain position for display
  String getCaptainPosition() {
    return barangayInfo['captain_position'] ?? 'Unknown Position';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Barangay Information'),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Your Barangay Information',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 20),
                  
                  // Barangay Name
                  _buildInfoCard(
                    'Barangay',
                    getBarangayName(),
                    Icons.location_city,
                  ),
                  
                  // Municipality
                  _buildInfoCard(
                    'Municipality',
                    getMunicipalityName(),
                    Icons.location_on,
                  ),
                  
                  // Province
                  _buildInfoCard(
                    'Province',
                    getProvinceName(),
                    Icons.map,
                  ),
                  
                  // Captain
                  _buildInfoCard(
                    'Captain',
                    '${getCaptainName()} (${getCaptainPosition()})',
                    Icons.person,
                  ),
                  
                  const SizedBox(height: 20),
                  
                  // Refresh button
                  ElevatedButton(
                    onPressed: loadBarangayInfo,
                    child: const Text('Refresh Information'),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoCard(String title, String value, IconData icon) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(value),
      ),
    );
  }
}

/// Example of how to use barangay information in other parts of your app
class BarangayInfoHelper {
  static final AuthService _authService = AuthService();
  
  /// Get the current user's barangay name
  static Future<String> getCurrentBarangayName() async {
    final info = await _authService.getBarangayInfo();
    return info['barangay_name'] ?? 'Unknown Barangay';
  }
  
  /// Get the current user's municipality name
  static Future<String> getCurrentMunicipalityName() async {
    final info = await _authService.getBarangayInfo();
    return info['municipality_name'] ?? 'Unknown Municipality';
  }
  
  /// Get the current user's province name
  static Future<String> getCurrentProvinceName() async {
    final info = await _authService.getBarangayInfo();
    return info['province_name'] ?? 'Unknown Province';
  }
  
  /// Get the current user's captain name
  static Future<String> getCurrentCaptainName() async {
    final info = await _authService.getBarangayInfo();
    return info['captain_name'] ?? 'Unknown Captain';
  }
  
  /// Get the current user's captain position
  static Future<String> getCurrentCaptainPosition() async {
    final info = await _authService.getBarangayInfo();
    return info['captain_position'] ?? 'Unknown Position';
  }
  
  /// Get the current user's target ID (barangay ID)
  static Future<int?> getCurrentTargetId() async {
    final info = await _authService.getBarangayInfo();
    final targetIdStr = info['target_id'];
    return targetIdStr != null ? int.tryParse(targetIdStr) : null;
  }
  
  /// Get all barangay information as a map
  static Future<Map<String, String?>> getAllBarangayInfo() async {
    return await _authService.getBarangayInfo();
  }
}
