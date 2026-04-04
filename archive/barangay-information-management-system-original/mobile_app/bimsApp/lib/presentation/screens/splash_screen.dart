import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/auth_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late AnimationController _logoController;
  late AnimationController _fadeController;
  late Animation<double> _logoAnimation;
  late Animation<double> _fadeAnimation;
  
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    
    _logoAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _logoController,
      curve: Curves.elasticOut,
    ));
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeIn,
    ));
    
    _startAnimation();
  }

  void _startAnimation() async {
    await _logoController.forward();
    await _fadeController.forward();
    
    // Initialize app
    final appProvider = context.read<AppProvider>();
    await appProvider.initializeApp();
    
    // Check if user is logged in (offline check)
    await _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    try {
      print('🚀 Checking offline login status...');
      
      // Check if this is the first app launch
      final isFirstLaunch = await _authService.isFirstLaunch();
      print('   📋 Is first launch: $isFirstLaunch');
      
      if (isFirstLaunch) {
        print('   🆕 First app launch - redirecting to login');
        if (mounted) {
          Navigator.of(context).pushReplacementNamed('/login');
        }
        return;
      }
      
      // Check if user is logged in offline
      final isLoggedIn = await _authService.isLoggedInOffline();
      print('   📋 Is logged in offline: $isLoggedIn');
      
      if (mounted) {
        if (isLoggedIn) {
          // User is logged in, get user data and go to home
          final userData = await _authService.getStoredUserData();
          print('   ✅ User is logged in offline: ${userData?.name} (${userData?.barangayName})');
          print('   📋 User role: ${userData?.role}');
          print('   📋 Barangay ID: ${userData?.targetId}');
          
          // Navigate to home screen
          Navigator.of(context).pushReplacementNamed('/home');
        } else {
          // User is not logged in, go to login screen
          print('   ❌ User is not logged in, redirecting to login');
          Navigator.of(context).pushReplacementNamed('/login');
        }
      }
    } catch (e) {
      print('   ❌ Error checking login status: $e');
      // On error, go to login screen
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/login');
      }
    }
  }

  @override
  void dispose() {
    _logoController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo Animation
            ScaleTransition(
              scale: _logoAnimation,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.asset(
                    'assets/images/image.jpg',
                    fit: BoxFit.cover,
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 40),
            
            // App Name Animation
            FadeTransition(
              opacity: _fadeAnimation,
              child: const Column(
                children: [
                  Text(
                    'RBI App',
                    style: TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Resident Barangay Information System',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white70,
                      letterSpacing: 1,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 80),
            
            // Loading Indicator
            FadeTransition(
              opacity: _fadeAnimation,
              child: const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                strokeWidth: 3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
