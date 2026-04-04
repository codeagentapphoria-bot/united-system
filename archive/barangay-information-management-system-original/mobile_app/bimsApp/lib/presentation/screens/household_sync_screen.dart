import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import '../../data/models/household.dart';
import '../../core/services/database_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../core/services/household_sync_service.dart';
import '../../core/constants/app_colors.dart';
import '../../utils/toast_helper.dart';
import 'login_screen.dart';
import 'household_details_screen.dart';

class HouseholdSyncScreen extends StatefulWidget {
  const HouseholdSyncScreen({super.key});

  @override
  State<HouseholdSyncScreen> createState() => _HouseholdSyncScreenState();
}

class _HouseholdSyncScreenState extends State<HouseholdSyncScreen> {
  final DatabaseService _databaseService = DatabaseService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  final HouseholdSyncService _syncService = HouseholdSyncService();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  
  List<Household> _households = [];
  List<Household> _filteredHouseholds = [];
  bool _isLoading = false;
  bool _isLoggedIn = false;
  bool _isSyncing = false;
  String? _syncStatusFilter;
  String _searchQuery = '';
  bool _showProgress = false;
  String _currentSyncHousehold = '';
  int _currentProgress = 0;
  int _totalProgress = 0;
  
  // Add sync cancellation support
  bool _isSyncCancelled = false;

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    // Cancel any ongoing sync operation
    _isSyncCancelled = true;
    super.dispose();
  }

  Future<void> _checkLoginStatus() async {
    try {
      final isLoggedIn = await _offlineAuth.isLoggedIn();
      setState(() {
        _isLoggedIn = isLoggedIn;
      });
      
      if (isLoggedIn) {
        _loadHouseholds();
      } else {
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

  Future<void> _loadHouseholds() async {
    if (!_isLoggedIn) return;
    
    setState(() {
      _isLoading = true;
    });

    try {
      // Ensure database service is initialized
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }
      
      // Get barangay ID and filter households
      final barangayId = await _offlineAuth.getBarangayId();
      final households = await _databaseService.householdRepository.getAll(barangayId: barangayId);
      setState(() {
        _households = households;
        _applyFilters();
      });
    } catch (e) {
      _showErrorSnackBar('Error loading households: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _applyFilters() {
    List<Household> filtered = _households;

    // Apply sync status filter
    if (_syncStatusFilter != null) {
      filtered = filtered.where((household) => household.syncStatus == _syncStatusFilter).toList();
    }

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((household) {
        final fullAddress = household.fullAddress.toLowerCase();
        return fullAddress.contains(_searchQuery.toLowerCase());
      }).toList();
    }

    setState(() {
      _filteredHouseholds = filtered;
    });
  }

  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
    });
    _applyFilters();
  }

  void _onSyncStatusFilterChanged(String? status) {
    setState(() {
      _syncStatusFilter = status;
    });
    _applyFilters();
  }

  void _clearFilters() {
    setState(() {
      _syncStatusFilter = null;
      _searchQuery = '';
      _searchController.clear();
    });
    _applyFilters();
  }

  void _viewHouseholdDetails(Household household) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => HouseholdDetailsScreen(
          household: household,
        ),
      ),
    );
  }

  Future<void> _startSync() async {
    setState(() {
      _isSyncing = true;
      _isSyncCancelled = false;
    });

    try {
      final pendingHouseholds = _households.where((h) => h.syncStatus == 'pending').toList();
      
      if (pendingHouseholds.isEmpty) {
        _showSuccessSnackBar('No pending households to sync');
        return;
      }

      int syncedCount = 0;
      int errorCount = 0;

      // Show progress dialog
      if (mounted) {
        _showProgressDialog(pendingHouseholds.length);
      }

      // Process each household
      for (int i = 0; i < pendingHouseholds.length && !_isSyncCancelled; i++) {
        if (!mounted) break;
        
        final household = pendingHouseholds[i];
        final currentIndex = i + 1;
        
        try {
          // Update progress
          if (mounted) {
            _updateProgressDialog(currentIndex, pendingHouseholds.length, household.fullAddress);
          }
          
          // Sync household to server
          final serverHouseholdId = await _syncService.syncHousehold(household);
          
          if (serverHouseholdId != null && household.id != null) {
            // Update local database with server ID and sync status
            await _databaseService.householdRepository.updateServerId(
              household.localId ?? household.id!, 
              int.tryParse(serverHouseholdId) ?? 0
            );
            
            await _databaseService.householdRepository.updateSyncStatus(
              household.id!, 
              'synced'
            );
            
            syncedCount++;
            debugPrint('✅ Successfully synced household ${household.fullAddress} with server ID: $serverHouseholdId');
          } else {
            errorCount++;
            debugPrint('❌ Failed to sync household ${household.fullAddress} - no server ID returned');
          }
        } catch (e) {
          debugPrint('❌ Error syncing household ${household.fullAddress}: $e');
          errorCount++;
        }
        
        // Check if sync was cancelled
        if (_isSyncCancelled) {
          debugPrint('🛑 Sync cancelled by user');
          break;
        }
      }

      // Close progress dialog
      if (mounted) {
        _closeProgressDialog();
      }

      // Reload households to reflect changes
      if (mounted) {
        await _loadHouseholds();
      }

      if (mounted) {
        if (_isSyncCancelled) {
          _showErrorSnackBar('Sync cancelled. Synced $syncedCount households before cancellation.');
        } else if (errorCount == 0) {
          _showSuccessSnackBar('Successfully synced $syncedCount households');
        } else {
          _showErrorSnackBar('Synced $syncedCount households, $errorCount failed');
        }
      }
    } catch (e) {
      if (mounted) {
        _closeProgressDialog();
        print('❌ HOUSEHOLD SYNC ERROR: $e');
        ToastHelper.showSyncError(context, 'Household Sync', e.toString());
        _showErrorSnackBar('Error during sync: $e');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSyncing = false;
        });
      }
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

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showProgressDialog(int totalHouseholds) {
    if (mounted) {
      setState(() {
        _showProgress = true;
        _totalProgress = totalHouseholds;
        _currentProgress = 0;
        _currentSyncHousehold = '';
      });
    }
  }

  void _updateProgressDialog(int current, int total, String householdAddress) {
    if (mounted) {
      setState(() {
        _currentProgress = current;
        _currentSyncHousehold = householdAddress;
      });
    }
  }

  void _closeProgressDialog() {
    if (mounted) {
      setState(() {
        _showProgress = false;
        _currentProgress = 0;
        _totalProgress = 0;
        _currentSyncHousehold = '';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sync Households'),
      ),
      body: SafeArea(
        child: Stack(
          children: [
            _buildContent(),
            if (_showProgress) _buildProgressDialog(),
        ],
      ),
      ), // Closes SafeArea
    );
  }

  Widget _buildContent() {
    return Column(
      children: [
        // Start Sync Button at the top
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton.icon(
            onPressed: _isSyncing ? null : _startSync,
            icon: _isSyncing 
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Icon(Icons.sync),
            label: Text(_isSyncing ? 'Syncing Households...' : 'Start Sync Households'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
        
        // Search and Filter Section
        Container(
          padding: const EdgeInsets.all(16.0),
          color: Colors.grey[100],
          child: Column(
            children: [
              // Search Bar
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search by address...',
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
                    borderRadius: BorderRadius.circular(8),
                  ),
                  filled: true,
                  fillColor: Colors.white,
                ),
                onChanged: _onSearchChanged,
              ),
              
              const SizedBox(height: 12),
              
              // Sync Status Filter
              DropdownButtonFormField<String>(
                value: _syncStatusFilter,
                decoration: const InputDecoration(
                  labelText: 'Sync Status',
                  border: OutlineInputBorder(),
                  filled: true,
                  fillColor: Colors.white,
                ),
                items: const [
                  DropdownMenuItem(value: null, child: Text('All Status')),
                  DropdownMenuItem(value: 'pending', child: Text('Pending')),
                  DropdownMenuItem(value: 'synced', child: Text('Synced')),
                ],
                onChanged: _onSyncStatusFilterChanged,
              ),
              
              // Clear Filters Button
              if (_syncStatusFilter != null || _searchQuery.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: TextButton.icon(
                    onPressed: _clearFilters,
                    icon: const Icon(Icons.clear_all),
                    label: const Text('Clear Filters'),
                  ),
                ),
            ],
          ),
        ),
        
        // Households List
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _filteredHouseholds.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.home_outlined,
                            size: 64,
                            color: Colors.grey,
                          ),
                          SizedBox(height: 16),
                          Text(
                            'No households found',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Add households to see them here',
                            style: TextStyle(
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16.0),
                      itemCount: _filteredHouseholds.length,
                      itemBuilder: (context, index) {
                        final household = _filteredHouseholds[index];
                        return _buildHouseholdCard(household);
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildHouseholdCard(Household household) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      elevation: 2,
      child: InkWell(
        onTap: () => _viewHouseholdDetails(household),
        borderRadius: BorderRadius.circular(8),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: _getSyncStatusColor(household.syncStatus).withOpacity(0.1),
            child: Icon(
              Icons.home,
              color: _getSyncStatusColor(household.syncStatus),
            ),
          ),
          title: Text(
            household.fullAddress,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text('Status: ${_getSyncStatusText(household.syncStatus)}'),
              Text('Created: ${_formatDate(household.createdAt)}'),
            ],
          ),
          trailing: _buildSyncStatusChip(household.syncStatus),
        ),
      ),
    );
  }

  Widget _buildSyncStatusChip(String syncStatus) {
    final color = _getSyncStatusColor(syncStatus);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        _getSyncStatusText(syncStatus),
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Color _getSyncStatusColor(String syncStatus) {
    switch (syncStatus) {
      case 'synced':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }


  String _getSyncStatusText(String syncStatus) {
    switch (syncStatus) {
      case 'synced':
        return 'Synced';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  }

  String _formatDate(String? dateString) {
    if (dateString == null) return 'Unknown';
    try {
      final date = DateTime.parse(dateString);
      return '${date.day}/${date.month}/${date.year}';
    } catch (e) {
      return 'Unknown';
    }
  }

  // ignore: unused_element
  void _showHouseholdJsonDialog(Household household) async {
    // Show loading dialog first
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
              Text('Loading household data...'),
            ],
          ),
        );
      },
    );

    try {
      // Ensure database service is initialized
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      // Get families for this household
      final families = await _databaseService.householdRepository.getFamiliesByHousehold(household.id!);
      
      // Get family members for each family
      final List<Map<String, dynamic>> familiesData = [];
      for (final family in families) {
        final familyMembers = await _databaseService.householdRepository.getFamilyMembers(family.id!);
        
        // Get resident details for each family member
        final List<Map<String, dynamic>> familyMembersData = [];
        for (final member in familyMembers) {
          final resident = await _databaseService.residentRepository.getById(member.familyMember);
          if (resident != null) {
            familyMembersData.add({
              'family_member_id': member.id,
              'resident_id': member.familyMember,
              'resident_name': resident.fullName,
              'relationship_to_head': member.relationshipToHead,
              'sync_status': member.syncStatus,
              'created_at': member.createdAt,
              'updated_at': member.updatedAt,
            });
          }
        }

        familiesData.add({
          'family_id': family.id,
          'family_group': family.familyGroup,
          'family_head': family.familyHead,
          'family_head_name': await _getResidentName(family.familyHead),
          'sync_status': family.syncStatus,
          'created_at': family.createdAt,
          'updated_at': family.updatedAt,
          'family_members': familyMembersData,
        });
      }

      // Create a comprehensive JSON with all fields including related data
      final jsonData = {
        'household': {
          'id': household.id,
          'local_id': household.localId,
          'house_number': household.houseNumber,
          'street': household.street,
          'purok_id': household.purokId,
          'barangay_id': household.barangayId,
          'house_head': household.houseHead,
          'house_head_name': await _getResidentName(household.houseHead),
          'housing_type': household.housingType,
          'structure_type': household.structureType,
          'electricity': household.electricity,
          'water_source': household.waterSource,
          'toilet_facility': household.toiletFacility,
          'latitude': household.latitude,
          'longitude': household.longitude,
          'area': household.area,
          'household_image_path': household.householdImagePath,
          'sync_status': household.syncStatus,
          'server_id': household.serverId,
          'created_at': household.createdAt,
          'updated_at': household.updatedAt,
          'full_address': household.fullAddress,
          'has_location': household.hasLocation,
          'is_valid': household.isValid(),
          'validation_errors': household.getValidationErrors(),
        },
        'families': familiesData,
        'total_families': families.length,
        'total_family_members': familiesData.fold(0, (sum, family) => sum + (family['family_members'] as List).length),
      };

      // Close loading dialog
      Navigator.of(context).pop();

      final jsonString = const JsonEncoder.withIndent('  ').convert(jsonData);

      showDialog(
        context: context,
        builder: (BuildContext context) {
          return AlertDialog(
            title: const Text('Household JSON Data'),
            content: SizedBox(
              width: double.maxFinite,
              height: 500,
              child: SingleChildScrollView(
                child: SelectableText(
                  jsonString,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                  ),
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Close'),
              ),
              ElevatedButton.icon(
                onPressed: () => _copyToClipboard(jsonString),
                icon: const Icon(Icons.copy, size: 16),
                label: const Text('Copy JSON'),
              ),
            ],
          );
        },
      );
    } catch (e) {
      // Close loading dialog
      Navigator.of(context).pop();
      
      _showErrorSnackBar('Error loading household data: $e');
    }
  }

  Future<String> _getResidentName(String residentId) async {
    try {
      final resident = await _databaseService.residentRepository.getById(residentId);
      return resident?.fullName ?? 'Unknown';
    } catch (e) {
      return 'Unknown';
    }
  }

  void _copyToClipboard(String text) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('JSON copied to clipboard'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  Widget _buildProgressDialog() {
    return Container(
      color: Colors.black54,
      child: Center(
        child: Card(
          margin: const EdgeInsets.all(20),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.sync,
                  size: 48,
                  color: AppColors.primary,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Syncing Households...',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: _totalProgress > 0 ? _currentProgress / _totalProgress : 0,
                  backgroundColor: Colors.grey[300],
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
                const SizedBox(height: 12),
                Text(
                  '$_currentProgress of $_totalProgress households',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
                if (_currentSyncHousehold.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Syncing: $_currentSyncHousehold',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _isSyncing ? () {
                    setState(() {
                      _isSyncCancelled = true;
                    });
                  } : null,
                  icon: const Icon(Icons.cancel),
                  label: const Text('Cancel Sync'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
