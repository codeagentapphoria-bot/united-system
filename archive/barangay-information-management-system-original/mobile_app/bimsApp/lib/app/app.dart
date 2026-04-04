import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../presentation/providers/app_provider.dart';
import '../presentation/screens/splash_screen.dart';
import '../presentation/screens/home_screen.dart';
import '../presentation/screens/login_screen.dart';
import '../presentation/screens/resident_list_screen.dart';
import '../presentation/screens/pets_list_screen.dart';
import '../presentation/screens/sync_data_screen.dart';
import '../core/theme/app_theme.dart';
import '../test_database.dart';

class BimsApp extends StatelessWidget {
  const BimsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppProvider()),
      ],
      child: MaterialApp(
        title: 'BIMS - Barangay Information Management System',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const SplashScreen(),
        routes: {
          '/home': (context) => const HomeScreen(),
          '/login': (context) => const LoginScreen(),
          '/sync': (context) => const SyncDataScreen(),
          '/test-db': (context) => const DatabaseTestScreen(),
          '/residents': (context) => const ResidentListScreen(),
          '/pets': (context) => const PetsListScreen(),
        },
      ),
    );
  }
}
