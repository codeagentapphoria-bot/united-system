import 'package:flutter/material.dart';
import 'offline_auth_manager.dart';

/// Example of how to use the OfflineAuthManager in your app
class OfflineAuthExample {
  final OfflineAuthManager _authManager = OfflineAuthManager();

  /// Example: Check if user is logged in before performing an action
  Future<void> performActionIfLoggedIn(BuildContext context) async {
    final isLoggedIn = await _authManager.isLoggedIn();
    
    if (isLoggedIn) {
      // User is logged in, proceed with action
      final userData = await _authManager.getCurrentUser();
      print('User ${userData?.name} is performing action');
      
      // Your action here
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Action performed by ${userData?.name}')),
      );
    } else {
      // User is not logged in, redirect to login
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please login first'),
          backgroundColor: Colors.orange,
        ),
      );
      Navigator.of(context).pushNamed('/login');
    }
  }

  /// Example: Get barangay information for offline operations
  Future<Map<String, String?>> getBarangayInfo() async {
    return await _authManager.getUserLocationInfo();
  }

  /// Example: Display user information in a widget
  Widget buildUserInfoWidget() {
    return FutureBuilder<Map<String, dynamic>>(
      future: _authManager.getUserProfile(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const CircularProgressIndicator();
        }

        if (snapshot.hasData && snapshot.data!['isLoggedIn']) {
          final userData = snapshot.data!['userData'];
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Name: ${userData['name']}'),
                  Text('Email: ${userData['email']}'),
                  Text('Role: ${userData['role']}'),
                  Text('Barangay: ${userData['barangayName']}'),
                  Text('Municipality: ${userData['municipalityName']}'),
                  Text('Province: ${userData['provinceName']}'),
                ],
              ),
            ),
          );
        } else {
          return const Card(
            child: Padding(
              padding: EdgeInsets.all(16.0),
              child: Text('Not logged in'),
            ),
          );
        }
      },
    );
  }

  /// Example: Check if user has specific role
  Future<bool> hasRole(String requiredRole) async {
    final userRole = await _authManager.getUserRole();
    return userRole == requiredRole;
  }

  /// Example: Get barangay ID for API calls or database operations
  Future<int?> getBarangayIdForOperations() async {
    return await _authManager.getBarangayId();
  }

  /// Example: Logout and clear all data
  Future<void> logoutUser(BuildContext context) async {
    await _authManager.logout();
    Navigator.of(context).pushReplacementNamed('/login');
  }
}
