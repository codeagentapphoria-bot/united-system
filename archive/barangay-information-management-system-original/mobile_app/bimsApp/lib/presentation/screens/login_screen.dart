import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../providers/app_provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import 'offline_download_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _serverUrlController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _loadLastUsedServerUrl();
  }

  Future<void> _loadLastUsedServerUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastUrl = prefs.getString('last_used_server_url');
      
      // If no saved URL, use the default IP address
      if (lastUrl == null || lastUrl.isEmpty) {
        _serverUrlController.text = '13.211.71.85';
      } else {
        _serverUrlController.text = lastUrl;
      }
    } catch (e) {
      // Fallback to default IP address
      _serverUrlController.text = '13.211.71.85';
    }
  }

  Future<void> _saveServerUrl(String serverUrl) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('last_used_server_url', serverUrl);
    } catch (e) {
      print('Failed to save server URL: $e');
    }
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    _serverUrlController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      print('🔐 LOGIN SCREEN - Starting login process');
      print('🌐 Using Server URL: ${_serverUrlController.text.trim()}');
      
      // Save the server URL for future use
      await _saveServerUrl(_serverUrlController.text.trim());
      
      final appProvider = context.read<AppProvider>();
      final success = await appProvider.login(
        _usernameController.text.trim(),
        _passwordController.text,
        customIpAddress: _serverUrlController.text.trim(),
      );

      print('🔐 LOGIN SCREEN - Login result: $success');

      if (success && mounted) {
        print('🔐 LOGIN SCREEN - Login successful, checking user type');
        
        // For barangay users, always go to offline download screen to handle GeoJSON API call there
        // This prevents slow API calls during login
        if (appProvider.userBarangayId != null) {
          print('🔐 LOGIN SCREEN - Barangay user detected, navigating to download screen');
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => OfflineDownloadScreen(
                barangayId: appProvider.userBarangayId!,
              ),
            ),
          );
        } else {
          print('🔐 LOGIN SCREEN - Non-barangay user, navigating to home screen');
          Navigator.of(context).pushReplacementNamed('/home');
        }
      } else if (mounted) {
        print('🔐 LOGIN SCREEN - Showing error message');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Login failed. Please check your credentials.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo and Title
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(15),
                          ),
                          child: const Icon(
                            Icons.location_city,
                            size: 50,
                            color: AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'RBI App',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 2,
                          ),
                        ),
                        const Text(
                          'Web Sync Login',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 40),
                  
                  // Login Form
                  Card(
                    elevation: 4,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Login to your account',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          
                          const SizedBox(height: 24),
                          
                          // Username Field
                          TextFormField(
                            controller: _usernameController,
                            decoration: const InputDecoration(
                              labelText: 'Username',
                              prefixIcon: Icon(AppIcons.resident),
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter your username';
                              }
                              return null;
                            },
                          ),
                          
                          const SizedBox(height: 16),
                          
                          // Password Field
                          TextFormField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: const Icon(AppIcons.lock),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword 
                                    ? AppIcons.visibility 
                                    : AppIcons.visibilityOff,
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscurePassword = !_obscurePassword;
                                  });
                                },
                              ),
                              border: const OutlineInputBorder(),
                            ),
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please enter your password';
                              }
                              if (value.length < 6) {
                                return 'Password must be at least 6 characters';
                              }
                              return null;
                            },
                          ),
                          
                          const SizedBox(height: 24),
                          
                          // Login Button
                          Consumer<AppProvider>(
                            builder: (context, appProvider, child) {
                              return ElevatedButton(
                                onPressed: appProvider.isLoading ? null : _handleLogin,
                                child: appProvider.isLoading
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : const Text(
                                        'Login',
                                        style: TextStyle(fontSize: 16),
                                      ),
                              );
                            },
                          ),
                          
                          const SizedBox(height: 16),
                          
                          // Demo Credentials Info
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.info.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: AppColors.info.withOpacity(0.3),
                              ),
                            ),
                            child: const Text(
                              'Warning: Requiring to login to your account to download some resources then you can use the app without internet connection',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.info,
                              ),
                            ),
                          ),
                          
                          const SizedBox(height: 16),
                          
                          // Server URL Field
                          TextFormField(
                            controller: _serverUrlController,
                            decoration: InputDecoration(
                              labelText: 'Server URL or IP Address',
                              hintText: 'URL or IP address with port',
                              prefixIcon: const Icon(Icons.computer),
                              border: const OutlineInputBorder(),
                              helperText: 'Enter the URL (ngrok) or IP:port of your server',
                              suffixIcon: PopupMenuButton<String>(
                                icon: const Icon(Icons.more_vert),
                                onSelected: (value) {
                                  _serverUrlController.text = value;
                                },
                                itemBuilder: (context) => [
                                  const PopupMenuItem(
                                    value: '192.168.1.100',
                                    child: Text('Sample IP Address'),
                                  ),
                                  const PopupMenuItem(
                                    value: 'https://balkingly-niveous-maisie.ngrok-free.dev',
                                    child: Text('Current Ngrok'),
                                  ),
                                ],
                              ),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter server URL or IP address';
                              }
                              
                              final trimmedValue = value.trim();
                              
                              // Check if it's a URL (starts with http:// or https://)
                              if (trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://')) {
                                // Basic URL validation
                                final urlRegex = RegExp(r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$');
                                if (!urlRegex.hasMatch(trimmedValue)) {
                                  return 'Please enter a valid URL (e.g., https://abc123.ngrok.io)';
                                }
                              } else {
                                // Check if it's a valid IP address with optional port or localhost
                                final ipWithPortRegex = RegExp(r'^(\d{1,3}\.){3}\d{1,3}(:\d+)?$|^localhost(:\d+)?$');
                                if (!ipWithPortRegex.hasMatch(trimmedValue)) {
                                  return 'Please enter a valid IP address (with optional port) or URL';
                                }
                              }
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
