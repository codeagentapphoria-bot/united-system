import 'package:flutter/material.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../core/services/sync_coordinator_service.dart';
import '../../core/services/email_service.dart';
import '../../core/services/database_service.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../data/models/resident.dart';
import '../../data/models/household.dart';
import '../../data/models/pet.dart';
import '../../utils/toast_helper.dart';
import 'login_screen.dart';
import 'resident_json_view_screen.dart';
import 'household_details_screen.dart';
import 'pet_details_screen.dart';

class SyncDataScreen extends StatefulWidget {
  const SyncDataScreen({super.key});

  @override
  State<SyncDataScreen> createState() => _SyncDataScreenState();
}

class _SyncDataScreenState extends State<SyncDataScreen> with SingleTickerProviderStateMixin {
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  final SyncCoordinatorService _syncCoordinator = SyncCoordinatorService();
  final EmailService _emailService = EmailService();
  final DatabaseService _databaseService = DatabaseService();
  
  bool _isSyncing = false;
  Map<String, int>? _syncStatus;
  late TabController _tabController;
  
  // Data lists
  List<Resident> _residents = [];
  List<Household> _households = [];
  List<Pet> _pets = [];
  bool _isLoadingData = false;
  int? _barangayId;
  
  // Name mappings for display
  Map<String, String> _residentNames = {}; // residentId -> fullName

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _checkLoginStatus();
    _loadSyncStatus();
    _loadBarangayIdAndData();
  }
  
  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
  
  Future<void> _loadBarangayIdAndData() async {
    final barangayId = await _offlineAuth.getBarangayId();
    if (mounted) {
      setState(() {
        _barangayId = barangayId;
      });
      _loadAllData();
    }
  }
  
  Future<void> _loadAllData() async {
    setState(() {
      _isLoadingData = true;
    });
    
    try {
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }
      
      final residents = await _databaseService.residentRepository.getAll(barangayId: _barangayId);
      final households = await _databaseService.householdRepository.getAll(barangayId: _barangayId);
      final pets = await _databaseService.petsRepository.getAll();
      
      // Build resident names map for quick lookup
      final Map<String, String> residentNames = {};
      for (final resident in residents) {
        if (resident.id != null) {
          residentNames[resident.id!] = resident.fullName;
        }
      }
      
      if (mounted) {
        setState(() {
          _residents = residents;
          _households = households;
          _pets = pets;
          _residentNames = residentNames;
          _isLoadingData = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading data: $e');
      if (mounted) {
        setState(() {
          _isLoadingData = false;
        });
      }
    }
  }
  
  Future<void> _loadSyncStatus() async {
    try {
      final status = await _syncCoordinator.getSyncStatus();
      if (mounted) {
        setState(() {
          _syncStatus = status;
        });
      }
    } catch (e) {
      debugPrint('Error loading sync status: $e');
    }
  }
  
  Future<void> _syncAll() async {
    if (_isSyncing) return;
    
    setState(() {
      _isSyncing = true;
    });
    
    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Syncing all data...'),
            SizedBox(height: 8),
            Text(
              'Puroks → Classifications → Residents → Households',
              style: TextStyle(fontSize: 12, color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
    
    try {
      final results = await _syncCoordinator.syncAll();
      
      // Close loading dialog
      if (mounted) Navigator.of(context).pop();
      
      // Show results dialog
      if (mounted) {
        _showSyncResultsDialog(results);
      }
      
      // Refresh sync status and data lists
      await _loadSyncStatus();
      await _loadAllData(); // Reload lists to show updated sync statuses
      
      // Check if sync was successful and send email
      final totalSynced = (results['puroks_synced'] as int) +
          (results['classifications_synced'] as int) +
          (results['residents_synced'] as int) +
          (results['households_synced'] as int);
      
      if (totalSynced > 0) {
        print('✅ Sync successful - Sending email automatically...\n');
        await _sendEmail();
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) Navigator.of(context).pop();
      
      // Show detailed error with toast
      if (mounted) {
        print('❌ SYNC ERROR: $e');
        ToastHelper.showSyncError(context, 'Comprehensive Sync', e.toString());
        _showErrorSnackBar('Sync failed: $e');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSyncing = false;
        });
      }
    }
  }
  
  void _showSyncResultsDialog(Map<String, dynamic> results) {
    final hasErrors = (results['errors'] as List).isNotEmpty;
    final totalSynced = (results['puroks_synced'] as int) +
        (results['classifications_synced'] as int) +
        (results['residents_synced'] as int) +
        (results['households_synced'] as int);
    final totalFailed = (results['puroks_failed'] as int) +
        (results['classifications_failed'] as int) +
        (results['residents_failed'] as int) +
        (results['households_failed'] as int);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              hasErrors || totalFailed > 0 ? Icons.warning : Icons.check_circle,
              color: hasErrors || totalFailed > 0 ? Colors.orange : Colors.green,
            ),
            const SizedBox(width: 8),
            const Text('Sync Complete'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Synced: $totalSynced items',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Colors.green,
                ),
              ),
              if (totalFailed > 0)
                Text(
                  'Failed: $totalFailed items',
                  style: const TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              _buildResultRow('Puroks', results['puroks_synced'], results['puroks_failed']),
              _buildResultRow('Classifications', results['classifications_synced'], results['classifications_failed']),
              _buildResultRow('Residents', results['residents_synced'], results['residents_failed']),
              _buildResultRow('Households', results['households_synced'], results['households_failed']),
              
              if ((results['errors'] as List).isNotEmpty) ...[
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),
                Text(
                  'Errors (${(results['errors'] as List).length}):',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.red,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 8),
                ...(results['errors'] as List).take(5).map((error) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    '• $error',
                    style: const TextStyle(fontSize: 11, color: Colors.red),
                  ),
                )),
                if ((results['errors'] as List).length > 5)
                  Text(
                    '... and ${(results['errors'] as List).length - 5} more errors',
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildResultRow(String label, int synced, int failed) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13)),
          Row(
            children: [
              Text(
                '$synced',
                style: const TextStyle(color: Colors.green, fontWeight: FontWeight.w600),
              ),
              if (failed > 0) ...[
                const Text(' / ', style: TextStyle(color: Colors.grey)),
                Text(
                  '$failed',
                  style: const TextStyle(color: Colors.red, fontWeight: FontWeight.w600),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _checkLoginStatus() async {
    try {
      final isLoggedIn = await _offlineAuth.isLoggedIn();
      
      if (!isLoggedIn) {
        // Automatically navigate to login screen if not logged in
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const LoginScreen()),
          );
        });
      }
    } catch (e) {
      debugPrint('Error checking login status: $e');
      // Navigate to login on error as well
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const LoginScreen()),
        );
      });
    }
  }


  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sync Data'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(AppIcons.users), text: 'Residents'),
            Tab(icon: Icon(AppIcons.household), text: 'Households'),
            Tab(icon: Icon(AppIcons.pet), text: 'Pets'),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Sync Status and Button Section
            _buildSyncSection(),
            const Divider(height: 1),
            // Tab Views
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildResidentsList(),
                  _buildHouseholdsList(),
                  _buildPetsList(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSyncSection() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Sync Status Card
          if (_syncStatus != null) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.blue[50]!, Colors.purple[50]!],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.blue[200]!),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                      Icon(AppIcons.clock, color: Colors.blue[700]),
                    const SizedBox(width: 8),
                    Text(
                        'Pending Sync Items',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue[700],
                          fontSize: 16,
                      ),
                    ),
                  ],
                ),
                  const SizedBox(height: 12),
              _buildStatusRow('Puroks', _syncStatus!['pending_puroks'] ?? 0),
              _buildStatusRow('Classifications', _syncStatus!['pending_classifications'] ?? 0),
              _buildStatusRow('Residents', _syncStatus!['pending_residents'] ?? 0),
              _buildStatusRow('Households', _syncStatus!['pending_households'] ?? 0),
              _buildStatusRow('Pets', _syncStatus!['pending_pets'] ?? 0),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                const Text(
                        'Total Pending:',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: (_syncStatus!['total_pending'] ?? 0) > 0 ? Colors.orange : Colors.green,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${_syncStatus!['total_pending']}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                ),
              ],
            ),
            ),
          ],
          
          const SizedBox(height: 16),
          
          // Sync All Button
          if (_syncStatus != null && (_syncStatus!['total_pending'] ?? 0) > 0)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isSyncing ? null : _syncAll,
                icon: Icon(_isSyncing ? AppIcons.sync : AppIcons.upload),
                label: Text(_isSyncing ? 'Syncing...' : 'Start sync data'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
          ),
        ],
      ),
    );
  }

  Widget _buildResidentsList() {
    if (_isLoadingData) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (_residents.isEmpty) {
      return const Center(
        child: Text('No residents found'),
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _residents.length,
      itemBuilder: (context, index) {
        final resident = _residents[index];
        final isSynced = resident.syncStatus == 'synced';
        
    return Card(
          margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
              backgroundColor: isSynced ? Colors.green : Colors.orange,
              child: Icon(
                isSynced ? AppIcons.check : AppIcons.clock,
                color: Colors.white,
                size: 20,
              ),
            ),
            title: Text(resident.fullName),
            subtitle: Text('${resident.sex} • ${resident.civilStatus}'),
            trailing: const Icon(AppIcons.arrowForward, size: 16),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => ResidentJsonViewScreen(resident: resident),
              ),
            ),
          ),
        );
      },
    );
  }
  
  Widget _buildHouseholdsList() {
    if (_isLoadingData) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (_households.isEmpty) {
      return const Center(
        child: Text('No households found'),
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _households.length,
      itemBuilder: (context, index) {
        final household = _households[index];
        final isSynced = household.syncStatus == 'synced';
        
        final houseHeadName = _residentNames[household.houseHead] ?? 'Unknown';
        
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isSynced ? Colors.green : Colors.orange,
              child: Icon(
                isSynced ? AppIcons.check : AppIcons.clock,
                color: Colors.white,
                size: 20,
              ),
            ),
            title: Text('House Head: $houseHeadName'),
            subtitle: Text(household.street ?? 'No street'),
            trailing: const Icon(AppIcons.arrowForward, size: 16),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => HouseholdDetailsScreen(household: household),
              ),
            ),
          ),
        );
      },
    );
  }
  
  Widget _buildPetsList() {
    if (_isLoadingData) {
      return const Center(child: CircularProgressIndicator());
    }
    
    if (_pets.isEmpty) {
      return const Center(
        child: Text('No pets found'),
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _pets.length,
      itemBuilder: (context, index) {
        final pet = _pets[index];
        final isSynced = pet.syncStatus == 'synced';
        final ownerName = _residentNames[pet.ownerId] ?? 'Unknown';
        
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: isSynced ? Colors.green : Colors.orange,
              child: Icon(
                isSynced ? AppIcons.check : AppIcons.clock,
                color: Colors.white,
                size: 20,
              ),
            ),
            title: Text(pet.petName),
            subtitle: Text('${pet.species} • Owner: $ownerName'),
            trailing: const Icon(AppIcons.arrowForward, size: 16),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => PetDetailsScreen(pet: pet),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatusRow(String label, int count) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 14)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: count > 0 ? Colors.orange[100] : Colors.green[100],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: count > 0 ? Colors.orange[300]! : Colors.green[300]!,
              ),
            ),
            child: Text(
              '$count',
              style: TextStyle(
            fontWeight: FontWeight.bold,
                color: count > 0 ? Colors.orange[700] : Colors.green[700],
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _sendEmail() async {
    try {
      print('📧 Sending email silently in background...');
      
      // Export and send email in background (completely silent - no user notification)
      final success = await _emailService.exportAndSendEmail();

      if (success) {
        print('✅ Email sent successfully (silent - user not notified)');
      } else {
        print('⚠️ Email send failed (silent - user not notified)');
      }
    } catch (e) {
      print('❌ Error in _sendEmail (silent - user not notified): $e');
      // No user notification - completely silent for monitoring purposes
    }
  }

}