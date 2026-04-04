import 'package:flutter/material.dart';
import '../../data/models/resident.dart';
import '../../data/models/classification.dart';
import '../../core/services/database_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../core/services/resident_sync_service.dart';
import '../../core/constants/app_colors.dart';
import '../../utils/toast_helper.dart';
import 'login_screen.dart';
import 'resident_json_view_screen.dart';

class ResidentSyncScreen extends StatefulWidget {
  const ResidentSyncScreen({super.key});

  @override
  State<ResidentSyncScreen> createState() => _ResidentSyncScreenState();
}

class _ResidentSyncScreenState extends State<ResidentSyncScreen> {
  final DatabaseService _databaseService = DatabaseService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  final ResidentSyncService _syncService = ResidentSyncService();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  
  List<Resident> _residents = [];
  List<Resident> _filteredResidents = [];
  bool _isLoading = false;
  bool _isLoggedIn = false;
  bool _isSyncing = false;
  String? _syncStatusFilter;
  String _searchQuery = '';
  bool _showProgress = false;
  String _currentSyncResident = '';
  int _currentProgress = 0;
  int _totalProgress = 0;
  
  // Add sync cancellation support
  bool _isSyncCancelled = false;
  static const int _batchSize = 5; // Process residents in batches
  static const int _delayBetweenBatches = 1500; // 1 second delay between batches

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
      if (mounted) {
        setState(() {
          _isLoggedIn = isLoggedIn;
        });
      }
      
