import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'dart:io';
import 'dart:convert';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../core/services/database_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../data/models/resident.dart';
import '../../data/database/database_helper.dart';
import '../../utils/image_utils.dart';
import '../../utils/image_storage_helper.dart';
import '../widgets/dynamic_classification_fields.dart';

class AddResidentScreen extends StatefulWidget {
  final Resident? residentToEdit;
  
  const AddResidentScreen({super.key, this.residentToEdit});

  @override
  State<AddResidentScreen> createState() => _AddResidentScreenState();
}

class _AddResidentScreenState extends State<AddResidentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _lastNameController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _suffixController = TextEditingController();
  String? _selectedSex;
  String? _selectedCivilStatus;
  final _birthdateController = TextEditingController();
  final _birthplaceController = TextEditingController();
  final _contactNumberController = TextEditingController();
  final _emailController = TextEditingController();
  final _occupationController = TextEditingController();
  final _monthlyIncomeController = TextEditingController();
  String? _selectedEmploymentStatus;
  String? _selectedEducationAttainment;
  String? _selectedResidentStatus;
  bool _indigenousPerson = false;
  bool _isLoading = false;
  
  // Barangay information from secure storage
  int? _barangayId;
  
  // Classification variables
  List<Map<String, dynamic>> _selectedClassifications = [];
  
  // Image capture variables
  File? _residentImage;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadBarangayId();
    if (widget.residentToEdit != null) {
      _populateFormWithResident(widget.residentToEdit!);
    }
  }

  Future<void> _loadBarangayId() async {
    try {
      final offlineAuthManager = OfflineAuthManager();
      final barangayId = await offlineAuthManager.getBarangayId();
      setState(() {
        _barangayId = barangayId;
      });
      print('🏘️ Loaded barangay ID from secure storage: $_barangayId');
    } catch (e) {
      print('❌ Error loading barangay ID: $e');
      setState(() {
        _barangayId = null;
      });
    }
  }

  @override
  void dispose() {
    _lastNameController.dispose();
    _firstNameController.dispose();
    _middleNameController.dispose();
    _suffixController.dispose();
    _birthdateController.dispose();
    _birthplaceController.dispose();
    _contactNumberController.dispose();
    _emailController.dispose();
    _occupationController.dispose();
    _monthlyIncomeController.dispose();
    super.dispose();
  }

  Future<void> _populateFormWithResident(Resident resident) async {
    print('👤 Initializing resident form for editing: ${resident.fullName}');
    print('   Sex: ${resident.sex}');
    print('   Civil Status: ${resident.civilStatus}');
    print('   Employment Status: ${resident.employmentStatus}');
    print('   Education: ${resident.educationAttainment}');
    
    _lastNameController.text = resident.lastName;
    _firstNameController.text = resident.firstName;
    _middleNameController.text = resident.middleName ?? '';
    _suffixController.text = resident.suffix ?? '';
    _selectedSex = resident.sex;
    _selectedCivilStatus = resident.civilStatus;
    _birthdateController.text = resident.birthdate;
    _birthplaceController.text = resident.birthplace ?? '';
    
    // Format contact number to ensure it has +63 prefix
    if (resident.contactNumber != null && resident.contactNumber!.isNotEmpty) {
      String contactNumber = resident.contactNumber!;
      // If it doesn't start with +63, add it
      if (!contactNumber.startsWith('+63')) {
        // Remove leading 0 if present (common in PH numbers)
        if (contactNumber.startsWith('0')) {
          contactNumber = contactNumber.substring(1);
        }
        contactNumber = '+63$contactNumber';
      }
      _contactNumberController.text = contactNumber;
    }
    
    _emailController.text = resident.email ?? '';
    _occupationController.text = resident.occupation ?? '';
    _monthlyIncomeController.text = resident.monthlyIncome?.toString() ?? '';
    _selectedEmploymentStatus = resident.employmentStatus;
    
    // Validate and normalize education attainment value
    const validEducationValues = [
      'no_formal_education',
      'primary_school',
      'elementary',
      'high_school',
      'vocational',
      'college',
      'post_graduate',
    ];
    _selectedEducationAttainment = validEducationValues.contains(resident.educationAttainment)
        ? resident.educationAttainment
        : null;  // Reset to null if invalid value
    
    _selectedResidentStatus = resident.residentStatus;
    _indigenousPerson = resident.indigenousPerson; // It's already a boolean
    
    if (resident.picturePath != null && resident.picturePath!.isNotEmpty) {
      try {
        final imageFile = File(resident.picturePath!);
        if (await imageFile.exists()) {
          _residentImage = imageFile;
        } else {
          print('⚠️ Resident image file not found: ${resident.picturePath}');
        }
      } catch (e) {
        print('❌ Error loading resident image: $e');
      }
    }
    
    // Load existing classifications for this resident
    _loadResidentClassifications(resident.id);
  }
  
  Future<void> _loadResidentClassifications(String? residentId) async {
    if (residentId == null) return;
    
    try {
      final dbHelper = DatabaseHelper.instance;
      final classifications = await dbHelper.getResidentClassifications(residentId);
      
      if (mounted) {
        setState(() {
          _selectedClassifications = classifications.map((classification) {
            Map<String, dynamic> classificationData = {
              'id': classification['id'],
              'name': classification['classification_type'],
              'description': classification['classification_details'],
            };
            
            // Try to parse dynamic fields from classification_details
            try {
              final detailsString = classification['classification_details'] as String?;
              if (detailsString != null && detailsString.isNotEmpty) {
                // Check if it's JSON (dynamic fields) or plain text
                if (detailsString.startsWith('{') || detailsString.startsWith('[')) {
                  final dynamicFields = jsonDecode(detailsString) as Map<String, dynamic>;
                  classificationData['dynamic_fields'] = dynamicFields;
                }
              }
            } catch (e) {
              // If parsing fails, treat as plain text description
              debugPrint('Error parsing dynamic fields: $e');
            }
            
            return classificationData;
          }).toList();
        });
      }
    } catch (e) {
      debugPrint('Error loading resident classifications: $e');
    }
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().subtract(const Duration(days: 6570)), // 18 years ago
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _birthdateController.text = picked.toIso8601String().split('T')[0];
      });
    }
  }

  Future<void> _showImageSourceDialog() async {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return SafeArea(
          child: AlertDialog(
            title: const Text('Select Image Source'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                ListTile(
                  leading: const Icon(AppIcons.camera),
                  title: const Text('Camera'),
                  onTap: () {
                    Navigator.pop(context);
                    _pickImage(ImageSource.camera);
                  },
                ),
                ListTile(
                  leading: const Icon(AppIcons.fileText),
                  title: const Text('Gallery'),
                  onTap: () {
                    Navigator.pop(context);
                    _pickImage(ImageSource.gallery);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (image != null) {
        // Automatically crop the image
        await _cropImage(File(image.path));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error picking image: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _cropImage(File imageFile) async {
    try {
      final croppedFile = await ImageUtils.cropImage(
        imageFile: imageFile,
        title: 'Crop Resident Photo',
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1.2), // Portrait ratio for shoulder-to-head
        lockAspectRatio: false,
      );

      if (croppedFile != null && mounted) {
        setState(() {
          _residentImage = croppedFile;
        });
      } else if (mounted) {
        // If cropping was cancelled or failed, use the original image
        setState(() {
          _residentImage = imageFile;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Using original image'),
            backgroundColor: AppColors.warning,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        // If cropping fails, use the original image as fallback
        setState(() {
          _residentImage = imageFile;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Cropping failed, using original image'),
            backgroundColor: AppColors.warning,
          ),
        );
      }
    }
  }

  Future<void> _showClassificationDialog() async {
    bool isLoadingDialogShown = false;
    try {
      // Show loading indicator
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const Center(
            child: CircularProgressIndicator(),
          ),
        );
        isLoadingDialogShown = true;
      }
      
      // Get classification types from database with timeout
      final dbHelper = DatabaseHelper.instance;
      final classificationTypes = await dbHelper.getAllClassificationTypes()
          .timeout(
            const Duration(seconds: 10),
            onTimeout: () {
              throw Exception('Classification loading timed out. Please try again.');
            },
          );
      
      // Close loading dialog
      if (mounted && isLoadingDialogShown) {
        Navigator.of(context).pop();
        isLoadingDialogShown = false;
      }
      
      if (!mounted) return;
      
      // Create a copy of selected classifications for the dialog
      List<Map<String, dynamic>> tempSelectedClassifications = List.from(_selectedClassifications);
      Map<String, Map<String, dynamic>> tempDynamicFields = <String, Map<String, dynamic>>{};
      
      // Initialize tempDynamicFields with existing values from previously selected classifications
      for (final classification in _selectedClassifications) {
        final classificationId = classification['id'].toString();
        if (classification.containsKey('dynamic_fields') && classification['dynamic_fields'] != null) {
          tempDynamicFields[classificationId] = Map<String, dynamic>.from(classification['dynamic_fields']);
        }
      }
      
      // Check if we have any classification types
      if (classificationTypes.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('No classification types available. Please sync with server first.'),
              backgroundColor: AppColors.warning,
              duration: Duration(seconds: 3),
            ),
          );
        }
        return;
      }
      
      showDialog(
        context: context,
        builder: (BuildContext context) {
          return StatefulBuilder(
            builder: (context, setDialogState) {
              return Dialog(
                child: Container(
                  width: MediaQuery.of(context).size.width * 0.9,
                  height: MediaQuery.of(context).size.height * 0.8,
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      // Header
                      Row(
                        children: [
                          const Icon(AppIcons.package, size: 20),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              'Select Classifications',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(AppIcons.close, size: 20),
                            padding: const EdgeInsets.all(8),
                            constraints: const BoxConstraints(
                              minWidth: 32,
                              minHeight: 32,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      
                      // Results Count
                      Text(
                        '${classificationTypes.length} classification${classificationTypes.length == 1 ? '' : 's'} available',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 8),
                      
                      // Classifications List
                      Expanded(
                        child: classificationTypes.isEmpty
                            ? const Center(
                                child: Text(
                                  'No classifications found',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey,
                                  ),
                                ),
                              )
                            : ListView.builder(
                                itemCount: classificationTypes.length,
                                itemBuilder: (context, index) {
                                  final classification = classificationTypes[index];
                                  final isSelected = tempSelectedClassifications.any(
                                    (selected) => selected['id'].toString() == classification['id'].toString()
                                  );
                                  
                                  // Parse details if they exist
                                  List<Map<String, dynamic>> details = [];
                                  try {
                                    final detailsString = classification['details'] as String?;
                                    if (detailsString != null && detailsString.isNotEmpty && detailsString != '[]') {
                                      // Try to parse as JSON array first
                                      if (detailsString.startsWith('[')) {
                                        final detailsList = jsonDecode(detailsString) as List<dynamic>;
                                        details = detailsList.map<Map<String, dynamic>>((item) {
                                          if (item is Map<String, dynamic>) {
                                            return item;
                                          } else if (item is String) {
                                            // Convert string to map format
                                            return <String, dynamic>{
                                              'key': 'field_${detailsList.indexOf(item)}',
                                              'label': item,
                                              'type': 'text',
                                            };
                                          } else {
                                            return <String, dynamic>{
                                              'key': 'field_${detailsList.indexOf(item)}',
                                              'label': item.toString(),
                                              'type': 'text',
                                            };
                                          }
                                        }).toList();
                                      } else {
                                        // If it's not a JSON array, treat as plain text
                                        details = [{
                                          'key': 'description',
                                          'label': 'Description',
                                          'type': 'text',
                                        }];
                                      }
                                    }
                                  } catch (e) {
                                    debugPrint('Error parsing classification details: $e');
                                    // Fallback: create a simple text field
                                    details = [{
                                      'key': 'description',
                                      'label': 'Description',
                                      'type': 'text',
                                    }];
                                  }
                                  
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 1),
                                    decoration: BoxDecoration(
                                      border: Border(
                                        bottom: BorderSide(
                                          color: Colors.grey.shade300,
                                          width: 1,
                                        ),
                                      ),
                                    ),
                                    child: Column(
                                      children: [
                                        CheckboxListTile(
                                          contentPadding: const EdgeInsets.symmetric(
                                            horizontal: 16,
                                            vertical: 8,
                                          ),
                                          title: Text(
                                            classification['name'] ?? 'Unknown',
                                            style: TextStyle(
                                              color: isSelected ? AppColors.primary : null,
                                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                              fontSize: 16,
                                            ),
                                          ),
                                          subtitle: classification['description'] != null 
                                              ? Text(
                                                  classification['description'],
                                                  style: const TextStyle(fontSize: 12),
                                                )
                                              : null,
                                          value: isSelected,
                                          onChanged: (bool? value) {
                                            setDialogState(() {
                                              if (value == true) {
                                                // Add classification if not already selected
                                                if (!tempSelectedClassifications.any(
                                                  (selected) => selected['id'] == classification['id']
                                                )) {
                                                  tempSelectedClassifications.add(classification);
                                                }
                                              } else {
                                                // Remove classification
                                                tempSelectedClassifications.removeWhere(
                                                  (selected) => selected['id'] == classification['id']
                                                );
                                                // Remove dynamic fields for this classification
                                                tempDynamicFields.remove(classification['id'].toString());
                                              }
                                            });
                                          },
                                          controlAffinity: ListTileControlAffinity.leading,
                                          activeColor: AppColors.primary,
                                        ),
                                        
                                        // Show dynamic fields if classification is selected and has details
                                        if (isSelected && details.isNotEmpty)
                                          Container(
                                            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: AppColors.primary.withOpacity(0.05),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                                            ),
                                            child: DynamicClassificationFields(
                                              key: ValueKey('classification_${classification['id']}'),
                                              details: details,
                                              initialValues: tempDynamicFields[classification['id'].toString()],
                                              onValuesChanged: (values) {
                                                // Update without rebuilding the entire dialog
                                                tempDynamicFields[classification['id'].toString()] = Map<String, dynamic>.from(values);
                                              },
                                            ),
                                          ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                      ),
                      
                      // Action Buttons
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: () {
                                // Validate that all selected classifications with dynamic fields have values
                                // EXCEPT for "remarks" fields which are optional
                                bool allFieldsFilled = true;
                                String? missingFieldClassification;
                                
                                for (final classification in tempSelectedClassifications) {
                                  final classificationId = classification['id'].toString();
                                  
                                  // Parse details to check if this classification has required fields
                                  try {
                                    final detailsString = classification['details'] as String?;
                                    if (detailsString != null && detailsString.isNotEmpty && detailsString != '[]') {
                                      List<Map<String, dynamic>> details = [];
                                      if (detailsString.startsWith('[')) {
                                        final detailsList = jsonDecode(detailsString) as List<dynamic>;
                                        details = detailsList.map<Map<String, dynamic>>((item) {
                                          if (item is Map<String, dynamic>) {
                                            return item;
                                          }
                                          return <String, dynamic>{};
                                        }).toList();
                                      }
                                      
                                      // If there are details, check if values are provided
                                      if (details.isNotEmpty) {
                                        final dynamicValues = tempDynamicFields[classificationId];
                                        
                                        // Check each field
                                        for (final detail in details) {
                                          final key = detail['key'] as String?;
                                          final label = detail['label'] as String?;
                                          
                                          // Skip validation for "remarks" fields (they are optional)
                                          if (key != null && 
                                              !key.toLowerCase().contains('remark') && 
                                              !(label?.toLowerCase().contains('remark') ?? false)) {
                                            final value = dynamicValues?[key];
                                            // Check if field is empty
                                            if (value == null || (value is String && value.trim().isEmpty)) {
                                              allFieldsFilled = false;
                                              missingFieldClassification = classification['name'] ?? 'Unknown';
                                              break;
                                            }
                                          }
                                        }
                                      }
                                    }
                                  } catch (e) {
                                    debugPrint('Error validating classification fields: $e');
                                  }
                                  
                                  if (!allFieldsFilled) break;
                                }
                                
                                // Show error if fields are missing
                                if (!allFieldsFilled) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        'Please fill in all required fields for "$missingFieldClassification"',
                                      ),
                                      backgroundColor: AppColors.warning,
                                      duration: const Duration(seconds: 3),
                                    ),
                                  );
                                  return;
                                }
                                
                                // All validations passed, save and close
                                setState(() {
                                  // Create new mutable copies of classifications
                                  _selectedClassifications = tempSelectedClassifications.map((classification) {
                                    final newClassification = Map<String, dynamic>.from(classification);
                                    final classificationId = classification['id'].toString();
                                    if (tempDynamicFields.containsKey(classificationId)) {
                                      newClassification['dynamic_fields'] = Map<String, dynamic>.from(tempDynamicFields[classificationId]!);
                                    }
                                    return newClassification;
                                  }).toList();
                                });
                                Navigator.of(context).pop();
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                              child: Text('Done (${tempSelectedClassifications.length})'),
                            ),
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
    } catch (e) {
      // Close loading dialog if it's still open
      if (mounted && isLoadingDialogShown) {
        try {
          Navigator.of(context).pop();
          isLoadingDialogShown = false;
        } catch (popError) {
          // Dialog might already be closed
          debugPrint('Error closing loading dialog: $popError');
        }
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading classifications: $e'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 5),
          ),
        );
      }
      debugPrint('Error loading classifications: $e');
    }
  }

  Future<void> _saveResident() async {
    // Validate required dropdown selections
    if (_selectedSex == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select sex'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    
    if (_selectedCivilStatus == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select civil status'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    
    if (_selectedEmploymentStatus == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select employment status'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    
    if (_selectedEducationAttainment == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select education level'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    
    if (_selectedResidentStatus == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select resident status'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    if (_barangayId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Barangay information not found. Please log in again.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      // Clean contact number (remove spaces) before saving
      String? cleanContactNumber;
      if (_contactNumberController.text.trim().isNotEmpty) {
        cleanContactNumber = _contactNumberController.text.replaceAll(' ', '');
      }
      
      // Save to database
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      // For new residents, we need to generate the ID first to save the image with proper filename
      // For existing residents, we already have the ID
      String residentIdForImage;
      if (widget.residentToEdit != null) {
        residentIdForImage = widget.residentToEdit!.id!;
      } else {
        // Generate a temporary ID for new resident (will be replaced with actual UUID after create)
        residentIdForImage = 'TEMP_${DateTime.now().millisecondsSinceEpoch}';
      }
      
      // Save image to permanent storage BEFORE creating database record
      // This prevents temp file cleanup issues during sync
      String? permanentImagePath;
      if (_residentImage != null) {
        print('📸 Saving image to permanent storage before database save...');
        try {
          // For edit mode, use the actual resident ID
          // For create mode, we'll save with temp ID and rename after getting real ID
          if (widget.residentToEdit != null) {
            permanentImagePath = await ImageStorageHelper.saveResidentImage(
              _residentImage!,
              residentIdForImage,
            );
            print('✅ Image saved to permanent storage: $permanentImagePath');
          } else {
            // For new residents, save with temp name first
            permanentImagePath = _residentImage!.path;
            print('ℹ️ Will save image after resident creation with proper ID');
          }
        } catch (e) {
          print('❌ Error saving image to permanent storage: $e');
          // Continue without image rather than failing entirely
        }
      }
      
      final resident = Resident(
        barangayId: _barangayId!, // Dynamic barangay ID from secure storage
        lastName: _lastNameController.text.trim(),
        firstName: _firstNameController.text.trim(),
        middleName: _middleNameController.text.trim().isEmpty 
            ? null 
            : _middleNameController.text.trim(),
        suffix: _suffixController.text.trim().isEmpty 
            ? null 
            : _suffixController.text.trim(),
        sex: _selectedSex!,
        civilStatus: _selectedCivilStatus!,
        birthdate: _birthdateController.text,
        birthplace: _birthplaceController.text.trim().isEmpty 
            ? null 
            : _birthplaceController.text.trim(),
        contactNumber: cleanContactNumber,
        email: _emailController.text.trim().isEmpty 
            ? null 
            : _emailController.text.trim(),
        occupation: _occupationController.text.trim().isEmpty 
            ? null 
            : _occupationController.text.trim(),
        monthlyIncome: _monthlyIncomeController.text.trim().isEmpty 
            ? null 
            : double.tryParse(_monthlyIncomeController.text.trim()),
        employmentStatus: _selectedEmploymentStatus!,
        educationAttainment: _selectedEducationAttainment!,
        residentStatus: _selectedResidentStatus!,
        picturePath: permanentImagePath, // Use permanent path from the start
        indigenousPerson: _indigenousPerson,
      );

      // Validate resident
      if (!resident.isValid()) {
        final errors = resident.getValidationErrors();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Validation errors: ${errors.join(', ')}'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
      
      Resident savedResident;
      if (widget.residentToEdit != null) {
        // Update existing resident (image already saved with proper filename above)
        final updatedResident = resident.copyWith(
          id: widget.residentToEdit!.id ?? '',
          localId: widget.residentToEdit!.localId,
          createdAt: widget.residentToEdit!.createdAt,
        );
        savedResident = await databaseService.residentRepository.update(updatedResident);
        print('✅ Resident updated in database with permanent image path');
      } else {
        // Create new resident
        savedResident = await databaseService.residentRepository.create(resident);
        print('✅ New resident created in database');
        
        // Now save image with proper resident ID
        if (_residentImage != null && savedResident.id != null) {
          print('📸 Saving image with proper resident ID: ${savedResident.id}');
          final String? properImagePath = await ImageStorageHelper.saveResidentImage(
            _residentImage!,
            savedResident.id!,
          );
          
          if (properImagePath != null) {
            // Update resident with proper image path
            savedResident = await databaseService.residentRepository.update(
              savedResident.copyWith(picturePath: properImagePath)
            );
            print('✅ Resident image path updated to: $properImagePath');
          } else {
            print('⚠️ Failed to save image with proper filename');
          }
        }
      }
      
      // Save resident classifications if any are selected
      if (_selectedClassifications.isNotEmpty && savedResident.id != null) {
        final dbHelper = DatabaseHelper.instance;
        
        // Prepare classifications with dynamic field data
        List<Map<String, dynamic>> classificationsToSave = [];
        for (final classification in _selectedClassifications) {
          Map<String, dynamic> classificationData = {
            'id': classification['id'],
            'name': classification['name'],
            'description': classification['description'],
          };
          
          // Include dynamic fields if they exist
          if (classification.containsKey('dynamic_fields') && 
              classification['dynamic_fields'] != null) {
            classificationData['dynamic_fields'] = classification['dynamic_fields'];
          }
          
          classificationsToSave.add(classificationData);
        }
        
        await dbHelper.insertResidentClassifications(savedResident.id!, classificationsToSave);
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.residentToEdit != null 
                ? 'Resident updated successfully!' 
                : 'Resident saved successfully! ID: ${savedResident.id}'),
            backgroundColor: AppColors.success,
          ),
        );
        
        // Navigate back with success result
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving resident: $e'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 5),
          ),
        );
      }
      debugPrint('Error saving resident: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.residentToEdit != null ? 'Edit Resident' : 'Add Resident'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _saveResident,
            child: Text(
              widget.residentToEdit != null ? 'Update' : 'Save',
              style: TextStyle(
                color: _isLoading ? Colors.grey : AppColors.primaryLight,
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(12.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Resident Photo Section
              _buildResidentPhotoSection(),
              
              const SizedBox(height: 20),
              
              // Personal Information
              _buildSectionHeader('Personal Information'),
              const SizedBox(height: 16),
              
              // Name fields
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _lastNameController,
                      decoration: const InputDecoration(
                        labelText: 'Last Name *',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Last name is required';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _firstNameController,
                      decoration: const InputDecoration(
                        labelText: 'First Name *',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'First name is required';
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                controller: _middleNameController,
                decoration: const InputDecoration(
                        labelText: 'Middle Name (Optional)',
                  border: OutlineInputBorder(),
                ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _suffixController,
                      decoration: const InputDecoration(
                        labelText: 'Suffix (Optional)',
                        border: OutlineInputBorder(),
                        hintText: 'Jr., Sr., III, etc.',
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Sex
              DropdownButtonFormField<String>(
                      value: _selectedSex,
                      decoration: const InputDecoration(
                        labelText: 'Sex *',
                        border: OutlineInputBorder(),
                  hintText: 'Select sex',
                      ),
                      items: const [
                        DropdownMenuItem(value: null, child: Text('Select sex...')),
                        DropdownMenuItem(value: 'male', child: Text('Male')),
                        DropdownMenuItem(value: 'female', child: Text('Female')),
                      ],
                      onChanged: (value) {
                        setState(() {
                    _selectedSex = value;
                        });
                      },
                    ),
              
              const SizedBox(height: 16),
              
              // Civil Status
              DropdownButtonFormField<String>(
                      value: _selectedCivilStatus,
                      decoration: const InputDecoration(
                        labelText: 'Civil Status *',
                        border: OutlineInputBorder(),
                  hintText: 'Select civil status',
                      ),
                      items: const [
                        DropdownMenuItem(value: null, child: Text('Select civil status...')),
                        DropdownMenuItem(value: 'single', child: Text('Single')),
                        DropdownMenuItem(value: 'married', child: Text('Married')),
                        DropdownMenuItem(value: 'live_in', child: Text('Live-in')),
                        DropdownMenuItem(value: 'widowed', child: Text('Widowed')),
                        DropdownMenuItem(value: 'separated', child: Text('Separated')),
                        DropdownMenuItem(value: 'divorced', child: Text('Divorced')),
                      ],
                      onChanged: (value) {
                        setState(() {
                    _selectedCivilStatus = value;
                        });
                      },
              ),
              
              const SizedBox(height: 16),
              
              // Birthdate
              TextFormField(
                controller: _birthdateController,
                decoration: const InputDecoration(
                  labelText: 'Birthdate *',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(AppIcons.calendar),
                ),
                readOnly: true,
                onTap: _selectDate,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Birthdate is required';
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              // Birthplace
              TextFormField(
                controller: _birthplaceController,
                decoration: const InputDecoration(
                  labelText: 'Birthplace (Optional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(AppIcons.mapPin),
                  hintText: 'City, Province, Country',
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Contact Information
              _buildSectionHeader('Contact Information'),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _contactNumberController,
                decoration: const InputDecoration(
                  labelText: 'Contact Number (Optional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(AppIcons.phone),
                  hintText: '+639171234567',
                  // helperText: 'Philippine format (no spaces)',
                  helperMaxLines: 1,
                ),
                keyboardType: TextInputType.phone,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'[\d+]')),
                  LengthLimitingTextInputFormatter(13), // Limit to exactly 13 chars (+63 + 10 digits)
                  _PhilippinePhoneNumberFormatter(),
                ],
                validator: (value) {
                  if (value != null && value.trim().isNotEmpty) {
                    // Remove spaces for validation
                    final cleanValue = value.replaceAll(' ', '');
                    
                    // Check if it starts with +63
                    if (!cleanValue.startsWith('+63')) {
                      return 'Phone number must start with +63';
                    }
                    
                    // Check exact length: +63 + 10 digits = 13 characters
                    if (cleanValue.length != 13) {
                      return 'Phone number must be exactly 10 digits after +63';
                    }
                    
                    // Check if it contains only numbers after +63
                    final digitsAfterPrefix = cleanValue.substring(3);
                    if (!RegExp(r'^\d{10}$').hasMatch(digitsAfterPrefix)) {
                      return 'Invalid phone number format';
                    }
                    
                    // Check if it starts with 9 (Philippine mobile numbers)
                    if (!digitsAfterPrefix.startsWith('9')) {
                      return 'Philippine mobile numbers must start with 9';
                    }
                  }
                  return null;
                },
              ),
              
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email (Optional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(AppIcons.mail),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              
              const SizedBox(height: 20),
              
              // Employment & Education Information
              _buildSectionHeader('Employment & Education'),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _occupationController,
                decoration: const InputDecoration(
                  labelText: 'Occupation (Optional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(AppIcons.building),
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Employment Status
              DropdownButtonFormField<String>(
                value: _selectedEmploymentStatus,
                decoration: const InputDecoration(
                  labelText: 'Employment Status *',
                  border: OutlineInputBorder(),
                  hintText: 'Select employment status',
                ),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Select employment status...')),
                  DropdownMenuItem(value: 'employed', child: Text('Employed')),
                  DropdownMenuItem(value: 'unemployed', child: Text('Unemployed')),
                  DropdownMenuItem(value: 'self-employed', child: Text('Self-Employed')),
                  DropdownMenuItem(value: 'student', child: Text('Student')),
                  DropdownMenuItem(value: 'retired', child: Text('Retired')),
                  DropdownMenuItem(value: 'not_applicable', child: Text('Not Applicable')),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedEmploymentStatus = value;
                  });
                },
              ),
              
              const SizedBox(height: 16),
              
              // Education Level
              DropdownButtonFormField<String>(
                value: _selectedEducationAttainment,
                decoration: const InputDecoration(
                  labelText: 'Education Level *',
                  border: OutlineInputBorder(),
                  hintText: 'Select education level',
                ),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Select education level...')),
                  DropdownMenuItem(value: 'no_formal_education', child: Text('No Formal Education')),
                  DropdownMenuItem(value: 'primary_school', child: Text('Primary School')),
                  DropdownMenuItem(value: 'elementary', child: Text('Elementary')),
                  DropdownMenuItem(value: 'high_school', child: Text('High School')),
                  DropdownMenuItem(value: 'vocational', child: Text('Vocational')),
                  DropdownMenuItem(value: 'college', child: Text('College')),
                  DropdownMenuItem(value: 'post_graduate', child: Text('Post Graduate')),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedEducationAttainment = value;
                  });
                },
              ),
              
              const SizedBox(height: 16),
              
              // Monthly Income
              TextFormField(
                controller: _monthlyIncomeController,
                decoration: const InputDecoration(
                  labelText: 'Monthly Income (Optional)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(AppIcons.barChart),
                  hintText: 'Enter amount in PHP',
                ),
                keyboardType: TextInputType.number,
              ),
              
              const SizedBox(height: 16),
              
              // Resident Status
              DropdownButtonFormField<String>(
                value: _selectedResidentStatus,
                decoration: const InputDecoration(
                  labelText: 'Resident Status *',
                  border: OutlineInputBorder(),
                  hintText: 'Select resident status',
                ),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Select resident status...')),
                  DropdownMenuItem(value: 'active', child: Text('Active')),
                  DropdownMenuItem(value: 'temporarily_away', child: Text('Temporarily Away')),
                  DropdownMenuItem(value: 'deceased', child: Text('Deceased')),
                  DropdownMenuItem(value: 'moved_out', child: Text('Moved Out')),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedResidentStatus = value;
                  });
                },
              ),
              
              const SizedBox(height: 16),
              
              // Indigenous Person Checkbox
              CheckboxListTile(
                title: const Text('Indigent Person'),
                subtitle: const Text('Check if the resident is an indigent person'),
                value: _indigenousPerson,
                onChanged: (value) {
                  setState(() {
                    _indigenousPerson = value ?? false;
                  });
                },
                controlAffinity: ListTileControlAffinity.leading,
              ),
              
              const SizedBox(height: 20),
              
              // Classification Section
              _buildSectionHeader('Classification'),
              const SizedBox(height: 16),
              
              // Classification Selection Button
              Container(
                decoration: BoxDecoration(
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ListTile(
                  leading: const Icon(AppIcons.package, color: AppColors.primary),
                  title: Text(
                    _selectedClassifications.isEmpty 
                        ? 'Choose Classifications' 
                        : '${_selectedClassifications.length} Classification${_selectedClassifications.length == 1 ? '' : 's'} Selected',
                    style: TextStyle(
                      color: _selectedClassifications.isNotEmpty 
                          ? AppColors.textPrimary 
                          : AppColors.textSecondary,
                    ),
                  ),
                  subtitle: _selectedClassifications.isEmpty
                      ? const Text('Select one or more classification types')
                      : Text(_selectedClassifications.map((c) => c['name']).join(', ')),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (_selectedClassifications.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.clear, color: AppColors.error),
                          onPressed: () {
                            setState(() {
                              _selectedClassifications.clear();
                            });
                          },
                        ),
                      const Icon(Icons.arrow_forward_ios, size: 16),
                    ],
                  ),
                  onTap: _showClassificationDialog,
                ),
              ),
              
              const SizedBox(height: 32),
              
              // Save Button
              ElevatedButton(
                onPressed: _isLoading ? null : _saveResident,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        widget.residentToEdit != null ? 'Update Resident' : 'Save Resident',
                        style: const TextStyle(fontSize: 16),
                      ),
              ),
            ],
          ),
        ),
      ),
      ), // Closes SafeArea
    );
  }

  Widget _buildSectionHeader(String title) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
      ),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppColors.primary,
        ),
      ),
    );
  }

  Widget _buildResidentPhotoSection() {
    return Center(
      child: Column(
        children: [
          // Resident Image
          GestureDetector(
            onTap: _showImageSourceDialog,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.primary,
                  width: 3,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: _residentImage != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: Image.file(
                        _residentImage!,
                        fit: BoxFit.cover,
                      ),
                    )
                  : Icon(
                      AppIcons.resident,
                      size: 60,
                      color: AppColors.primary,
                    ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Image Instructions
          Text(
            'Tap to add resident photo',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom TextInputFormatter for Philippine phone numbers
/// Automatically adds +63 prefix and ensures proper format
class _PhilippinePhoneNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    String text = newValue.text;
    
    // If user cleared the field, allow it
    if (text.isEmpty) {
      return newValue;
    }
    
    // If user is typing and doesn't have +63, add it automatically
    if (!text.startsWith('+63')) {
      // Remove any leading + or 63 they might have typed
      text = text.replaceAll(RegExp(r'^[\+63]*'), '');
      // Add the +63 prefix
      text = '+63$text';
    }
    
    // Ensure only one +63 prefix exists
    if (text.startsWith('+63') && text.indexOf('+63', 1) > 0) {
      text = '+63${text.substring(3).replaceAll('+63', '')}';
    }
    
    // Remove any non-digit characters after +63
    if (text.length > 3) {
      final prefix = text.substring(0, 3); // +63
      final digits = text.substring(3).replaceAll(RegExp(r'\D'), ''); // Only digits
      text = prefix + digits;
    }
    
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}
