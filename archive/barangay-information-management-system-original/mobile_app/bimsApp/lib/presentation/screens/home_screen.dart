import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import 'dart:convert';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../core/services/database_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../core/services/excel_export_service.dart';
import '../../data/database/database_helper.dart';
import '../../data/models/resident.dart';
import '../providers/app_provider.dart';
import '../widgets/classification_details_editor.dart';
import 'add_resident_screen.dart';
import 'household_form.dart';
import 'household_list_screen.dart';
import 'pets_list_screen.dart';
import 'pet_form_screen.dart';
import 'reports_screen.dart';
import 'resident_json_view_screen.dart';
import 'sync_data_screen.dart';
import 'login_screen.dart';
import 'purok_management_screen.dart';
import 'classification_management_screen.dart';
import 'offline_map_screen.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import '../../seed_data.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  int _residentsRefreshKey = 0;
  int _householdsRefreshKey = 0;
  int _dashboardRefreshKey = 0;
  String _municipalityName = 'Loading...';
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();

  @override
  void initState() {
    super.initState();
    _loadMunicipalityName();
  }

  Future<void> _loadMunicipalityName() async {
    try {
      final userData = await _offlineAuth.getCurrentUser();
      if (mounted && userData != null) {
        setState(() {
          _municipalityName = userData.municipalityName ?? 'Unknown Municipality';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _municipalityName = 'Unknown Municipality';
        });
      }
    }
  }

  List<Widget> get _screens => [
    DashboardTab(
      key: ValueKey(_dashboardRefreshKey),
      onAddResident: _refreshAfterAddResident,
      onAddHousehold: _refreshAfterAddHousehold,
    ),
    ResidentsTab(key: ValueKey(_residentsRefreshKey)),
    HouseholdsTab(key: ValueKey(_householdsRefreshKey)),
    const PetsTab(),
    const SettingsTab(),
  ];

  void _refreshAfterAddResident() {
    if (mounted) {
    setState(() {
      _residentsRefreshKey++;
      _dashboardRefreshKey++;
    });
    }
  }

  void _refreshAfterAddHousehold() {
    if (mounted) {
    setState(() {
      _householdsRefreshKey++;
      _dashboardRefreshKey++;
    });
    }
  }

  // ignore: unused_element
  Future<void> _seedSingleResident() async {
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return const AlertDialog(
          content: Row(
            children: [
              CircularProgressIndicator(),
              SizedBox(width: 16),
              Text('Creating sample resident...'),
            ],
          ),
        );
      },
    );

    try {
      final userData = await _offlineAuth.getCurrentUser();
      if (userData == null) {
        throw Exception('User not logged in');
      }

      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }

      // Generate a unique ID for the resident
      final uuid = DateTime.now().millisecondsSinceEpoch.toString();
      
      // Create one sample resident
      final resident = Resident(
        id: uuid,
        barangayId: userData.targetId!, // Use dynamic barangayId from secure storage
        lastName: 'Sample',
        firstName: 'Resident',
        middleName: 'Test',
        sex: 'male',
        civilStatus: 'single',
        birthdate: '1990-01-01',
        birthplace: 'Sample City',
        contactNumber: '09123456789',
        email: 'sample@test.com',
        occupation: 'Sample Occupation',
        monthlyIncome: 15000.0,
        employmentStatus: 'employed',
        educationAttainment: 'college',  // ✅ Fixed: Use dropdown value
        residentStatus: 'active',
        indigenousPerson: false,
        syncStatus: 'pending',
      );

      await databaseService.residentRepository.create(resident);
      
      // Close loading dialog
      Navigator.of(context).pop();
      
      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sample resident created successfully!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            margin: EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
        
        // Refresh the dashboard and residents tabs
        setState(() {
          _residentsRefreshKey++;
          _dashboardRefreshKey++;
        });
      }
    } catch (e) {
      // Close loading dialog
      Navigator.of(context).pop();
      
      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error creating sample resident: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
    }
  }

  // ignore: unused_element
  Future<void> _seedThreeResidents() async {
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return const AlertDialog(
          content: Row(
            children: [
              CircularProgressIndicator(),
              SizedBox(width: 16),
              Text('Creating 3 sample residents...'),
            ],
          ),
        );
      },
    );

    try {
      // Seed 3 residents with same last name
      await DataSeeder.seedThreeResidentsWithSameLastName();
      
      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
      }
      
      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ 3 sample residents created successfully!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            margin: EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
        
        // Refresh the screens
        setState(() {
          _residentsRefreshKey++;
          _dashboardRefreshKey++;
        });
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
      }
      
      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'RBI - $_municipalityName',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [],
      ),
      body: SafeArea(
        child: _screens[_currentIndex],
      ),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _currentIndex,
        onTap: (index) {
          if (mounted) {
          setState(() {
            _currentIndex = index;
          });
          }
        },
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondary,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(AppIcons.barChart),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(AppIcons.users),
            label: 'Residents',
          ),
          BottomNavigationBarItem(
            icon: Icon(AppIcons.household),
            label: 'Households',
          ),
          BottomNavigationBarItem(
            icon: Icon(AppIcons.pet),
            label: 'Pets',
          ),
          BottomNavigationBarItem(
            icon: Icon(AppIcons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

class DashboardTab extends StatefulWidget {
  final VoidCallback? onAddResident;
  final VoidCallback? onAddHousehold;
  
  const DashboardTab({
    super.key,
    this.onAddResident,
    this.onAddHousehold,
  });

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  Map<String, dynamic> _stats = {
    'total_residents': 0,
    'total_households': 0,
    'pending_sync_residents': 0,
    'pending_sync_households': 0,
  };
  bool _isLoading = true;
  String _currentDateTime = '';
  Timer? _timer;
  int? _barangayId;

  @override
  void initState() {
    super.initState();
    _loadBarangayIdAndStats();
    _updateDateTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _updateDateTime();
    });
  }

  Future<void> _loadBarangayIdAndStats() async {
    final barangayId = await _offlineAuth.getBarangayId();
    if (mounted) {
      setState(() {
        _barangayId = barangayId;
      });
      _loadStats();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _updateDateTime() {
    final now = DateTime.now();
    if (mounted) {
    setState(() {
      _currentDateTime = '${(now.month).toString().padLeft(2, '0')}/${now.day.toString().padLeft(2, '0')}/${now.year} ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    });
    }
  }

  Future<void> _loadStats() async {
    try {
      final stats = await DatabaseService().getDatabaseStats(barangayId: _barangayId);
      if (mounted) {
      setState(() {
        _stats = stats;
        _isLoading = false;
      });
      }
    } catch (e) {
      if (mounted) {
      setState(() {
        _isLoading = false;
      });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Dashboard',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.primary,
                      AppColors.primary.withOpacity(0.8),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(25),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.3),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    ),
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 5,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.access_time,
                        color: Colors.white,
                        size: 14,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _currentDateTime,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // Quick Stats
          Row(
            children: [
              Expanded(
                child: _buildCombinedStatCard(
                  'Residents',
                  _isLoading ? '...' : '${_stats['total_residents'] ?? 0}',
                  _isLoading ? '...' : '${_stats['pending_sync_residents'] ?? 0}',
                  AppIcons.users,
                  AppColors.residentOrange,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _buildCombinedStatCard(
                  'Households',
                  _isLoading ? '...' : '${_stats['total_households'] ?? 0}',
                  _isLoading ? '...' : '${_stats['pending_sync_households'] ?? 0}',
                  AppIcons.household,
                  AppColors.householdPurple,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          
          // Quick Actions
          const Text(
            'Quick Actions',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            children: [
              _buildActionCard(
                'Add Resident',
                AppIcons.plus,
                Colors.purple,
                () async {
                  final result = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const AddResidentScreen(),
                    ),
                  );
                  if (result == true && mounted) {
                    // Refresh the residents tab and dashboard
                    widget.onAddResident?.call();
                  }
                },
              ),
              _buildActionCard(
                'Add Household',
                AppIcons.household,
                AppColors.householdPurple,
                () async {
                  final result = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const HouseholdForm(),
                    ),
                  );
                  if (result == true && mounted) {
                    // Refresh the households tab and dashboard
                    widget.onAddHousehold?.call();
                  }
                },
              ),
              _buildActionCard(
                'Add Pet',
                AppIcons.pet,
                AppColors.success,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const PetFormScreen(),
                  ),
                ),
              ),
              _buildActionCard(
                'Geographical Map',
                Icons.map,
                Colors.blue,
                () async {
                  // Navigate to offline map screen (it will fetch barangay ID from secure storage)
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const OfflineMapScreen(),
                    ),
                  );
                },
              ),
              _buildActionCard(
                'Add Purok',
                Icons.location_city,
                Colors.green,
                _showAddPurokDialog,
              ),
              _buildActionCard(
                'Add Classification',
                Icons.category,
                Colors.orange,
                _showAddClassificationDialog,
              ),
              _buildActionCard(
                'View Reports',
                AppIcons.barChart,
                AppColors.info,
                () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const ReportsScreen(),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }


  Widget _buildCombinedStatCard(String title, String syncedValue, String pendingValue, IconData icon, Color color) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Icon(
              icon,
              size: 40,
              color: color,
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                Column(
                  children: [
                    Text(
                      syncedValue,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const Text(
                      'Synced',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                Container(
                  width: 1,
                  height: 40,
                  color: Colors.grey[300],
                ),
                Column(
                  children: [
                    Text(
                      pendingValue,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.orange,
                      ),
                    ),
                    const Text(
                      'Pending',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard(String title, IconData icon, Color color, VoidCallback onTap) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 40,
                color: color,
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showAddPurokDialog() async {
    final nameController = TextEditingController();
    final leaderController = TextEditingController();
    final descriptionController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    // Get barangay ID from secure storage
    final userData = await _offlineAuth.getCurrentUser();
    final barangayId = userData?.targetId;

    if (barangayId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to load barangay information'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            margin: EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
      return;
    }

    if (!mounted) return;

    return showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Add Purok'),
          content: Form(
            key: formKey,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Purok Name *',
                      hintText: 'e.g., Purok 1',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Purok name is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: leaderController,
                    decoration: const InputDecoration(
                      labelText: 'Leader',
                      hintText: 'e.g., Juan Dela Cruz',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      hintText: 'Optional description',
                      border: OutlineInputBorder(),
                    ),
                    maxLines: 3,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  Navigator.of(dialogContext).pop();
                  
                  final purokData = {
                    'barangay_id': barangayId,
                    'name': nameController.text.trim(),
                    'leader': leaderController.text.trim(),
                    'description': descriptionController.text.trim(),
                  };

                  await _createPurok(purokData);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text('Add'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _createPurok(Map<String, dynamic> purokData) async {
    try {
      final dbHelper = DatabaseHelper.instance;
      await dbHelper.insertPurok(purokData);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Purok created successfully'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            margin: EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error creating purok: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
    }
  }

  Future<void> _showAddClassificationDialog() async {
    // Get municipality ID from secure storage
    final userData = await _offlineAuth.getCurrentUser();
    int? municipalityId;

    if (userData?.targetType == 'municipality') {
      municipalityId = userData?.targetId;
    } else if (userData?.targetType == 'barangay') {
      // Get municipality ID from barangay data
      final barangayId = userData?.targetId;
      if (barangayId != null) {
        try {
          final dbHelper = DatabaseHelper.instance;
          final db = await dbHelper.database;
          final barangays = await db.query(
            'barangays',
            where: 'id = ?',
            whereArgs: [barangayId],
          );
          if (barangays.isNotEmpty) {
            municipalityId = barangays.first['municipality_id'] as int?;
          }
        } catch (e) {
          print('❌ Error getting municipality ID: $e');
        }
      }
    }

    if (municipalityId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to load municipality information'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            margin: EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
      return;
    }

    if (!mounted) return;

    // Full classification dialog with color picker and dynamic fields
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    Color selectedColor = const Color(0xFF4CAF50); // Default green
    bool isActive = true;
    List<Map<String, dynamic>> details = [];
    final formKey = GlobalKey<FormState>();

    return showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return Dialog(
              child: Container(
                width: MediaQuery.of(context).size.width * 0.95,
                height: MediaQuery.of(context).size.height * 0.9,
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    // Header
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Add Classification',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                    const Divider(),
                    
                    // Content
                    Expanded(
                      child: Form(
                        key: formKey,
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              TextFormField(
                                controller: nameController,
                                decoration: const InputDecoration(
                                  labelText: 'Classification Name *',
                                  hintText: 'e.g., Senior Citizen',
                                  border: OutlineInputBorder(),
                                ),
                                validator: (value) {
                                  if (value == null || value.trim().isEmpty) {
                                    return 'Classification name is required';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 16),
                              TextFormField(
                                controller: descriptionController,
                                decoration: const InputDecoration(
                                  labelText: 'Description',
                                  hintText: 'Optional description',
                                  border: OutlineInputBorder(),
                                ),
                                maxLines: 3,
                              ),
                              const SizedBox(height: 16),
                              
                              // Color Picker
                              InkWell(
                                onTap: () {
                                  showDialog(
                                    context: context,
                                    builder: (BuildContext colorPickerContext) {
                                      return AlertDialog(
                                        title: const Text('Pick a color'),
                                        content: SingleChildScrollView(
                                          child: ColorPicker(
                                            pickerColor: selectedColor,
                                            onColorChanged: (Color color) {
                                              setDialogState(() {
                                                selectedColor = color;
                                              });
                                            },
                                            pickerAreaHeightPercent: 0.8,
                                          ),
                                        ),
                                        actions: <Widget>[
                                          TextButton(
                                            child: const Text('Done'),
                                            onPressed: () {
                                              Navigator.of(colorPickerContext).pop();
                                            },
                                          ),
                                        ],
                                      );
                                    },
                                  );
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    border: Border.all(color: Colors.grey),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Row(
                                    children: [
                                      const Text('Color: '),
                                      const SizedBox(width: 8),
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: selectedColor,
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(color: Colors.grey[300]!),
                                        ),
                                      ),
                                      const Spacer(),
                                      const Icon(Icons.edit, size: 20),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
                              
                              // Active Status Switch
                              SwitchListTile(
                                title: const Text('Active'),
                                subtitle: const Text('Toggle classification availability'),
                                value: isActive,
                                onChanged: (bool value) {
                                  setDialogState(() {
                                    isActive = value;
                                  });
                                },
                                contentPadding: EdgeInsets.zero,
                              ),
                              const SizedBox(height: 24),
                              const Divider(),
                              const SizedBox(height: 16),
                              
                              // Dynamic Fields Editor
                              ClassificationDetailsEditor(
                                details: details,
                                onChanged: (newDetails) {
                                  setDialogState(() {
                                    details = newDetails;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    
                    // Footer
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () async {
                            if (formKey.currentState!.validate()) {
                              Navigator.of(context).pop();
                              
                              final colorHex = '#${selectedColor.value.toRadixString(16).substring(2, 8).toUpperCase()}';
                              
                              final classificationData = {
                                'municipality_id': municipalityId,
                                'name': nameController.text.trim(),
                                'description': descriptionController.text.trim(),
                                'color': colorHex,
                                'details': jsonEncode(details),
                                'is_active': isActive ? 1 : 0,
                              };

                              await _createClassification(classificationData);
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('Create'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _createClassification(Map<String, dynamic> classificationData) async {
    try {
      final dbHelper = DatabaseHelper.instance;
      await dbHelper.insertClassificationType(classificationData);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Classification created successfully'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            margin: EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error creating classification: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
    }
  }
}

class ResidentsTab extends StatefulWidget {
  const ResidentsTab({super.key});

  @override
  State<ResidentsTab> createState() => _ResidentsTabState();
}

class _ResidentsTabState extends State<ResidentsTab> {
  final DatabaseService _databaseService = DatabaseService();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  
  List<Resident> _residents = [];
  bool _isLoading = false;
  bool _hasMoreData = true;
  int _currentOffset = 0;
  final int _pageSize = 20;
  String? _statusFilter;
  String _searchQuery = '';
  int? _barangayId;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadBarangayId();
  }
  
  Future<void> _loadBarangayId() async {
    final barangayId = await _offlineAuth.getBarangayId();
    if (mounted) {
      setState(() {
        _barangayId = barangayId;
      });
      _loadResidents();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMoreResidents();
    }
  }

  Future<void> _loadResidents({bool refresh = false}) async {
    if (_isLoading) return;
    
    if (mounted) {
    setState(() {
      _isLoading = true;
      if (refresh) {
        _residents.clear();
        _currentOffset = 0;
        _hasMoreData = true;
      }
    });
    }

    try {
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      final newResidents = await _databaseService.residentRepository.getPaginated(
        limit: _pageSize,
        offset: _currentOffset,
        searchQuery: _searchQuery.isNotEmpty ? _searchQuery : null,
        statusFilter: _statusFilter,
        syncStatusFilter: 'pending', // Only show pending (non-synced) residents
        barangayId: _barangayId, // Filter by logged-in user's barangay
      );

      if (mounted) {
      setState(() {
        if (refresh) {
          _residents = newResidents;
        } else {
          _residents.addAll(newResidents);
        }
        _currentOffset += _pageSize;
        _hasMoreData = newResidents.length == _pageSize;
        _isLoading = false;
      });
      }
    } catch (e) {
      if (mounted) {
      setState(() {
        _isLoading = false;
      });
      }
      _showErrorSnackBar('Error loading residents: $e');
    }
  }

  Future<void> _loadMoreResidents() async {
    if (!_hasMoreData || _isLoading) return;
    await _loadResidents();
  }

  Future<void> _refreshResidents() async {
    await _loadResidents(refresh: true);
  }

  void _onSearchChanged(String query) {
    if (mounted) {
    setState(() {
      _searchQuery = query;
    });
    }
    _loadResidents(refresh: true);
  }

  void _onStatusFilterChanged(String? status) {
    if (mounted) {
    setState(() {
      _statusFilter = status;
    });
    }
    _loadResidents(refresh: true);
  }

  Future<void> _deleteResident(Resident resident) async {
    final confirmed = await _showDeleteConfirmation(resident);
    if (!confirmed) return;

    try {
      final success = await _databaseService.residentRepository.delete(resident.id ?? '');
      if (success) {
        if (mounted) {
        setState(() {
          _residents.removeWhere((r) => r.id == resident.id);
        });
        }
        _showSuccessSnackBar('Resident deleted successfully');
      } else {
        _showErrorSnackBar('Failed to delete resident');
      }
    } catch (e) {
      _showErrorSnackBar('Error deleting resident: $e');
    }
  }

  Future<void> _updateResident(Resident resident) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddResidentScreen(
          residentToEdit: resident,
        ),
      ),
    );

    if (result == true) {
      _refreshResidents();
    }
  }

  void _viewResidentJson(Resident resident) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ResidentJsonViewScreen(
          resident: resident,
        ),
      ),
    );
  }

  Future<bool> _showDeleteConfirmation(Resident resident) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Resident'),
        content: Text('Are you sure you want to delete ${resident.fullName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    ) ?? false;
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Add Resident Button at the top
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton.icon(
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const AddResidentScreen(),
                ),
              );
              if (result == true) {
                _refreshResidents();
              }
            },
            icon: const Icon(Icons.add),
            label: const Text('Add New Resident'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
        // Search and Filter Section
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          color: Colors.grey[100],
          child: Column(
            children: [
              // Search Bar
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search residents...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                            _onSearchChanged('');
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8.0),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                ),
                onChanged: _onSearchChanged,
              ),
              const SizedBox(height: 12),
              // Status Filter
              DropdownButtonFormField<String>(
                      value: _statusFilter,
                      decoration: const InputDecoration(
                  labelText: 'Status',
                        border: OutlineInputBorder(),
                  filled: true,
                  fillColor: Colors.white,
                      ),
                      items: const [
                  DropdownMenuItem(value: null, child: Text('All Status')),
                        DropdownMenuItem(value: 'active', child: Text('Active')),
                        DropdownMenuItem(value: 'temporarily_away', child: Text('Temporarily Away')),
                        DropdownMenuItem(value: 'deceased', child: Text('Deceased')),
                        DropdownMenuItem(value: 'moved_out', child: Text('Moved Out')),
                      ],
                      onChanged: _onStatusFilterChanged,
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
        // Residents List
        Expanded(
          child: _residents.isEmpty && !_isLoading
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'No pending residents',
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'All residents have been synced or add new residents using the button above',
                        style: TextStyle(color: Colors.grey),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _refreshResidents,
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16.0),
                    itemCount: _residents.length + (_hasMoreData ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _residents.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16.0),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      final resident = _residents[index];
                      return _buildResidentCard(resident);
                    },
                  ),
                ),
        ),
      ],
    );
  }

  Widget _buildResidentCard(Resident resident) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      elevation: 2,
      child: InkWell(
        onTap: () => _viewResidentJson(resident),
        borderRadius: BorderRadius.circular(8.0),
        child: ListTile(
          contentPadding: const EdgeInsets.all(16.0),
          leading: CircleAvatar(
            radius: 24,
            backgroundColor: _getStatusColor(resident.residentStatus),
            child: Text(
              resident.fullName.split(' ').map((e) => e[0]).take(2).join('').toUpperCase(),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
          title: Text(
            resident.fullName,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text('${resident.sex} • ${_formatCivilStatus(resident.civilStatus)}'),
              Text('Status: ${_formatStatus(resident.residentStatus)}'),
            ],
          ),
          trailing: PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'edit':
                  _updateResident(resident);
                  break;
                case 'delete':
                  _deleteResident(resident);
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit_outlined, color: Colors.blue),
                    SizedBox(width: 8),
                    Text('Edit'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete_outline, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Delete'),
                  ],
                ),
              ),
            ],
          ),
          isThreeLine: true,
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'active':
        return Colors.green;
      case 'temporarily_away':
        return Colors.orange;
      case 'deceased':
        return Colors.red;
      case 'moved_out':
        return Colors.grey;
      default:
        return Colors.blue;
    }
  }

  String _formatCivilStatus(String status) {
    switch (status) {
      case 'single':
        return 'Single';
      case 'married':
        return 'Married';
      case 'live_in':
        return 'Live in';
      case 'widowed':
        return 'Widowed';
      case 'separated':
        return 'Separated';
      case 'divorced':
        return 'Divorced';
      default:
        return status;
    }
  }

  String _formatStatus(String status) {
    switch (status) {
      case 'active':
        return 'Active';
      case 'temporarily_away':
        return 'Temporarily Away';
      case 'deceased':
        return 'Deceased';
      case 'moved_out':
        return 'Moved Out';
      default:
        return status;
    }
  }
}

class HouseholdsTab extends StatelessWidget {
  const HouseholdsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const HouseholdListScreen();
  }
}

class PetsTab extends StatelessWidget {
  const PetsTab({super.key});

  @override
  Widget build(BuildContext context) {
    return const PetsListScreen();
  }
}

class SettingsTab extends StatefulWidget {
  const SettingsTab({super.key});

  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  // final DatabaseService _databaseService = DatabaseService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  final ExcelExportService _excelExportService = ExcelExportService();
  
  // User data will be loaded from offline storage
  String _userName = 'Loading...';
  String _userRole = 'Loading...';
  String _userEmail = 'Loading...';
  String _barangayName = 'Loading...';
  String _municipalityName = 'Loading...';
  String _provinceName = 'Loading...';
  
  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) {
      return 'Good Morning';
    } else if (hour < 17) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  }

  String get _currentTime {
    return '${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year} - ${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}';
  }

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    try {
      final userData = await _offlineAuth.getCurrentUser();
      if (mounted) {
      if (userData != null) {
        setState(() {
          _userName = userData.name;
          _userRole = userData.role ?? 'User';
          _userEmail = userData.email;
          _barangayName = userData.barangayName ?? 'Unknown Barangay';
          _municipalityName = userData.municipalityName ?? 'Unknown Municipality';
          _provinceName = userData.provinceName ?? 'Unknown Province';
        });
      } else {
        setState(() {
          _userName = 'Not Logged In';
          _userRole = 'Guest';
          _userEmail = 'No email';
        });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _userName = 'Error Loading Data';
          _userRole = 'Error';
          _userEmail = 'Error';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Profile Section
            _buildUserProfileSection(),
            
            const SizedBox(height: 24),
            
            // Settings Options
            _buildSettingsSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildUserProfileSection() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Greeting and Time
          Text(
            '$_greeting,',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w300,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _userName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _currentTime,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          
          const SizedBox(height: 16),
          
          // User Details
          Container(
            padding: const EdgeInsets.all(12.0),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              children: [
                _buildUserDetailRow(Icons.work, 'Role', _userRole),
                const SizedBox(height: 8),
                _buildUserDetailRow(Icons.email, 'Email', _userEmail),
                const SizedBox(height: 8),
                _buildUserDetailRow(Icons.location_city, 'Barangay', _barangayName),
                const SizedBox(height: 8),
                _buildUserDetailRow(Icons.location_on, 'Municipal', _municipalityName),
                const SizedBox(height: 8),
                _buildUserDetailRow(Icons.public, 'Province', _provinceName),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserDetailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: Colors.white70, size: 16),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Settings',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 16),
        
        // Export Data
        _buildSettingsCard(
          icon: Icons.file_download,
          title: 'Export Data',
          subtitle: 'Download residents and households data as Excel file',
          color: Colors.green,
          onTap: _exportDataToExcel,
        ),
        
        const SizedBox(height: 12),
        
        // Sync Data
        _buildSettingsCard(
          icon: Icons.sync,
          title: 'Sync Data',
          subtitle: 'Upload offline data to server',
          color: Colors.blue,
          onTap: _navigateToSyncData,
        ),
        
        // const SizedBox(height: 12),
        
        // // Delete All Data
        // _buildSettingsCard(
        //   icon: Icons.delete_forever,
        //   title: 'Delete All Data',
        //   subtitle: 'Clear all local data (irreversible)',
        //   color: Colors.red,
        //   onTap: () => _showDeleteAllDataDialog(),
        // ),
        
        const SizedBox(height: 12),
        
        // Update Purok
        _buildSettingsCard(
          icon: Icons.location_city,
          title: 'Manage Purok',
          subtitle: 'Manage purok information',
          color: Colors.green,
          onTap: _showUpdatePurokDialog,
        ),
        
        const SizedBox(height: 12),
        
        // Update Classification
        _buildSettingsCard(
          icon: Icons.category,
          title: 'Manage Classification',
          subtitle: 'Manage resident classifications',
          color: Colors.orange,
          onTap: _showUpdateClassificationDialog,
        ),
        
        const SizedBox(height: 12),
        
        // Logout
        _buildSettingsCard(
          icon: Icons.logout,
          title: 'Logout',
          subtitle: 'Clear login data and return to login screen',
          color: Colors.red,
          onTap: _showLogoutDialog,
        ),
      ],
    );
  }

  Widget _buildSettingsCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.1),
          child: Icon(icon, color: color),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }

  void _navigateToSyncData() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const SyncDataScreen(),
      ),
    );
  }

  Future<void> _exportDataToExcel() async {
    try {
      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (BuildContext context) {
          return const AlertDialog(
            content: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(width: 16),
                Expanded(
                  child: Text('Exporting data...'),
                ),
              ],
            ),
          );
        },
      );

      // Export data to Excel
      final result = await _excelExportService.exportDataToExcel();
      final filePath = result['excelPath'];
      final dbBackupPath = result['dbBackupPath'];

      // Close loading dialog
      Navigator.of(context).pop();

      // Show success dialog with file details
      if (mounted && filePath != null) {
        _showExportSuccessDialog(filePath, dbBackupPath: dbBackupPath);
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Export failed: Unable to create file'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
            margin: EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
    } catch (e) {
      // Close loading dialog
      Navigator.of(context).pop();

      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Export failed: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
          ),
        );
      }
    }
  }

  void _showExportSuccessDialog(String filePath, {String? dbBackupPath}) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        final fileName = filePath.split('/').last;
        final fileSize = _excelExportService.getFileSize(filePath);
        final locationDescription = _excelExportService.getLocationDescription(filePath);
        
        String? dbFileName;
        String? dbFileSize;
        if (dbBackupPath != null) {
          dbFileName = dbBackupPath.split('/').last;
          dbFileSize = _excelExportService.getFileSize(dbBackupPath);
        }
        
        return AlertDialog(
          title: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green),
              const SizedBox(width: 8),
              const Text('Export Successful'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Data has been exported successfully!',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Export includes:',
                style: TextStyle(fontSize: 14, color: Colors.grey[800], fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 4),
              Text(
                '📊 Excel file with 3 sheets (filtered by your barangay):',
                style: TextStyle(fontSize: 13, color: Colors.grey[800], fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 2),
              Text(
                '  • Residents with photos and complete data',
                style: TextStyle(fontSize: 12, color: Colors.grey[700]),
              ),
              Text(
                '  • Households with photos and family details',
                style: TextStyle(fontSize: 12, color: Colors.grey[700]),
              ),
              Text(
                '  • Pets with photos and owner information',
                style: TextStyle(fontSize: 12, color: Colors.grey[700]),
              ),
              const SizedBox(height: 6),
              if (dbFileName != null) ...[
                Text(
                  '💾 Complete database backup (.db file)',
                  style: TextStyle(fontSize: 13, color: Colors.grey[800], fontWeight: FontWeight.w600),
                ),
              ] else ...[
                Text(
                  '⚠️ Database backup failed (check console logs)',
                  style: TextStyle(fontSize: 13, color: Colors.orange[700], fontWeight: FontWeight.w600),
                ),
              ],
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('📁 Excel File: $fileName'),
                    const SizedBox(height: 4),
                    Text('📏 Excel Size: $fileSize'),
                    const SizedBox(height: 4),
                    if (dbFileName != null) ...[
                      Text('💾 Database Backup: $dbFileName'),
                      const SizedBox(height: 4),
                      if (dbFileSize != null)
                        Text('📏 Database Size: $dbFileSize'),
                      const SizedBox(height: 4),
                    ],
                    Text('📂 Location: $locationDescription'),
                    const SizedBox(height: 8),
                Text(
                  dbFileName != null
                      ? '💡 Tip: The Excel file contains data from your barangay with embedded photos. The .db file is a complete database backup that can be used for recovery or migration.'
                      : '💡 Tip: The Excel file contains data from your barangay with embedded photos.',
                  style: TextStyle(fontSize: 12, color: Colors.blue[600]),
                ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }

  // Future<void> _showDeleteAllDataDialog() async {
  //   // Check if there are any pending residents before allowing data deletion
  //   try {
  //     if (!_databaseService.isInitialized) {
  //       await _databaseService.initialize();
  //     }
      
  //     final pendingResidents = await _databaseService.residentRepository.getPendingSync();
      
  //     if (pendingResidents.isNotEmpty) {
  //       _showPendingResidentsWarningDialogForDelete(pendingResidents.length);
  //       return;
  //     }
      
  //     // If no pending residents, show the delete confirmation dialog
  //     if (mounted) {
  //       showDialog(
  //         context: context,
  //         builder: (BuildContext context) {
  //           return AlertDialog(
  //             title: const Text('Delete All Data'),
  //             content: const Text('This action will permanently delete all local data including residents, households, and families. This cannot be undone.'),
  //             actions: [
  //               TextButton(
  //                 onPressed: () => Navigator.of(context).pop(),
  //                 child: const Text('Cancel'),
  //               ),
  //               ElevatedButton(
  //                 onPressed: () {
  //                   Navigator.of(context).pop();
  //                   _performDeleteAllData();
  //                 },
  //                 style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
  //                 child: const Text('Delete All'),
  //               ),
  //             ],
  //           );
  //         },
  //       );
  //     }
  //   } catch (e) {
  //     if (mounted) {
  //       ScaffoldMessenger.of(context).showSnackBar(
  //         SnackBar(
  //           content: Text('Error checking resident status: $e'),
  //           backgroundColor: Colors.red,
  //         ),
  //       );
  //     }
  //   }
  // }

  // void _showPendingResidentsWarningDialogForDelete(int pendingCount) {
  //   showDialog(
  //     context: context,
  //     builder: (BuildContext context) {
  //       return AlertDialog(
  //         title: Row(
  //           children: [
  //             Icon(Icons.warning, color: Colors.orange[700]),
  //             const SizedBox(width: 8),
  //             const Text('Sync Residents First'),
  //           ],
  //         ),
  //         content: Column(
  //           mainAxisSize: MainAxisSize.min,
  //           crossAxisAlignment: CrossAxisAlignment.start,
  //           children: [
  //             Text(
  //               'You have $pendingCount pending resident(s) that need to be synced before you can delete all data.',
  //               style: const TextStyle(fontSize: 16),
  //             ),
  //             const SizedBox(height: 16),
  //             const Text(
  //               'Please sync all residents first to ensure data integrity before deletion, or delete manually if the pending residents are not needed.',
  //               style: TextStyle(
  //                 fontSize: 14,
  //                 color: Colors.grey,
  //               ),
  //             ),
  //           ],
  //         ),
  //         actions: [
  //           TextButton(
  //             onPressed: () => Navigator.of(context).pop(),
  //             child: const Text('Cancel'),
  //           ),
  //           ElevatedButton(
  //             onPressed: () {
  //               Navigator.of(context).pop();
  //               _navigateToSyncData();
  //             },
  //             style: ElevatedButton.styleFrom(
  //               backgroundColor: AppColors.primary,
  //               foregroundColor: Colors.white,
  //             ),
  //             child: const Text('Sync Residents'),
  //           ),
  //         ],
  //       );
  //     },
  //   );
  // }

  void _showUpdatePurokDialog() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const PurokManagementScreen(),
      ),
    );
  }

  void _showUpdateClassificationDialog() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const ClassificationManagementScreen(),
      ),
    );
  }



  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Logout'),
          content: const Text(
            'Are you sure you want to logout? This will clear all your login data and return you to the login screen.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                try {
                  // Clear all authentication data using AppProvider
                  final appProvider = Provider.of<AppProvider>(context, listen: false);
                  await appProvider.logout();
                  
                  // Close the dialog and navigate in one go
                  Navigator.of(context).pop();
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (context) => const LoginScreen()),
                    (route) => false,
                  );
                  
                } catch (e) {
                  // Even if logout fails, try to navigate to login screen
                  Navigator.of(context).pop();
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (context) => const LoginScreen()),
                    (route) => false,
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Logout'),
            ),
          ],
        );
      },
    );
  }


  // Future<void> _performDeleteAllData() async {
  //   try {
  //     // Show loading dialog
  //     showDialog(
  //       context: context,
  //       barrierDismissible: false,
  //       builder: (BuildContext context) {
  //         return const AlertDialog(
  //           content: Row(
  //             children: [
  //               CircularProgressIndicator(),
  //               SizedBox(width: 16),
  //               Text('Deleting all data...'),
  //             ],
  //           ),
  //         );
  //       },
  //     );

  //     // Ensure database service is initialized
  //     if (!_databaseService.isInitialized) {
  //       await _databaseService.initialize();
  //     }

  //     // Clear all data
  //     await _databaseService.clearAllData();

  //     // Close loading dialog
  //     Navigator.of(context).pop();

  //     // Show success message
  //     ScaffoldMessenger.of(context).showSnackBar(
  //       const SnackBar(
  //         content: Text('All data deleted successfully!'),
  //         backgroundColor: Colors.green,
  //       ),
  //     );
  //   } catch (e) {
  //     // Close loading dialog if still open
  //     Navigator.of(context).pop();
      
  //     ScaffoldMessenger.of(context).showSnackBar(
  //       SnackBar(
  //         content: Text('Delete failed: $e'),
  //         backgroundColor: Colors.red,
  //       ),
  //     );
  //   }
  // }


}

