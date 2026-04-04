import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'dart:io';
import 'dart:async';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../core/services/database_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../data/models/pet.dart';
import '../../data/models/resident.dart';
import '../../utils/image_utils.dart';
import '../../utils/image_storage_helper.dart';

class PetFormScreen extends StatefulWidget {
  final Pet? pet;
  final bool readOnly;

  const PetFormScreen({
    super.key,
    this.pet,
    this.readOnly = false,
  });

  @override
  State<PetFormScreen> createState() => _PetFormScreenState();
}

class _PetFormScreenState extends State<PetFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final DatabaseService _databaseService = DatabaseService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  
  // Form controllers
  final _petNameController = TextEditingController();
  final _speciesController = TextEditingController();
  final _breedController = TextEditingController();
  final _colorController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  // Form state
  String? _selectedOwnerId;
  String? _selectedSex;
  DateTime? _selectedBirthdate;
  bool _isVaccinated = false;
  DateTime? _vaccinationDate;
  
  List<Resident> _residents = [];
  bool _isLoading = true;
  int? _barangayId;
  
  // Image capture variables
  File? _petImage;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _initializeForm();
    _loadBarangayIdAndResidents();
  }

  Future<void> _loadBarangayIdAndResidents() async {
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
    _petNameController.dispose();
    _speciesController.dispose();
    _breedController.dispose();
    _colorController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _initializeForm() async {
    if (widget.pet != null) {
      final pet = widget.pet!;
      print('🐾 Initializing pet form for editing: ${pet.petName}');
      print('   Owner ID: ${pet.ownerId}');
      print('   Sex: ${pet.sex}');
      print('   Birthdate: ${pet.birthdate}');
      
      _petNameController.text = pet.petName;
      _speciesController.text = pet.species;
      _breedController.text = pet.breed;
      _colorController.text = pet.color;
      _descriptionController.text = pet.description ?? '';
      _selectedOwnerId = pet.ownerId;
      _selectedSex = pet.sex;
      _selectedBirthdate = DateTime.tryParse(pet.birthdate);
      _isVaccinated = pet.isVaccinated;
      _vaccinationDate = pet.vaccinationDate != null 
          ? DateTime.tryParse(pet.vaccinationDate!) 
          : null;
      
      // Load pet image if exists
      if (pet.picturePath != null && pet.picturePath!.isNotEmpty) {
        try {
          final imageFile = File(pet.picturePath!);
          if (await imageFile.exists()) {
            _petImage = imageFile;
          } else {
            print('⚠️ Pet image file not found: ${pet.picturePath}');
          }
        } catch (e) {
          print('❌ Error loading pet image: $e');
        }
      }
    }
  }

  Resident? _getSelectedOwner() {
    if (_selectedOwnerId == null) return null;
    try {
      return _residents.firstWhere((resident) => resident.id == _selectedOwnerId);
    } catch (e) {
      print('⚠️ Selected owner $_selectedOwnerId not found in residents list');
      return null;
    }
  }

  Future<void> _loadResidents() async {
    try {
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      print('🐾 Loading residents for pet owner selection, barangay: $_barangayId');
      final residents = await _databaseService.residentRepository.getAll(barangayId: _barangayId);
      print('   Found ${residents.length} residents in barangay $_barangayId');
      setState(() {
        _residents = residents;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading residents: $e');
      setState(() {
        _isLoading = false;
      });
      _showErrorSnackBar('Error loading residents: $e');
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

  Future<void> _showImageSourceDialog() async {
    if (widget.readOnly) return;
    
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
        title: 'Crop Pet Photo',
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1), // Square ratio for pets
        lockAspectRatio: false,
      );

      if (croppedFile != null && mounted) {
        setState(() {
          _petImage = croppedFile;
        });
      } else if (mounted) {
        // If cropping was cancelled or failed, use the original image
        setState(() {
          _petImage = imageFile;
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
          _petImage = imageFile;
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

  Future<void> _selectDate(BuildContext context, bool isVaccinationDate) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isVaccinationDate 
          ? (_vaccinationDate ?? DateTime.now())
          : (_selectedBirthdate ?? DateTime.now()),
      firstDate: isVaccinationDate 
          ? DateTime(1900)
          : DateTime(1900),
      lastDate: DateTime.now(),
    );
    
    if (picked != null) {
      setState(() {
        if (isVaccinationDate) {
          _vaccinationDate = picked;
        } else {
          _selectedBirthdate = picked;
        }
      });
    }
  }

  Future<void> _showOwnerSelectionDialog() async {
    final result = await showDialog<Resident>(
      context: context,
      builder: (context) => OwnerSelectionDialog(
        availableResidents: _residents,
      ),
    );

    if (result != null) {
      setState(() {
        _selectedOwnerId = result.id;
      });
    }
  }

  Future<void> _savePet() async {
    // Validate owner selection
    if (_selectedOwnerId == null || _selectedOwnerId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an owner for the pet'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    if (!_formKey.currentState!.validate()) return;

    try {
      final pet = Pet(
        id: widget.pet?.id,
        ownerId: _selectedOwnerId!,
        petName: _petNameController.text.trim(),
        species: _speciesController.text.trim(),
        breed: _breedController.text.trim(),
        sex: _selectedSex!,
        birthdate: _selectedBirthdate!.toIso8601String().split('T')[0],
        color: _colorController.text.trim(),
        description: _descriptionController.text.trim().isEmpty 
            ? null 
            : _descriptionController.text.trim(),
        isVaccinated: _isVaccinated,
        vaccinationDate: _vaccinationDate?.toIso8601String().split('T')[0],
        picturePath: _petImage?.path,
        syncStatus: widget.pet?.syncStatus ?? 'pending',
        serverId: widget.pet?.serverId,
        createdAt: widget.pet?.createdAt,
        updatedAt: widget.pet?.updatedAt,
      );

      Pet savedPet;
      if (widget.pet != null) {
        savedPet = await _databaseService.petsRepository.update(pet);
        
        // Save image with proper filename if image changed
        // IMPORTANT: Save to permanent storage immediately to prevent temp file cleanup
        if (_petImage != null && savedPet.ownerId.isNotEmpty) {
          print('📸 Saving pet image to permanent storage...');
          print('   Owner ID: ${savedPet.ownerId}');
          try {
            final String? properImagePath = await ImageStorageHelper.savePetImage(
              _petImage!,
              savedPet.ownerId,
            );
            
            if (properImagePath != null) {
              print('✅ Pet image saved to permanent storage: $properImagePath');
              // Update pet with proper image path
              savedPet = await _databaseService.petsRepository.update(
                savedPet.copyWith(picturePath: properImagePath)
              );
              print('✅ Pet database updated with permanent image path');
            } else {
              print('⚠️ Failed to save pet image to permanent storage');
              print('   Original path will be kept: ${_petImage!.path}');
            }
          } catch (e) {
            print('❌ Error saving pet image: $e');
            // Don't throw - pet already saved successfully
          }
        }
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Pet updated successfully'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } else {
        savedPet = await _databaseService.petsRepository.create(pet);
        
        // Save image with proper filename using owner ID
        // IMPORTANT: Save to permanent storage immediately to prevent temp file cleanup
        if (_petImage != null && savedPet.ownerId.isNotEmpty) {
          print('📸 Saving pet image to permanent storage...');
          print('   Owner ID: ${savedPet.ownerId}');
          try {
            final String? properImagePath = await ImageStorageHelper.savePetImage(
              _petImage!,
              savedPet.ownerId,
            );
            
            if (properImagePath != null) {
              print('✅ Pet image saved to permanent storage: $properImagePath');
              // Update pet with proper image path
              savedPet = await _databaseService.petsRepository.update(
                savedPet.copyWith(picturePath: properImagePath)
              );
              print('✅ Pet database updated with permanent image path');
            } else {
              print('⚠️ Failed to save pet image to permanent storage');
              print('   Original path will be kept: ${_petImage!.path}');
            }
          } catch (e) {
            print('❌ Error saving pet image: $e');
            // Don't throw - pet already saved successfully
          }
        }
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Pet added successfully'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      }

      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      debugPrint('Error saving pet: $e');
      _showErrorSnackBar('Error saving pet: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.readOnly 
            ? 'Pet Details' 
            : (widget.pet != null ? 'Edit Pet' : 'Add Pet')),
        actions: widget.readOnly ? null : [
          TextButton(
            onPressed: _isLoading ? null : _savePet,
            child: Text(
              widget.pet != null ? 'Update' : 'Save',
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
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(12.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                    // Pet Photo Section
                    _buildPetPhotoSection(),
                    
                    const SizedBox(height: 20),
                    
                    // Basic Information
                    _buildSectionHeader('Basic Information'),
                    const SizedBox(height: 16),
                    
                    // Pet Name
                    TextFormField(
                      controller: _petNameController,
                      decoration: const InputDecoration(
                        labelText: 'Pet Name *',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(AppIcons.pet),
                      ),
                      readOnly: widget.readOnly,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter pet name';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Owner Selection Button
                    ElevatedButton.icon(
                      onPressed: widget.readOnly ? null : _showOwnerSelectionDialog,
                      icon: const Icon(Icons.person_add),
                      label: Text(_selectedOwnerId != null 
                          ? 'Change Pet Owner' 
                          : 'Select Pet Owner *'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _selectedOwnerId != null ? Colors.green : Colors.blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        minimumSize: const Size(double.infinity, 50),
                      ),
                    ),
                    
                    // Selected Pet Owner Display
                    if (_selectedOwnerId != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.success.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.success.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.person, color: AppColors.success),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Selected Pet Owner:',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.success,
                                    ),
                                  ),
                                  Text(_getSelectedOwner()?.fullName ?? 'Unknown Owner'),
                                  Text('${_getSelectedOwner()?.sex ?? 'Unknown'} • ${_getSelectedOwner()?.civilStatus ?? 'Unknown'}'),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.remove_circle, color: Colors.red),
                              onPressed: widget.readOnly ? null : () {
                                setState(() {
                                  _selectedOwnerId = null;
                                });
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),

                    // Species and Breed Row
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _speciesController,
                            decoration: const InputDecoration(
                              labelText: 'Species *',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(AppIcons.pet),
                            ),
                            readOnly: widget.readOnly,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Required';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: TextFormField(
                            controller: _breedController,
                            decoration: const InputDecoration(
                              labelText: 'Breed *',
                              border: OutlineInputBorder(),
                            ),
                            readOnly: widget.readOnly,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Required';
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Sex and Birthdate Row
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: _selectedSex,
                            decoration: const InputDecoration(
                              labelText: 'Sex *',
                              border: OutlineInputBorder(),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'male', child: Text('Male')),
                              DropdownMenuItem(value: 'female', child: Text('Female')),
                            ],
                            onChanged: widget.readOnly ? null : (value) {
                              setState(() {
                                _selectedSex = value;
                              });
                            },
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Required';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: TextFormField(
                            decoration: const InputDecoration(
                              labelText: 'Birthdate *',
                              border: OutlineInputBorder(),
                              prefixIcon: Icon(AppIcons.calendar),
                            ),
                            readOnly: true,
                            controller: TextEditingController(
                              text: _selectedBirthdate != null
                                  ? '${_selectedBirthdate!.day}/${_selectedBirthdate!.month}/${_selectedBirthdate!.year}'
                                  : '',
                            ),
                            onTap: widget.readOnly ? null : () => _selectDate(context, false),
                            validator: (value) {
                              if (_selectedBirthdate == null) {
                                return 'Required';
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Color
                    TextFormField(
                      controller: _colorController,
                      decoration: const InputDecoration(
                        labelText: 'Color *',
                        border: OutlineInputBorder(),
                      ),
                      readOnly: widget.readOnly,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter pet color';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),
                    
                    // Vaccination Information
                    _buildSectionHeader('Vaccination Information'),
                    const SizedBox(height: 16),
                    
                    // Vaccination Section
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SwitchListTile(
                              title: const Text('Is Vaccinated'),
                              subtitle: const Text('Mark if the pet is vaccinated'),
                              value: _isVaccinated,
                              onChanged: widget.readOnly ? null : (value) {
                                setState(() {
                                  _isVaccinated = value;
                                  if (!value) {
                                    _vaccinationDate = null;
                                  }
                                });
                              },
                              activeColor: AppColors.primary,
                            ),
                            if (_isVaccinated) ...[
                              const SizedBox(height: 8),
                              TextFormField(
                                decoration: const InputDecoration(
                                  labelText: 'Vaccination Date',
                                  border: OutlineInputBorder(),
                                  prefixIcon: Icon(AppIcons.calendar),
                                ),
                                readOnly: true,
                                controller: TextEditingController(
                                  text: _vaccinationDate != null
                                      ? '${_vaccinationDate!.day}/${_vaccinationDate!.month}/${_vaccinationDate!.year}'
                                      : '',
                                ),
                                onTap: widget.readOnly ? null : () => _selectDate(context, true),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    
                    // Additional Information
                    _buildSectionHeader('Additional Information'),
                    const SizedBox(height: 16),

                    // Description
                    TextFormField(
                      controller: _descriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(AppIcons.fileText),
                      ),
                      maxLines: 3,
                      readOnly: widget.readOnly,
                    ),
                    const SizedBox(height: 32),

                    // Save Button (for mobile)
                    if (!widget.readOnly)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _savePet,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: Text(
                            widget.pet != null ? 'Update Pet' : 'Add Pet',
                            style: const TextStyle(fontSize: 16),
                          ),
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

  Widget _buildPetPhotoSection() {
    return Center(
      child: Column(
        children: [
          // Pet Image
          GestureDetector(
            onTap: widget.readOnly ? null : _showImageSourceDialog,
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
              child: _petImage != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: Image.file(
                        _petImage!,
                        fit: BoxFit.cover,
                      ),
                    )
                  : Icon(
                      AppIcons.pet,
                      size: 60,
                      color: AppColors.primary,
                    ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Image Instructions
          Text(
            widget.readOnly ? 'Pet photo' : 'Tap to add pet photo',
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

class OwnerSelectionDialog extends StatefulWidget {
  final List<Resident> availableResidents;

  const OwnerSelectionDialog({
    super.key,
    required this.availableResidents,
  });

  @override
  State<OwnerSelectionDialog> createState() => _OwnerSelectionDialogState();
}

class _OwnerSelectionDialogState extends State<OwnerSelectionDialog> {
  final _searchController = TextEditingController();
  List<Resident> _filteredResidents = [];
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    _filteredResidents = widget.availableResidents;
    _searchController.addListener(_filterResidents);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchDebounce?.cancel();
    super.dispose();
  }

  void _filterResidents() {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      setState(() {
        final query = _searchController.text.toLowerCase();
        if (query.isEmpty) {
          _filteredResidents = widget.availableResidents;
        } else {
          _filteredResidents = widget.availableResidents.where((resident) {
            return resident.fullName.toLowerCase().contains(query) ||
                   resident.firstName.toLowerCase().contains(query) ||
                   resident.lastName.toLowerCase().contains(query);
          }).toList();
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
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
                const Icon(AppIcons.plus, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Select Pet Owner',
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
            
            // Search Field
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search residents...',
                prefixIcon: const Icon(AppIcons.search, size: 18),
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(AppIcons.close, size: 16),
                        onPressed: () {
                          _searchController.clear();
                        },
                        padding: const EdgeInsets.all(8),
                        constraints: const BoxConstraints(
                          minWidth: 24,
                          minHeight: 24,
                        ),
                      )
                    : null,
              ),
            ),
            const SizedBox(height: 8),
            
            // Results Count
            Text(
              '${_filteredResidents.length} found',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 4),
            
            // Residents List
            Expanded(
              child: _filteredResidents.isEmpty
                  ? const Center(
                      child: Text(
                        'No residents found',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey,
                        ),
                      ),
                    )
                  : ListView.builder(
                      itemCount: _filteredResidents.length,
                      itemBuilder: (context, index) {
                        final resident = _filteredResidents[index];
                        
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
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            title: Text(
                              resident.fullName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 16,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${resident.sex} • ${resident.civilStatus}',
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ],
                            ),
                            trailing: IconButton(
                              onPressed: () => Navigator.of(context).pop(resident),
                              icon: const Icon(
                                AppIcons.plus,
                                color: AppColors.primary,
                                size: 20,
                              ),
                              padding: const EdgeInsets.all(8),
                              constraints: const BoxConstraints(
                                minWidth: 32,
                                minHeight: 32,
                              ),
                            ),
                            onTap: () => Navigator.of(context).pop(resident),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
