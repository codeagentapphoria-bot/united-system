import 'package:flutter/material.dart';
import '../../data/models/household.dart';
import '../../core/services/database_service.dart';
import '../../core/services/auth_service.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../widgets/image_avatar_widget.dart';
import 'household_form.dart';
import 'household_details_screen.dart';

class HouseholdListScreen extends StatefulWidget {
  const HouseholdListScreen({super.key});

  @override
  State<HouseholdListScreen> createState() => _HouseholdListScreenState();
}

class _HouseholdListScreenState extends State<HouseholdListScreen> {
  final DatabaseService _databaseService = DatabaseService();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  
  // Static cache for purok data to avoid repeated database queries
  // Now barangay-specific: barangayId -> Map<purokId, purokName>
  static Map<int, Map<int, String>> _staticPurokCache = {};
  static const int _cacheVersion = 2; // Increment to invalidate old cache
  static int _currentCacheVersion = 0;
  
  List<Household> _households = [];
  bool _isLoading = false;
  bool _hasMoreData = true;
  int _currentOffset = 0;
  final int _pageSize = 20;
  String? _purokFilter;
  String _searchQuery = '';
  Map<String, String> _residentNames = {}; // Cache for resident names
  Map<int, String> _purokNames = {}; // Cache for purok names
  bool _isLoadingPuroks = false; // Loading state for purok dropdown
  int? _barangayId; // Store logged-in user's barangay ID

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    
    // Clear cache if version changed (handles structure updates)
    if (_currentCacheVersion != _cacheVersion) {
      _staticPurokCache.clear();
      _currentCacheVersion = _cacheVersion;
      print('🗑️ Cleared old purok cache (version upgrade: $_currentCacheVersion)');
    }
    
