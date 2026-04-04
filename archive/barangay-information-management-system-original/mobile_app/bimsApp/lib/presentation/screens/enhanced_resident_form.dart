import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../core/constants/app_colors.dart';
import '../../core/services/database_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../data/models/resident.dart';

class EnhancedResidentForm extends StatefulWidget {
  final Resident? resident; // For editing existing residents
  
  const EnhancedResidentForm({super.key, this.resident});

  @override
  State<EnhancedResidentForm> createState() => _EnhancedResidentFormState();
}

class _EnhancedResidentFormState extends State<EnhancedResidentForm> {
  final _formKey = GlobalKey<FormState>();
  final _lastNameController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _suffixController = TextEditingController();
  final _birthplaceController = TextEditingController();
  final _contactNumberController = TextEditingController();
  final _emailController = TextEditingController();
  final _occupationController = TextEditingController();
  final _monthlyIncomeController = TextEditingController();
  final _educationController = TextEditingController();
  
  String _selectedSex = 'male';
  String _selectedCivilStatus = 'single';
  String _selectedEmploymentStatus = 'employed';
  String _selectedResidentStatus = 'active';
  final _birthdateController = TextEditingController();
  
  File? _profileImage;
  final ImagePicker _picker = ImagePicker();
  bool _isLoading = false;
  bool _isIndigenousPerson = false;
  
  // Barangay information from secure storage
  int? _barangayId;

