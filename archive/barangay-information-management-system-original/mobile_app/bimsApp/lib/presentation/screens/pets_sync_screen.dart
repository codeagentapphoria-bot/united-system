import 'package:flutter/material.dart';
import '../../data/models/pet.dart';
import '../../core/services/database_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../core/services/pets_sync_service.dart';
import '../../core/constants/app_colors.dart';
import '../../utils/toast_helper.dart';
import 'login_screen.dart';
import 'pet_details_screen.dart';

class PetsSyncScreen extends StatefulWidget {
  const PetsSyncScreen({super.key});

  @override
  State<PetsSyncScreen> createState() => _PetsSyncScreenState();
}

class _PetsSyncScreenState extends State<PetsSyncScreen> {
  final DatabaseService _databaseService = DatabaseService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  final PetsSyncService _syncService = PetsSyncService();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  
  List<Pet> _pets = [];
  List<Pet> _filteredPets = [];
  bool _isLoading = false;
  bool _isSyncing = false;
  String? _syncStatusFilter;
  String _searchQuery = '';
  bool _showProgress = false;
  String _currentSyncPet = '';
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
      
      if (!isLoggedIn) {
        // Automatically navigate to login screen if not logged in
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const LoginScreen()),
          );
        });
        return;
      }

      // User is logged in, proceed with loading pets

      await _loadPets();
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

  Future<void> _loadPets() async {
    if (!mounted) return;
    
    setState(() {
      _isLoading = true;
    });

    try {
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      final pets = await _databaseService.petsRepository.getAll();
      
      if (mounted) {
        setState(() {
          _pets = pets;
          _filteredPets = pets;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading pets: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _applyFilters() {
    if (!mounted) return;
    
    List<Pet> filtered = _pets;

    // Apply sync status filter
    if (_syncStatusFilter != null) {
      filtered = filtered.where((pet) => pet.syncStatus == _syncStatusFilter).toList();
    }

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((pet) {
        final petName = pet.petName.toLowerCase();
        return petName.contains(_searchQuery.toLowerCase());
      }).toList();
    }

    if (mounted) {
      setState(() {
        _filteredPets = filtered;
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

  void _viewPetDetails(Pet pet) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => PetDetailsScreen(
          pet: pet,
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

      final pendingPets = _pets.where((p) => p.syncStatus == 'pending').toList();
      
      if (pendingPets.isEmpty) {
        if (mounted) {
          _showSuccessSnackBar('No pending pets to sync');
        }
        return;
      }

      int syncedCount = 0;
      int errorCount = 0;

      // Show progress dialog
      if (mounted) {
        _showProgressDialog(pendingPets.length);
      }

      // Process each pet
      for (int i = 0; i < pendingPets.length && !_isSyncCancelled; i++) {
        if (!mounted) break;
        
        final pet = pendingPets[i];
        final currentIndex = i + 1;
        
        try {
          // Update progress
          if (mounted) {
            _updateProgressDialog(currentIndex, pendingPets.length, pet.petName);
          }
          
          // Sync pet to server
          final serverPetId = await _syncService.syncPet(pet);
          
          if (serverPetId != null && pet.id != null) {
            // Update local database with server ID and sync status
            await _databaseService.petsRepository.updateServerId(
              pet.id!, 
              int.tryParse(serverPetId) ?? 0
            );
            
            await _databaseService.petsRepository.updateSyncStatus(
              pet.id!, 
              'synced'
            );
            
            syncedCount++;
            debugPrint('✅ Successfully synced pet ${pet.petName} with server ID: $serverPetId');
          } else {
            errorCount++;
            debugPrint('❌ Failed to sync pet ${pet.petName} - no server ID returned');
          }
        } catch (e) {
          debugPrint('❌ Error syncing pet ${pet.petName}: $e');
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

      // Reload pets to reflect changes
      if (mounted) {
        await _loadPets();
      }

      if (mounted) {
        if (_isSyncCancelled) {
          _showInfoSnackBar('Sync cancelled by user');
        } else if (errorCount > 0) {
          _showErrorSnackBar('Sync completed with $errorCount errors. $syncedCount pets synced successfully.');
        } else {
          _showSuccessSnackBar('Successfully synced $syncedCount pets');
        }
      }
    } catch (e) {
      debugPrint('Error during sync: $e');
      if (mounted) {
        _closeProgressDialog();
        print('❌ PET SYNC ERROR: $e');
        ToastHelper.showSyncError(context, 'Pet Sync', e.toString());
        _showErrorSnackBar('Sync failed: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSyncing = false;
        });
      }
    }
  }

  void _showProgressDialog(int totalPets) {
    setState(() {
      _showProgress = true;
      _currentProgress = 0;
      _totalProgress = totalPets;
      _currentSyncPet = '';
    });
  }

  void _updateProgressDialog(int current, int total, String petName) {
    if (mounted) {
      setState(() {
        _currentProgress = current;
        _totalProgress = total;
        _currentSyncPet = petName;
      });
    }
  }

  void _closeProgressDialog() {
    if (mounted) {
      setState(() {
        _showProgress = false;
      });
    }
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.success,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
        duration: const Duration(seconds: 5),
      ),
    );
  }

  void _showInfoSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.info,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sync Pets'),
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
            label: Text(_isSyncing ? 'Syncing Pets...' : 'Start Sync Pets'),
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
          child: Column(
            children: [
              // Search Field
              TextField(
                controller: _searchController,
                onChanged: _onSearchChanged,
                decoration: InputDecoration(
                  hintText: 'Search pets...',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Filter Row
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _syncStatusFilter,
                      decoration: const InputDecoration(
                        labelText: 'Sync Status',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                      ),
                      items: const [
                        DropdownMenuItem(value: null, child: Text('All')),
                        DropdownMenuItem(value: 'pending', child: Text('Pending')),
                        DropdownMenuItem(value: 'synced', child: Text('Synced')),
                        DropdownMenuItem(value: 'failed', child: Text('Failed')),
                      ],
                      onChanged: _onSyncStatusFilterChanged,
                    ),
                  ),
                  
                  const SizedBox(width: 16),
                  
                  ElevatedButton(
                    onPressed: _clearFilters,
                    child: const Text('Clear'),
                  ),
                ],
              ),
            ],
          ),
        ),
        
        // Pets List
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _filteredPets.isEmpty
                  ? const Center(
                      child: Text(
                        'No pets found',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey,
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      itemCount: _filteredPets.length,
                      itemBuilder: (context, index) {
                        final pet = _filteredPets[index];
                        return Card(
                          margin: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 4,
                          ),
                          child: InkWell(
                            onTap: () => _viewPetDetails(pet),
                            borderRadius: BorderRadius.circular(8.0),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getSyncStatusColor(pet.syncStatus).withOpacity(0.1),
                                child: Icon(
                                  Icons.pets,
                                  color: _getSyncStatusColor(pet.syncStatus),
                                ),
                              ),
                              title: Text(
                                pet.petName,
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Species: ${pet.species}'),
                                  Text('Owner: ${pet.ownerId}'),
                                  Text('Sync Status: ${pet.syncStatus}'),
                                ],
                              ),
                              trailing: _buildSyncStatusChip(pet.syncStatus),
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
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
                  'Syncing Pets...',
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
                  '$_currentProgress of $_totalProgress pets',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
                if (_currentSyncPet.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    'Syncing: $_currentSyncPet',
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

  Widget _buildSyncStatusChip(String status) {
    Color color;
    String label;
    
    switch (status) {
      case 'synced':
        color = AppColors.success;
        label = 'Synced';
        break;
      case 'pending':
        color = AppColors.warning;
        label = 'Pending';
        break;
      case 'failed':
        color = AppColors.error;
        label = 'Failed';
        break;
      default:
        color = Colors.grey;
        label = 'Unknown';
    }
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Color _getSyncStatusColor(String status) {
    switch (status) {
      case 'synced':
        return AppColors.success;
      case 'pending':
        return AppColors.warning;
      case 'failed':
        return AppColors.error;
      default:
        return Colors.grey;
    }
  }
}
