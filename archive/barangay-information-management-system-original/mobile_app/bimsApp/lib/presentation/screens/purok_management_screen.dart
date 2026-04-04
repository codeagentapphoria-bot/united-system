import 'package:flutter/material.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../data/database/database_helper.dart';

class PurokManagementScreen extends StatefulWidget {
  const PurokManagementScreen({super.key});

  @override
  State<PurokManagementScreen> createState() => _PurokManagementScreenState();
}

class _PurokManagementScreenState extends State<PurokManagementScreen> {
  final OfflineAuthManager _authManager = OfflineAuthManager();
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  
  List<Map<String, dynamic>> _puroks = [];
  bool _isLoading = false;
  String _searchQuery = '';
  int? _barangayId;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _initialize();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    // Get barangay ID from secure storage
    final barangayId = await _authManager.getBarangayId();
    
    if (barangayId != null) {
      setState(() {
        _barangayId = barangayId;
      });
      print('🏘️ Loaded barangay ID from secure storage: $_barangayId');
      await _loadPuroks();
    } else {
      print('❌ No barangay ID found in secure storage');
    }
  }

  void _onScroll() {
    // Implement pagination if needed
  }

  Future<void> _loadPuroks() async {
    if (_barangayId == null) return;
    
    setState(() {
      _isLoading = true;
    });

    try {
      final puroks = await _dbHelper.getPuroksByBarangayId(_barangayId!);
      print('📦 Loaded ${puroks.length} puroks from database');
        
        setState(() {
          _puroks = puroks;
        });
    } catch (e) {
      print('❌ Error loading puroks: $e');
      _showErrorSnackBar('Error loading puroks: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _refreshPuroks() async {
    await _loadPuroks();
  }

  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
    });
  }

  List<Map<String, dynamic>> get _filteredPuroks {
    if (_searchQuery.isEmpty) return _puroks;
    
    return _puroks.where((purok) {
      final name = purok['name']?.toString().toLowerCase() ?? '';
      final leader = purok['leader']?.toString().toLowerCase() ?? '';
      final description = purok['description']?.toString().toLowerCase() ?? '';
      
      return name.contains(_searchQuery.toLowerCase()) ||
             leader.contains(_searchQuery.toLowerCase()) ||
             description.contains(_searchQuery.toLowerCase());
    }).toList();
  }

  Future<void> _showPurokDialog({Map<String, dynamic>? purokToEdit}) async {
    final nameController = TextEditingController(text: purokToEdit?['name'] ?? '');
    final leaderController = TextEditingController(text: purokToEdit?['leader'] ?? '');
    final descriptionController = TextEditingController(text: purokToEdit?['description'] ?? '');
    final formKey = GlobalKey<FormState>();

    return showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(purokToEdit == null ? 'Add Purok' : 'Edit Purok'),
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
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (formKey.currentState!.validate()) {
                  Navigator.of(context).pop();
                  
                  final purokData = {
                    'barangay_id': _barangayId,
                    'name': nameController.text.trim(),
                    'leader': leaderController.text.trim(),
                    'description': descriptionController.text.trim(),
                  };

                  if (purokToEdit == null) {
                    await _createPurok(purokData);
                  } else {
                    await _updatePurok(purokToEdit['id'], purokData);
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              child: Text(purokToEdit == null ? 'Add' : 'Update'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _createPurok(Map<String, dynamic> purokData) async {
    try {
      await _dbHelper.insertPurok(purokData);
      _showSuccessSnackBar('Purok created successfully');
      await _loadPuroks();
    } catch (e) {
      _showErrorSnackBar('Error creating purok: $e');
    }
  }

  Future<void> _updatePurok(int id, Map<String, dynamic> purokData) async {
    try {
      await _dbHelper.updatePurok(id, purokData);
      _showSuccessSnackBar('Purok updated successfully');
      await _loadPuroks();
    } catch (e) {
      _showErrorSnackBar('Error updating purok: $e');
    }
  }

  Future<void> _deletePurok(Map<String, dynamic> purok) async {
    final confirmed = await _showDeleteConfirmation(purok);
    if (!confirmed) return;

    try {
      await _dbHelper.deletePurok(purok['id']);
      _showSuccessSnackBar('Purok deleted successfully');
          await _loadPuroks();
    } catch (e) {
      _showErrorSnackBar('Error deleting purok: $e');
    }
  }

  Future<bool> _showDeleteConfirmation(Map<String, dynamic> purok) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Purok'),
        content: Text(
          'Are you sure you want to delete "${purok['name']}"?\n\nThis action cannot be undone.',
        ),
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
    if (_barangayId == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Purok Management'),
          backgroundColor: Colors.white,
          foregroundColor: AppColors.primary,
          elevation: 0,
        ),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red),
              SizedBox(height: 16),
              Text(
                'Unable to load barangay information',
                style: TextStyle(fontSize: 18, color: Colors.grey),
              ),
              SizedBox(height: 8),
              Text(
                'Please log in again',
                style: TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Purok Management'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Add Purok Button at the top
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16.0),
            child: ElevatedButton.icon(
              onPressed: () => _showPurokDialog(),
              icon: const Icon(Icons.add),
              label: const Text('Add New Purok'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          
          // Search Section
          Container(
            padding: const EdgeInsets.all(16.0),
            color: Colors.grey[100],
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search puroks...',
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
          ),
          
          // Puroks List
          Expanded(
            child: _puroks.isEmpty && !_isLoading
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.location_city_outlined,
                          size: 64,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'No puroks found',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Add a new purok to get started',
                          style: TextStyle(
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _refreshPuroks,
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16.0),
                      itemCount: _filteredPuroks.length,
                      itemBuilder: (context, index) {
                        final purok = _filteredPuroks[index];
                        return _buildPurokCard(purok);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildPurokCard(Map<String, dynamic> purok) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      elevation: 2,
      child: ListTile(
        contentPadding: const EdgeInsets.all(16.0),
        leading: CircleAvatar(
          radius: 24,
          backgroundColor: AppColors.primary.withOpacity(0.1),
          child: Icon(
            AppIcons.barangay,
            color: AppColors.primary,
            size: 24,
          ),
        ),
        title: Text(
          purok['name'] ?? 'Unknown Purok',
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            if (purok['leader'] != null && purok['leader'].toString().isNotEmpty)
              Text('Leader: ${purok['leader']}'),
            if (purok['description'] != null && purok['description'].toString().isNotEmpty)
              Text('Description: ${purok['description']}'),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            switch (value) {
              case 'edit':
                _showPurokDialog(purokToEdit: purok);
                break;
              case 'delete':
                _deletePurok(purok);
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
    );
  }
}
