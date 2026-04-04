import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../data/database/database_helper.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../core/services/classification_sync_service.dart';
import 'package:flutter_colorpicker/flutter_colorpicker.dart';
import '../widgets/classification_details_editor.dart';

class ClassificationManagementScreen extends StatefulWidget {
  const ClassificationManagementScreen({super.key});

  @override
  State<ClassificationManagementScreen> createState() => _ClassificationManagementScreenState();
}

class _ClassificationManagementScreenState extends State<ClassificationManagementScreen> {
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;
  final OfflineAuthManager _authManager = OfflineAuthManager();
  final ClassificationSyncService _syncService = ClassificationSyncService();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  
  List<Map<String, dynamic>> _classificationTypes = [];
  bool _isLoading = false;
  String _searchQuery = '';
  int? _municipalityId;

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
    final userData = await _authManager.getCurrentUser();
    
    if (userData != null) {
      // For barangay users, we need the municipality ID from the barangay data
      // For municipality users, targetId is already the municipality ID
      int? municipalityId;
      
      if (userData.targetType == 'municipality') {
        municipalityId = userData.targetId;
      } else if (userData.targetType == 'barangay') {
        // Get municipality ID from secure storage or user data
        // Classifications are at municipality level, so barangay users see their municipality's classifications
        final barangayId = await _authManager.getBarangayId();
        if (barangayId != null) {
          // Try to get municipality ID from database
          try {
            final dbHelper = DatabaseHelper.instance;
            final barangays = await dbHelper.database.then((db) => 
              db.query('barangays', where: 'id = ?', whereArgs: [barangayId])
            );
            if (barangays.isNotEmpty) {
              municipalityId = barangays.first['municipality_id'] as int?;
            }
          } catch (e) {
            print('❌ Error getting municipality ID from barangay: $e');
          }
        }
      }
      
      if (municipalityId != null) {
        setState(() {
          _municipalityId = municipalityId;
        });
        print('🏙️ Using municipality ID: $_municipalityId for classifications');
        await _loadClassificationTypes();
      } else {
        print('❌ No municipality ID found');
      }
    }
  }

  void _onScroll() {
    // Implement pagination if needed
  }

  Future<void> _loadClassificationTypes() async {
    setState(() {
      _isLoading = true;
    });

    try {
      print('🔍 Loading classification types from database...');
      final classificationTypes = await _dbHelper.getAllClassificationTypes();
      print('📦 Loaded ${classificationTypes.length} classification types from database');
      
      setState(() {
        _classificationTypes = classificationTypes;
      });
    } catch (e) {
      print('❌ Error loading classification types: $e');
      _showErrorSnackBar('Error loading classification types: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _refreshClassificationTypes() async {
    await _loadClassificationTypes();
  }

  Future<void> _fetchClassificationsFromServer() async {
    if (_municipalityId == null) {
      _showErrorSnackBar('Municipality ID not available');
      return;
    }

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
                child: Text('Fetching classifications from server...'),
              ),
            ],
          ),
        );
      },
    );

    try {
      final success = await _syncService.fetchClassificationTypesFromServer(_municipalityId!);
      
      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
      }

      if (success) {
        _showSuccessSnackBar('Classifications updated successfully from server');
        await _loadClassificationTypes();
      } else {
        _showErrorSnackBar('Failed to fetch classifications from server');
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) {
        Navigator.of(context).pop();
      }
      _showErrorSnackBar('Error: $e');
    }
  }

  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
    });
  }

  List<Map<String, dynamic>> get _filteredClassificationTypes {
    if (_searchQuery.isEmpty) return _classificationTypes;
    
    return _classificationTypes.where((classification) {
      final name = classification['name']?.toString().toLowerCase() ?? '';
      final description = classification['description']?.toString().toLowerCase() ?? '';
      
      return name.contains(_searchQuery.toLowerCase()) ||
             description.contains(_searchQuery.toLowerCase());
    }).toList();
  }

  Future<void> _showClassificationDialog({Map<String, dynamic>? classificationToEdit}) async {
    final nameController = TextEditingController(text: classificationToEdit?['name'] ?? '');
    final descriptionController = TextEditingController(text: classificationToEdit?['description'] ?? '');
    Color selectedColor = _parseColor(classificationToEdit?['color'] ?? '#4CAF50');
    bool isActive = classificationToEdit?['is_active'] == 1 || classificationToEdit?['is_active'] == null;
    List<Map<String, dynamic>> details = [];
    
    // Parse existing details if editing
    if (classificationToEdit != null && classificationToEdit['details'] != null) {
      try {
        final detailsString = classificationToEdit['details'];
        if (detailsString is String && detailsString.isNotEmpty && detailsString != '[]') {
          final parsed = jsonDecode(detailsString);
          if (parsed is List) {
            details = List<Map<String, dynamic>>.from(parsed);
          }
        }
      } catch (e) {
        debugPrint('Error parsing details: $e');
        details = [];
      }
    }
    
    final formKey = GlobalKey<FormState>();

    return showDialog(
      context: context,
      builder: (BuildContext context) {
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
                        Expanded(
                          child: Text(
                            classificationToEdit == null ? 'Add Classification' : 'Edit Classification',
                            style: const TextStyle(
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
                                    builder: (BuildContext context) {
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
                                              Navigator.of(context).pop();
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
                                'municipality_id': _municipalityId,
                                'name': nameController.text.trim(),
                                'description': descriptionController.text.trim(),
                                'color': colorHex,
                                'details': jsonEncode(details),
                                'is_active': isActive,
                              };

                              if (classificationToEdit == null) {
                                await _createClassification(classificationData);
        } else {
                                await _updateClassification(classificationToEdit['id'], classificationData);
                              }
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                          ),
                          child: Text(classificationToEdit == null ? 'Create' : 'Update'),
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
      await _dbHelper.insertClassificationType(classificationData);
      _showSuccessSnackBar('Classification created successfully');
      await _loadClassificationTypes();
    } catch (e) {
      _showErrorSnackBar('Error creating classification: $e');
    }
  }

  Future<void> _updateClassification(int id, Map<String, dynamic> classificationData) async {
    try {
      await _dbHelper.updateClassificationType(id, classificationData);
      _showSuccessSnackBar('Classification updated successfully');
      await _loadClassificationTypes();
    } catch (e) {
      _showErrorSnackBar('Error updating classification: $e');
    }
  }

  Future<void> _deleteClassification(Map<String, dynamic> classification) async {
    final confirmed = await _showDeleteConfirmation(classification);
    if (!confirmed) return;

    try {
      await _dbHelper.deleteClassificationType(classification['id']);
      _showSuccessSnackBar('Classification deleted successfully');
      await _loadClassificationTypes();
    } catch (e) {
      _showErrorSnackBar('Error deleting classification: $e');
    }
  }

  Future<bool> _showDeleteConfirmation(Map<String, dynamic> classification) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Classification'),
        content: Text(
          'Are you sure you want to delete "${classification['name']}"?\n\nThis action cannot be undone.',
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

  Color _parseColor(String? colorString) {
    if (colorString == null || colorString.isEmpty) {
      return Colors.grey;
    }
    try {
      String cleanColor = colorString.startsWith('#') ? colorString.substring(1) : colorString;
      
      if (cleanColor.length == 6) {
        return Color(int.parse('FF$cleanColor', radix: 16));
      } else if (cleanColor.length == 8) {
        return Color(int.parse(cleanColor, radix: 16));
      }
    } catch (e) {
      print('Error parsing color: $colorString - $e');
    }
    return Colors.grey;
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
    if (_municipalityId == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Classification Management'),
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
                'Unable to load municipality information',
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
        title: const Text('Classification Management'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Buttons at the top
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              children: [
                // Add Classification Button
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showClassificationDialog(),
                    icon: const Icon(Icons.add),
                    label: const Text('Add New'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Update/Fetch from Server Button
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _fetchClassificationsFromServer,
                    icon: const Icon(Icons.sync),
                    label: const Text('Update from Server'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Search Section
          Container(
            padding: const EdgeInsets.all(16.0),
            color: Colors.grey[100],
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search classifications...',
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
          
          // Classifications List
          Expanded(
            child: _classificationTypes.isEmpty && !_isLoading
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.category_outlined,
                          size: 64,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'No classifications found',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Add a new classification to get started',
                          style: TextStyle(
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _refreshClassificationTypes,
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16.0),
                      itemCount: _filteredClassificationTypes.length,
                      itemBuilder: (context, index) {
                        final classification = _filteredClassificationTypes[index];
                        return _buildClassificationCard(classification);
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildClassificationCard(Map<String, dynamic> classification) {
    final isActive = classification['is_active'] == 1;
    final color = _parseColor(classification['color']);
    
    // Parse details to show count
    int fieldCount = 0;
    try {
      final detailsString = classification['details'];
      if (detailsString is String && detailsString.isNotEmpty && detailsString != '[]') {
        final parsed = jsonDecode(detailsString);
        if (parsed is List) {
          fieldCount = parsed.length;
        }
      }
    } catch (e) {
      fieldCount = 0;
    }
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      elevation: 2,
      child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
            backgroundColor: color.withOpacity(0.1),
            child: Icon(
              AppIcons.package,
              color: color,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
            children: [
              Expanded(
                child: Text(
                  classification['name'] ?? 'Unknown Classification',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              Container(
                              width: 14,
                              height: 14,
                decoration: BoxDecoration(
                  color: color,
                                borderRadius: BorderRadius.circular(7),
                  border: Border.all(color: Colors.grey[300]!),
                ),
              ),
            ],
          ),
                        if (classification['description'] != null && classification['description'].toString().isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            classification['description'],
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[600],
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                  PopupMenuButton<String>(
                    onSelected: (value) {
                      switch (value) {
                        case 'edit':
                          _showClassificationDialog(classificationToEdit: classification);
                          break;
                        case 'delete':
                          _deleteClassification(classification);
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
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    isActive ? Icons.check_circle : Icons.cancel,
                    size: 14,
                    color: isActive ? Colors.green : Colors.red,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    isActive ? 'Active' : 'Inactive',
                    style: TextStyle(
                      color: isActive ? Colors.green : Colors.red,
                      fontWeight: FontWeight.w500,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Icon(Icons.folder_outlined, size: 14, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '$fieldCount custom ${fieldCount == 1 ? 'field' : 'fields'}',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
            ],
        ),
      ),
    );
  }
}