    _initializeData();
  }

  Future<void> _initializeData() async {
    // Load data in parallel for better performance
    await Future.wait([
      _loadResidentNames(),
      _loadPurokNames(),
    ]);
    _loadHouseholds();
  }

  Future<void> _loadResidentNames() async {
    try {
      // Ensure database service is initialized
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }
      
      final residents = await _databaseService.residentRepository.getAll(barangayId: _barangayId);
      if (mounted) {
        setState(() {
          _residentNames = {for (var r in residents) r.id!: r.fullName};
        });
      }
    } catch (e) {
      debugPrint('Error loading resident names: $e');
    }
  }

  Future<void> _loadPurokNames() async {
    if (_isLoadingPuroks) return; // Prevent multiple simultaneous loads
    
    if (mounted) {
      setState(() {
        _isLoadingPuroks = true;
      });
    }
    
    try {
      print('🏘️ HOUSEHOLD LIST - Loading purok names...');
      final authService = AuthService();
      final userData = await authService.getStoredUserData();
      
      if (userData != null && userData.targetId != null) {
        final currentBarangayId = userData.targetId!;
        print('   User data found - Barangay ID: $currentBarangayId');
        _barangayId = currentBarangayId; // Store barangay ID for filtering
        
        // Check if we have cached data for THIS SPECIFIC barangay
        if (_staticPurokCache.containsKey(currentBarangayId)) {
          print('   ✅ Using cached purok data for barangay $currentBarangayId');
          if (mounted) {
            setState(() {
              _purokNames = Map.from(_staticPurokCache[currentBarangayId]!);
            });
          }
          if (mounted) {
            setState(() {
              _isLoadingPuroks = false;
            });
          }
          return;
        }
        
        // No cache for this barangay, load from database
        print('   📥 Loading puroks from database for barangay $currentBarangayId');
        final puroks = await authService.getStoredPuroks(currentBarangayId);
        print('   Found ${puroks.length} puroks');
        
        for (final purok in puroks) {
          print('   - ${purok['name']} (ID: ${purok['id']})');
        }
        
        // Update barangay-specific cache
        final purokMap = {for (var p in puroks) p['id'] as int: p['name'] as String};
        _staticPurokCache[currentBarangayId] = purokMap;
        
        if (mounted) {
          setState(() {
            _purokNames = Map.from(purokMap);
          });
        }
        print('   ✅ Purok names loaded and cached for barangay $currentBarangayId: $_purokNames');
      } else {
        print('   ❌ No user data or target ID found');
        if (mounted) {
          setState(() {
            _purokNames = {};
          });
        }
      }
    } catch (e) {
      print('   ❌ Error loading purok names: $e');
      debugPrint('Error loading purok names: $e');
      if (mounted) {
        setState(() {
          _purokNames = {};
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingPuroks = false;
        });
      }
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
      _loadMoreHouseholds();
    }
  }

  Future<void> _loadHouseholds({bool refresh = false}) async {
    if (_isLoading) return;
    
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

      if (refresh) {
        _currentOffset = 0;
        _households.clear();
        _hasMoreData = true;
      }

      List<Household> households;
      
      if (_searchQuery.isNotEmpty) {
        // Search by household head - we'll need to implement this in the repository
        households = await _searchByHouseholdHead(_searchQuery);
        _hasMoreData = false; // No pagination for search results
      } else if (_purokFilter != null) {
        // Filter by purok (and barangay)
        int purokId = int.parse(_purokFilter!);
        households = await _databaseService.householdRepository.getByPurok(purokId);
        // Filter by barangay and exclude synced households
        households = households.where((household) => 
          household.syncStatus != 'synced' && 
          (_barangayId == null || household.barangayId == _barangayId)
        ).toList();
        _hasMoreData = false; // No pagination for filtered results
      } else {
        // Get all households with pagination, filtered by barangay
        households = await _databaseService.householdRepository.getAll(barangayId: _barangayId);
        
        
        // Filter out synced households - only show pending households
        households = households.where((household) => household.syncStatus != 'synced').toList();
        
        // Apply pagination manually since the repository doesn't support it yet
        int startIndex = _currentOffset;
        int endIndex = startIndex + _pageSize;
        
        if (startIndex < households.length) {
          households = households.sublist(
            startIndex, 
            endIndex > households.length ? households.length : endIndex
          );
          _hasMoreData = endIndex < households.length;
        } else {
          households = [];
          _hasMoreData = false;
        }
      }


      if (mounted) {
        setState(() {
          if (refresh) {
            _households = households;
          } else {
            _households.addAll(households);
          }
          _currentOffset += _pageSize;
        });
      }
    } catch (e) {
      _showErrorSnackBar('Error loading households: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _loadMoreHouseholds() async {
    if (!_hasMoreData || _isLoading) return;
    await _loadHouseholds();
  }

  Future<void> _refreshHouseholds() async {
    await _loadHouseholds(refresh: true);
  }

  Future<List<Household>> _searchByHouseholdHead(String query) async {
    // Get all households filtered by barangay and filter by household head name
    print('🔍 HOUSEHOLD SEARCH - Searching with barangayId: $_barangayId');
    var allHouseholds = await _databaseService.householdRepository.getAll(barangayId: _barangayId);
    var residents = await _databaseService.residentRepository.getAll(barangayId: _barangayId);
    
    // If no households found with barangayId filter, try without filter as fallback
    if (allHouseholds.isEmpty && _barangayId != null) {
      print('⚠️ HOUSEHOLD SEARCH - No households found for barangayId $_barangayId, trying without filter...');
      allHouseholds = await _databaseService.householdRepository.getAll();
      residents = await _databaseService.residentRepository.getAll();
      print('🏠 HOUSEHOLD SEARCH - Found ${allHouseholds.length} total households in database');
    }
    
    // Create a map of resident ID to resident name for quick lookup
    final residentMap = {for (var r in residents) r.id!: r};
    
    // Filter households where household head name contains the query and exclude synced households
    return allHouseholds.where((household) {
      // First filter out synced households
      if (household.syncStatus == 'synced') return false;
      
      final houseHead = residentMap[household.houseHead];
      if (houseHead == null) return false;
      return houseHead.fullName.toLowerCase().contains(query.toLowerCase());
    }).toList();
  }

  void _onSearchChanged(String query) {
    if (mounted) {
      setState(() {
        _searchQuery = query;
      });
    }
    _loadHouseholds(refresh: true);
  }

  void _onPurokFilterChanged(String? purok) {
    if (mounted) {
      setState(() {
        _purokFilter = purok;
      });
    }
    _loadHouseholds(refresh: true);
  }

  Future<void> _refreshPurokData() async {
    // Clear cache for current barangay
    if (_barangayId != null) {
      _staticPurokCache.remove(_barangayId);
      print('🗑️ Cleared purok cache for barangay $_barangayId');
    }
    
    // Also clear AuthService cache
    final authService = AuthService();
    final userData = await authService.getStoredUserData();
    if (userData?.targetId != null) {
      AuthService.clearPurokCache(userData!.targetId!);
    }
    
    await _loadPurokNames();
  }


  Future<void> _deleteHousehold(Household household) async {
    final confirmed = await _showDeleteConfirmation(household);
    if (!confirmed) return;

    try {
      // Ensure database service is initialized
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      final success = await _databaseService.householdRepository.delete(household.id!);
      if (success) {
        if (mounted) {
          setState(() {
            _households.removeWhere((h) => h.id == household.id);
          });
        }
        _showSuccessSnackBar('Household deleted successfully');
      } else {
        _showErrorSnackBar('Failed to delete household');
      }
    } catch (e) {
      _showErrorSnackBar('Error deleting household: $e');
    }
  }

  Future<void> _updateHousehold(Household household) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => HouseholdForm(household: household),
      ),
    );

    if (result == true) {
      _refreshHouseholds();
    }
  }

  Future<bool> _showDeleteConfirmation(Household household) async {
    return await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Delete Household'),
          content: Text('Are you sure you want to delete this household?\n\n${household.fullAddress}'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    ) ?? false;
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

  @override
  Widget build(BuildContext context) {
    return Column(
        children: [
          // Add Household Button at the top
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16.0),
            child: ElevatedButton.icon(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const HouseholdForm(),
                  ),
                );
                if (result == true) {
                  _refreshHouseholds();
                }
              },
              icon: const Icon(Icons.add),
              label: const Text('Add New Household'),
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
                    hintText: 'Search by household head...',
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
                
                // Purok Filter
                DropdownButtonFormField<String>(
                  value: _purokFilter,
                  decoration: InputDecoration(
                    labelText: 'Purok',
                    border: const OutlineInputBorder(),
                    filled: true,
                    fillColor: Colors.white,
                    suffixIcon: _isLoadingPuroks 
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: Padding(
                              padding: EdgeInsets.all(12.0),
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          )
                        : null,
                  ),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('All Puroks')),
                    if (_isLoadingPuroks)
                      const DropdownMenuItem(
                        value: 'loading',
                        enabled: false,
                        child: Text('Loading puroks...'),
                      )
                    else
                      ..._purokNames.entries.map((entry) {
                        return DropdownMenuItem(
                          value: entry.key.toString(),
                          child: Text(entry.value),
                        );
                      }).toList(),
                  ],
                  onChanged: _isLoadingPuroks ? null : _onPurokFilterChanged,
                ),
                
                // Refresh Purok Data Button
                if (_purokNames.isEmpty && !_isLoadingPuroks)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: TextButton.icon(
                      onPressed: _refreshPurokData,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Refresh Puroks'),
                    ),
                  ),
              ],
            ),
          ),
          
          // Households List
          Expanded(
            child: _households.isEmpty && !_isLoading
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
                          'Add a new household to get started',
                          style: TextStyle(
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _refreshHouseholds,
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16.0),
                      itemCount: _households.length + (_hasMoreData ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index >= _households.length) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: CircularProgressIndicator(),
                            ),
                          );
                        }
                        
                        final household = _households[index];
                        return _buildHouseholdCard(household);
                      },
                    ),
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
        onTap: () => _showHouseholdDetails(household),
        borderRadius: BorderRadius.circular(8),
        child: ListTile(
          leading: HouseholdAvatarWidget(
            imagePath: household.householdImagePath,
            name: _getPurokName(household.purokId),
            size: 48,
          ),
          title: Text(
            _getPurokName(household.purokId),
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text('Household Head: ${_getHouseholdHeadName(household.houseHead)}'),
              if (household.houseNumber != null && household.houseNumber!.isNotEmpty)
                Text('House #${household.houseNumber}'),
              if (household.street != null && household.street!.isNotEmpty)
                Text('${household.street}'),
            ],
          ),
          trailing: PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'edit':
                  _updateHousehold(household);
                  break;
                case 'delete':
                  _deleteHousehold(household);
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(AppIcons.edit, color: Colors.orange),
                    SizedBox(width: 8),
                    Text('Edit'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(AppIcons.delete, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Delete'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }


  String _getHouseholdHeadName(String houseHeadId) {
    return _residentNames[houseHeadId] ?? 'Unknown';
  }

  String _getPurokName(int purokId) {
    final purokName = _purokNames[purokId];
    
    if (purokName == null) {
      print('⚠️ Purok ID $purokId not found in cache');
      print('   Current barangay ID: $_barangayId');
      print('   Available purok IDs: ${_purokNames.keys.toList()}');
      print('   Available purok names: $_purokNames');
      return 'Unknown Purok (ID: $purokId)';
    }
    
    return purokName.isNotEmpty ? purokName[0].toUpperCase() + purokName.substring(1) : purokName;
  }


  void _showHouseholdDetails(Household household) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => HouseholdDetailsScreen(
          household: household,
        ),
      ),
    );
  }

}