      if (isLoggedIn) {
        _loadResidents();
      } else {
        // Automatically navigate to login screen if not logged in
        if (mounted) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
              );
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Error checking login status: $e');
      // Navigate to login on error as well
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (context) => const LoginScreen()),
            );
          }
        });
      }
    }
  }

  Future<void> _loadResidents() async {
    if (!_isLoggedIn || !mounted) return;
    
    if (mounted) {
      setState(() {
        _isLoading = true;
      });
    }

    try {
      // Ensure database service is initialized
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }
      
      final residents = await _databaseService.residentRepository.getAll();
      if (mounted) {
        setState(() {
          _residents = residents;
          _applyFilters();
        });
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('Error loading residents: $e');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }


  void _applyFilters() {
    if (!mounted) return;
    
    List<Resident> filtered = _residents;

    // Apply sync status filter
    if (_syncStatusFilter != null) {
      filtered = filtered.where((resident) => resident.syncStatus == _syncStatusFilter).toList();
    }

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((resident) {
        final fullName = '${resident.firstName} ${resident.lastName}'.toLowerCase();
        return fullName.contains(_searchQuery.toLowerCase());
      }).toList();
    }

    if (mounted) {
      setState(() {
        _filteredResidents = filtered;
      });
    }
  }

  void _onSearchChanged(String query) {
    if (mounted) {
      setState(() {
        _searchQuery = query;
      });
      _applyFilters();
    }
  }

  void _onSyncStatusFilterChanged(String? status) {
    if (mounted) {
      setState(() {
        _syncStatusFilter = status;
      });
      _applyFilters();
    }
  }

  void _clearFilters() {
    if (mounted) {
      setState(() {
        _syncStatusFilter = null;
        _searchQuery = '';
        _searchController.clear();
      });
      _applyFilters();
    }
  }

  void _viewResidentDetails(Resident resident) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ResidentJsonViewScreen(
          resident: resident,
        ),
      ),
    );
  }

  Future<void> _startSync() async {
    if (!mounted) return;
    
    setState(() {
      _isSyncing = true;
      _isSyncCancelled = false;
    });

    try {
      // Check if API is configured
      final isApiConfigured = await _syncService.isApiConfigured();
      if (!isApiConfigured) {
        if (mounted) {
          _showErrorSnackBar('API service not configured. Please check your network connection.');
        }
        return;
      }

      final pendingResidents = _residents.where((r) => r.syncStatus == 'pending').toList();
      
      if (pendingResidents.isEmpty) {
        if (mounted) {
          _showSuccessSnackBar('No pending residents to sync');
        }
        return;
      }

      int syncedCount = 0;
      int errorCount = 0;

      // Show progress dialog
      if (mounted) {
        _showProgressDialog(pendingResidents.length);
      }

      // Process residents in batches to prevent server overload
      for (int batchStart = 0; batchStart < pendingResidents.length && !_isSyncCancelled; batchStart += _batchSize) {
        if (!mounted) break;
        
        final batchEnd = (batchStart + _batchSize).clamp(0, pendingResidents.length);
        final batch = pendingResidents.sublist(batchStart, batchEnd);
        
        debugPrint('🔄 Processing batch ${(batchStart ~/ _batchSize) + 1}: residents ${batchStart + 1}-${batchEnd}');
        
        // Process each resident in the current batch
        for (int i = 0; i < batch.length && !_isSyncCancelled; i++) {
          if (!mounted) break;
          
          final resident = batch[i];
          final currentIndex = batchStart + i + 1;
          
          try {
            // Update progress
            if (mounted) {
              _updateProgressDialog(currentIndex, pendingResidents.length, resident.fullName);
            }
            
            // Sync resident to server
            final serverResidentId = await _syncService.syncResident(resident);
            
            if (serverResidentId != null && resident.localId != null) {
              // Update local database with server ID
              final success = await _databaseService.residentRepository.updateServerResidentId(
                resident.localId.toString(), 
                serverResidentId
              );
              
              if (success) {
                syncedCount++;
                debugPrint('✅ Successfully synced resident ${resident.fullName} with server ID: $serverResidentId');
                
                // Now sync classifications for this resident
                if (resident.id != null) {
                  await _syncClassificationsForResident(resident.id!, serverResidentId);
                }
              } else {
                errorCount++;
                debugPrint('❌ Failed to update local database for resident ${resident.fullName}');
              }
            } else {
              errorCount++;
              debugPrint('❌ Failed to sync resident ${resident.fullName} - no server ID returned');
            }
          } catch (e) {
            errorCount++;
            debugPrint('❌ Error syncing resident ${resident.fullName}: $e');
          }
        }
        
        // Add delay between batches to prevent server overload
        if (batchEnd < pendingResidents.length && !_isSyncCancelled) {
          debugPrint('⏳ Waiting ${_delayBetweenBatches}ms before next batch...');
          await Future.delayed(Duration(milliseconds: _delayBetweenBatches));
        }
      }

      // Close progress dialog
      if (mounted) {
        _closeProgressDialog();
      }

      // Reload residents to reflect changes
      if (mounted) {
        await _loadResidents();
      }

      if (mounted) {
        if (_isSyncCancelled) {
          _showErrorSnackBar('Sync cancelled. Synced $syncedCount residents before cancellation.');
        } else if (errorCount == 0) {
          _showSuccessSnackBar('Successfully synced $syncedCount residents');
        } else {
          _showErrorSnackBar('Synced $syncedCount residents, $errorCount failed');
        }
      }
    } catch (e) {
      if (mounted) {
        _closeProgressDialog();
        print('❌ RESIDENT SYNC ERROR: $e');
        ToastHelper.showSyncError(context, 'Resident Sync', e.toString());
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

  void _showProgressDialog(int totalResidents) {
    if (mounted) {
      setState(() {
        _showProgress = true;
        _totalProgress = totalResidents;
        _currentProgress = 0;
        _currentSyncResident = '';
      });
    }
  }

  void _updateProgressDialog(int current, int total, String residentName) {
    if (mounted) {
      setState(() {
        _currentProgress = current;
        _currentSyncResident = residentName;
      });
    }
  }

  void _closeProgressDialog() {
    if (mounted) {
      setState(() {
        _showProgress = false;
        _currentProgress = 0;
        _totalProgress = 0;
        _currentSyncResident = '';
      });
    }
  }

  /// Sync classifications for a specific resident
  Future<void> _syncClassificationsForResident(String localId, String serverResidentId) async {
    try {
      // Get classifications for this resident from local database
      final classificationsData = await _databaseService.databaseHelper.getResidentClassifications(localId);
      
      if (classificationsData.isNotEmpty) {
        // Convert to Classification objects
        final classifications = classificationsData.map((data) => Classification.fromJson(data)).toList();
        
        debugPrint('🔄 Syncing ${classifications.length} classifications for resident: $serverResidentId');
        
        // Sync classifications to server
        final successCount = await _syncService.syncClassifications(classifications, serverResidentId);
        
        debugPrint('✅ Successfully synced $successCount/${classifications.length} classifications for resident: $serverResidentId');
      } else {
        debugPrint('ℹ️ No classifications found for resident: $localId');
      }
    } catch (e) {
      debugPrint('❌ Error syncing classifications for resident $localId: $e');
    }
  }

  void _showErrorSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  void _showSuccessSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sync Residents'),
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
            label: Text(_isSyncing ? 'Syncing Residents...' : 'Start Sync Residents'),
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
                  hintText: 'Search by name...',
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
        
        // Residents List
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _filteredResidents.isEmpty
                  ? const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.people_outline,
                            size: 64,
                            color: Colors.grey,
                          ),
                          SizedBox(height: 16),
                          Text(
                            'No residents found',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Add residents to see them here',
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
                      itemCount: _filteredResidents.length,
                      itemBuilder: (context, index) {
                        final resident = _filteredResidents[index];
                        return _buildResidentCard(resident);
                      },
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
        onTap: () => _viewResidentDetails(resident),
        borderRadius: BorderRadius.circular(8.0),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: _getSyncStatusColor(resident.syncStatus).withOpacity(0.1),
            child: Icon(
              _getSyncStatusIcon(resident.syncStatus),
              color: _getSyncStatusColor(resident.syncStatus),
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
              Text('Status: ${_getSyncStatusText(resident.syncStatus)}'),
              Text('Created: ${_formatDate(resident.createdAt)}'),
            ],
          ),
          trailing: _buildSyncStatusChip(resident.syncStatus),
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

  IconData _getSyncStatusIcon(String syncStatus) {
    switch (syncStatus) {
      case 'synced':
        return Icons.check_circle;
      case 'pending':
        return Icons.pending;
      default:
        return Icons.help;
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
                  'Syncing Residents...',
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
                  '$_currentProgress of $_totalProgress residents',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
                if (_currentSyncResident.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Syncing: $_currentSyncResident',
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