  @override
  void initState() {
    super.initState();
    _loadBarangayId();
    if (widget.resident != null) {
      _loadExistingResident();
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

  void _loadExistingResident() {
    final resident = widget.resident!;
    _lastNameController.text = resident.lastName;
    _firstNameController.text = resident.firstName;
    _middleNameController.text = resident.middleName ?? '';
    _suffixController.text = resident.suffix ?? '';
    _birthplaceController.text = resident.birthplace ?? '';
    _contactNumberController.text = resident.contactNumber ?? '';
    _emailController.text = resident.email ?? '';
    _occupationController.text = resident.occupation ?? '';
    _monthlyIncomeController.text = resident.monthlyIncome?.toString() ?? '';
    _educationController.text = resident.educationAttainment ?? '';
    
    _selectedSex = resident.sex;
    _selectedCivilStatus = resident.civilStatus;
    _selectedEmploymentStatus = resident.employmentStatus ?? 'employed';
    _selectedResidentStatus = resident.residentStatus;
    _birthdateController.text = resident.birthdate;
    _isIndigenousPerson = resident.indigenousPerson;
  }

  @override
  void dispose() {
    _lastNameController.dispose();
    _firstNameController.dispose();
    _middleNameController.dispose();
    _suffixController.dispose();
    _birthplaceController.dispose();
    _birthdateController.dispose();
    _contactNumberController.dispose();
    _emailController.dispose();
    _occupationController.dispose();
    _monthlyIncomeController.dispose();
    _educationController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );
      
      if (image != null) {
        setState(() {
          _profileImage = File(image.path);
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error picking image: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showImageSourceDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Select Image Source'),
          content: const Text('Choose how you want to add a profile picture'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _pickImage(ImageSource.camera);
              },
              child: const Text('Camera'),
            ),
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _pickImage(ImageSource.gallery);
              },
              child: const Text('Gallery'),
            ),
          ],
        );
      },
    );
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

  Future<void> _saveResident() async {
    if (!_formKey.currentState!.validate()) return;

    if (_barangayId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Barangay information not found. Please log in again.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
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
        sex: _selectedSex,
        civilStatus: _selectedCivilStatus,
        birthdate: _birthdateController.text,
        birthplace: _birthplaceController.text.trim().isEmpty 
            ? null 
            : _birthplaceController.text.trim(),
        contactNumber: _contactNumberController.text.trim().isEmpty 
            ? null 
            : _contactNumberController.text.trim(),
        email: _emailController.text.trim().isEmpty 
            ? null 
            : _emailController.text.trim(),
        occupation: _occupationController.text.trim().isEmpty 
            ? null 
            : _occupationController.text.trim(),
        monthlyIncome: _monthlyIncomeController.text.trim().isEmpty 
            ? null 
            : double.tryParse(_monthlyIncomeController.text.trim()),
        employmentStatus: _selectedEmploymentStatus,
        educationAttainment: _educationController.text.trim().isEmpty 
            ? null 
            : _educationController.text.trim(),
        residentStatus: _selectedResidentStatus,
        picturePath: _profileImage?.path,
        indigenousPerson: _isIndigenousPerson,
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

      // Save to database
      final savedResident = await DatabaseService().residentRepository.create(resident);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Resident saved successfully! ID: ${savedResident.id}'),
            backgroundColor: AppColors.success,
          ),
        );
        
        // Navigate back
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving resident: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
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
        title: Text(widget.resident != null ? 'Edit Resident' : 'Add New Resident'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Profile Image Section
              _buildProfileImageSection(),
              
              const SizedBox(height: 24),
              
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
                        prefixIcon: Icon(Icons.person),
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
                        prefixIcon: Icon(Icons.person),
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
                        labelText: 'Middle Name',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.person),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _suffixController,
                      decoration: const InputDecoration(
                        labelText: 'Suffix (Jr., Sr., etc.)',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.person),
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Sex and Civil Status
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedSex,
                      decoration: const InputDecoration(
                        labelText: 'Sex *',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.wc),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'male', child: Text('Male')),
                        DropdownMenuItem(value: 'female', child: Text('Female')),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedSex = value!;
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedCivilStatus,
                      decoration: const InputDecoration(
                        labelText: 'Civil Status *',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.favorite),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'single', child: Text('Single')),
                        DropdownMenuItem(value: 'married', child: Text('Married')),
                        DropdownMenuItem(value: 'widowed', child: Text('Widowed')),
                        DropdownMenuItem(value: 'separated', child: Text('Separated')),
                        DropdownMenuItem(value: 'divorced', child: Text('Divorced')),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedCivilStatus = value!;
                        });
                      },
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Birthdate and Birthplace
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _birthdateController,
                      decoration: const InputDecoration(
                        labelText: 'Birthdate *',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.calendar_today),
                        prefixIcon: Icon(Icons.cake),
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
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _birthplaceController,
                      decoration: const InputDecoration(
                        labelText: 'Birthplace',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.location_on),
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 24),
              
              // Contact Information
              _buildSectionHeader('Contact Information'),
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _contactNumberController,
                decoration: const InputDecoration(
                  labelText: 'Contact Number',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone),
                ),
                keyboardType: TextInputType.phone,
              ),
              
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email Address',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.email),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              
              const SizedBox(height: 24),
              
              // Employment Information
              _buildSectionHeader('Employment Information'),
              const SizedBox(height: 16),
              
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _occupationController,
                      decoration: const InputDecoration(
                        labelText: 'Occupation',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.work),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedEmploymentStatus,
                      decoration: const InputDecoration(
                        labelText: 'Employment Status',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.business),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'employed', child: Text('Employed')),
                        DropdownMenuItem(value: 'unemployed', child: Text('Unemployed')),
                        DropdownMenuItem(value: 'self-employed', child: Text('Self-Employed')),
                        DropdownMenuItem(value: 'student', child: Text('Student')),
                        DropdownMenuItem(value: 'retired', child: Text('Retired')),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedEmploymentStatus = value!;
                        });
                      },
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _monthlyIncomeController,
                decoration: const InputDecoration(
                  labelText: 'Monthly Income (₱)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.attach_money),
                ),
                keyboardType: TextInputType.number,
              ),
              
              const SizedBox(height: 16),
              
              TextFormField(
                controller: _educationController,
                decoration: const InputDecoration(
                  labelText: 'Education Attainment',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.school),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Additional Information
              _buildSectionHeader('Additional Information'),
              const SizedBox(height: 16),
              
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedResidentStatus,
                      decoration: const InputDecoration(
                        labelText: 'Resident Status',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.info),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'active', child: Text('Active')),
                        DropdownMenuItem(value: 'deceased', child: Text('Deceased')),
                        DropdownMenuItem(value: 'moved_out', child: Text('Moved Out')),
                        DropdownMenuItem(value: 'temporarily_away', child: Text('Temporarily Away')),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedResidentStatus = value!;
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: CheckboxListTile(
                      title: const Text('Indigenous Person'),
                      value: _isIndigenousPerson,
                      onChanged: (value) {
                        setState(() {
                          _isIndigenousPerson = value ?? false;
                        });
                      },
                      controlAffinity: ListTileControlAffinity.leading,
                    ),
                  ),
                ],
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
                        widget.resident != null ? 'Update Resident' : 'Save Resident',
                        style: const TextStyle(fontSize: 16),
                      ),
              ),
            ],
          ),
        ),
      ),
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

  Widget _buildProfileImageSection() {
    return Center(
      child: Column(
        children: [
          // Profile Image
          GestureDetector(
            onTap: _showImageSourceDialog,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(60),
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
              child: _profileImage != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(57),
                      child: Image.file(
                        _profileImage!,
                        fit: BoxFit.cover,
                      ),
                    )
                  : Icon(
                      Icons.add_a_photo,
                      size: 50,
                      color: AppColors.primary,
                    ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Image Instructions
          Text(
            'Tap to add profile picture',
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
