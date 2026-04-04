import 'package:flutter/material.dart';
import 'auth_service.dart';
import '../../data/models/auth_models.dart';

/// Example of how to use the AuthService in your login screen
class AuthExample {
  final AuthService _authService = AuthService();

  /// Example login method that you can integrate into your login screen
  Future<void> performLogin(BuildContext context, String email, String password) async {
    try {
      // Show loading indicator
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(),
        ),
      );

      // Initialize auth service
      await _authService.initialize();

      // Perform login
      final response = await _authService.login(email, password);

      // Hide loading indicator
      Navigator.of(context).pop();

      if (response.success) {
        // Login successful
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Welcome, ${response.user?.name ?? 'User'}!'),
            backgroundColor: Colors.green,
          ),
        );

        // Navigate to home screen
        Navigator.of(context).pushReplacementNamed('/home');
      } else {
        // Login failed
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Login failed: ${response.message}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      // Hide loading indicator if still showing
      if (Navigator.of(context).canPop()) {
        Navigator.of(context).pop();
      }

      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('An error occurred: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Example logout method
  Future<void> performLogout(BuildContext context) async {
    try {
      final success = await _authService.logout();
      
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Logged out successfully'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Navigate to login screen
        Navigator.of(context).pushReplacementNamed('/login');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Logout failed'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Logout error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Check if user is authenticated
  Future<bool> checkAuthentication() async {
    await _authService.initialize();
    return await _authService.isAuthenticated();
  }

  /// Get user profile
  Future<UserData?> getUserProfile() async {
    try {
      await _authService.initialize();
      return await _authService.getProfile();
    } catch (e) {
      return null;
    }
  }
}

/// Example of how to integrate with your existing AppProvider
/// You can modify your AppProvider to use the AuthService instead of mock login
class AppProviderWithAPI {
  final AuthService _authService = AuthService();
  bool _isLoading = false;
  UserData? _currentUser;

  bool get isLoading => _isLoading;
  UserData? get currentUser => _currentUser;

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    
    try {
      await _authService.initialize();
      final response = await _authService.login(email, password);
      
      if (response.success) {
        _currentUser = response.user;
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      _isLoading = false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _currentUser = null;
  }

  Future<bool> isAuthenticated() async {
    await _authService.initialize();
    return await _authService.isAuthenticated();
  }
}
