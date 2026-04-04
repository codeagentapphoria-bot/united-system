import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:io';
import 'dart:async';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../core/services/database_service.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../data/models/household.dart';
import '../../data/models/resident.dart';
import '../../data/models/family_member.dart';
import '../../utils/image_utils.dart';
import '../../utils/image_storage_helper.dart';
import 'map_location_selector.dart';

class HouseholdForm extends StatefulWidget {
  final Household? household; // For editing existing households
  
  const HouseholdForm({super.key, this.household});

  @override
  State<HouseholdForm> createState() => _HouseholdFormState();
}

class _HouseholdFormState extends State<HouseholdForm> {
  final _formKey = GlobalKey<FormState>();
  final _houseNumberController = TextEditingController();
  final _streetController = TextEditingController();
  final _areaController = TextEditingController();
  final _waterSourceController = TextEditingController();
  final _toiletFacilityController = TextEditingController();
  
  String? _selectedHousingType;
  String? _selectedStructureType;
  String? _selectedPurok; // Will be set to first purok when data loads
  
  // Dynamic data from stored information
  String _barangayName = 'Loading...';
  int? _barangayId; // Will be loaded from secure storage
  List<Map<String, dynamic>> _availablePuroks = [];
  bool _isLoadingData = true;
  
  bool _hasElectricity = false;
  double? _latitude;
  double? _longitude;
  File? _householdImage;
  final ImagePicker _picker = ImagePicker();
  bool _isLoading = false;
  Timer? _locationTimeout;
  
  List<Resident> _availableResidents = [];
  Resident? _selectedHouseHead;
  
  // Family members
  List<Resident> _selectedFamilyMembers = [];
  
  // Multiple families support
  List<Map<String, dynamic>> _families = [];
  int _familyCounter = 0;
  
  // Expand/collapse state for family members
  bool _isMainFamilyExpanded = false;
  Map<int, bool> _isFamilyExpanded = {};
  
  // Search functionality (now handled in dialogs)

  @override
  void initState() {
    super.initState();
    _loadBarangayAndPurokData();
  }

  Future<void> _loadAvailableResidents() async {
    try {
      print('👥 Loading available residents for barangay: $_barangayId');
      final residents = await DatabaseService().residentRepository.getAll(barangayId: _barangayId);
      print('   Found ${residents.length} residents in barangay $_barangayId');
      // Filter out synced residents - only show pending residents for household selection
      final filteredResidents = residents.where((resident) => resident.syncStatus != 'synced').toList();
      print('   After filtering synced: ${filteredResidents.length} residents available');
      setState(() {
        _availableResidents = filteredResidents;
      });
    } catch (e) {
      debugPrint('Error loading residents: $e');
    }
  }

  Future<void> _loadBarangayAndPurokData() async {
    try {
      print('🏘️ Loading barangay and purok data for household form...');
      
      // Get barangay information from secure storage using OfflineAuthManager
      final offlineAuthManager = OfflineAuthManager();
      final barangayId = await offlineAuthManager.getBarangayId();
      final barangayName = await offlineAuthManager.getBarangayName();
      
      if (barangayId != null) {
        setState(() {
          _barangayName = barangayName ?? 'Unknown Barangay';
          _barangayId = barangayId;
        });
        print('   📋 Barangay: $_barangayName (ID: $_barangayId)');
        
        // Load residents AFTER barangayId is set
        await _loadAvailableResidents();
        
        // Get puroks for this barangay
        final authService = AuthService();
        final puroks = await authService.getStoredPuroks(_barangayId!);
        print('   🏘️ Found ${puroks.length} puroks');
        
        setState(() {
          _availablePuroks = puroks;
          // Don't auto-select - let user choose from dropdown
          print('   ✅ Puroks loaded, user will select from dropdown');
        });
        
        print('   ✅ Puroks loaded: ${puroks.map((p) => '${p['name']} (ID: ${p['id']})').join(', ')}');
        
        // Load existing household data after puroks are loaded
        if (widget.household != null) {
          _loadExistingHousehold();
        }
      } else {
        print('   ⚠️ No barangay ID found in secure storage');
        setState(() {
          _barangayName = 'Barangay Not Found';
          _barangayId = null;
        });
      }
      
      setState(() {
        _isLoadingData = false;
      });
      
    } catch (e) {
      print('   ❌ Error loading barangay and purok data: $e');
      setState(() {
        _barangayName = 'Error Loading';
        _barangayId = null;
        _isLoadingData = false;
      });
    }
  }

  Future<bool> _checkResidentHasHousehold(String residentId) async {
    try {
      final db = await DatabaseService().databaseHelper.database;
      
      // Check if resident is a house head (excluding current household if editing)
      String houseHeadQuery = 'SELECT id FROM households WHERE house_head = ?';
      List<dynamic> houseHeadArgs = [residentId];
      
      if (widget.household != null) {
        houseHeadQuery += ' AND id != ?';
        houseHeadArgs.add(widget.household!.id);
      }
      
      final houseHeadResult = await db.rawQuery(houseHeadQuery, houseHeadArgs);
      
      if (houseHeadResult.isNotEmpty) {
        return true;
      }
      
      // Check if resident is a family member (excluding current household if editing)
      String familyMemberQuery = '''
        SELECT h.id, h.house_number, h.street 
        FROM households h
        JOIN families f ON h.id = f.household_id
        JOIN family_members fm ON f.id = fm.family_id
        WHERE fm.family_member = ?
      ''';
      List<dynamic> familyMemberArgs = [residentId];
      
      if (widget.household != null) {
        familyMemberQuery += ' AND h.id != ?';
        familyMemberArgs.add(widget.household!.id);
      }
      
      final familyMemberResult = await db.rawQuery(familyMemberQuery, familyMemberArgs);
      
      return familyMemberResult.isNotEmpty;
    } catch (e) {
      debugPrint('Error checking resident household: $e');
      return false;
    }
  }

  Future<void> _loadExistingHousehold() async {
    final household = widget.household!;
    print('🏠 Loading existing household for editing: ${household.houseNumber}');
    print('   Purok ID: ${household.purokId}');
    print('   House Head: ${household.houseHead}');
    print('   Available puroks: ${_availablePuroks.map((p) => '${p['name']} (${p['id']})').toList()}');
    
    _houseNumberController.text = household.houseNumber ?? '';
    _streetController.text = household.street ?? '';
    _areaController.text = household.area?.toString() ?? '';
    _selectedHousingType = household.housingType;
    _selectedStructureType = household.structureType;
    _waterSourceController.text = household.waterSource ?? '';
    _toiletFacilityController.text = household.toiletFacility ?? '';
    
    // Only set purok if it exists in available puroks
    final purokExists = _availablePuroks.any((purok) => purok['id'].toString() == household.purokId.toString());
    if (purokExists) {
      _selectedPurok = household.purokId.toString();
      print('✅ Household purok set: ${household.purokId} -> $_selectedPurok');
    } else {
      print('⚠️ Household purok ${household.purokId} not found in available puroks: ${_availablePuroks.map((p) => p['id']).toList()}');
    }
    
    // Barangay is fixed to ID 1
    _hasElectricity = household.electricity;
    _latitude = household.latitude;
    _longitude = household.longitude;
    
    // Load existing household image
    if (household.householdImagePath != null && household.householdImagePath!.isNotEmpty) {
      try {
        final imageFile = File(household.householdImagePath!);
        if (await imageFile.exists()) {
          _householdImage = imageFile;
        } else {
          print('⚠️ Household image file not found: ${household.householdImagePath}');
        }
      } catch (e) {
        print('❌ Error loading household image: $e');
      }
    }
    
    // Load existing house head
    _loadExistingHouseHead(household.houseHead);
    
    // Load existing family members
    _loadExistingFamilyMembers(household.id!);
  }

  Future<void> _loadExistingHouseHead(String houseHeadId) async {
    try {
      final houseHead = await DatabaseService().residentRepository.getById(houseHeadId);
      if (houseHead != null) {
        setState(() {
          _selectedHouseHead = houseHead;
        });
      }
    } catch (e) {
      debugPrint('Error loading house head: $e');
    }
  }

  Future<void> _loadExistingFamilyMembers(int householdId) async {
    try {
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      // Get ALL families for this household
      final families = await databaseService.householdRepository.getFamiliesByHousehold(householdId);
      
      print('🏠 Loading ${families.length} families for household $householdId');
      
      if (families.isNotEmpty) {
        // Find the PRIMARY family (the one whose family_head matches household.houseHead)
        final primaryFamily = families.firstWhere(
          (family) => family.familyHead == widget.household!.houseHead,
          orElse: () => families.first, // Fallback to first if no match found
        );
        
        print('   🎯 Primary family identified: DB ID ${primaryFamily.id}, Family Head: ${primaryFamily.familyHead}');
        print('   🏠 Household Head: ${widget.household!.houseHead}');
        final primaryFamilyMembers = await databaseService.householdRepository.getFamilyMembers(primaryFamily.id!);
        
        // Load resident details for primary family members
        final List<Resident> existingFamilyMembers = [];
        for (final member in primaryFamilyMembers) {
          final resident = await databaseService.residentRepository.getById(member.familyMember);
          if (resident != null && resident.id != widget.household!.houseHead) {
            // Don't include house head in family members list
            existingFamilyMembers.add(resident);
          }
        }
        
        print('   👥 Primary family has ${existingFamilyMembers.length} members (excluding house head)');
        
        setState(() {
          _selectedFamilyMembers = existingFamilyMembers;
        });
        
        // Load ADDITIONAL families (if any) - skip the primary family
        if (families.length > 1) {
          print('   🏘️ Loading additional families (skipping primary family ID ${primaryFamily.id})...');
          
          final List<Map<String, dynamic>> additionalFamilies = [];
          
          for (final family in families) {
            // Skip the primary family
            if (family.id == primaryFamily.id) {
              print('   ⏭️ Skipping primary family (DB ID: ${family.id})');
              continue;
            }
            final familyMembers = await databaseService.householdRepository.getFamilyMembers(family.id!);
            
            print('   👨‍👩‍👧‍👦 Additional Family: DB ID ${family.id}, Family Head: ${family.familyHead}');
            
            // Load family head
            Resident? familyHead;
            for (final member in familyMembers) {
              if (member.familyMember == family.familyHead) {
                familyHead = await databaseService.residentRepository.getById(member.familyMember);
                break;
              }
            }
            
            // If family head not found in members, load directly
            if (familyHead == null) {
              familyHead = await databaseService.residentRepository.getById(family.familyHead);
            }
            
            // Load all family members (excluding the family head)
            final List<Resident> members = [];
            for (final member in familyMembers) {
              if (member.familyMember != family.familyHead) {
                final resident = await databaseService.residentRepository.getById(member.familyMember);
                if (resident != null) {
                  members.add(resident);
                }
              }
            }
            
            print('      Family head: ${familyHead?.fullName ?? 'Unknown'}');
            print('      Members: ${members.length}');
            
            // Add to additional families list
            _familyCounter++;
            additionalFamilies.add({
              'id': _familyCounter,
              'title': 'Family $_familyCounter',
              'houseHead': familyHead,
              'members': members,
              'dbFamilyId': family.id, // Store database family ID for updates
            });
          }
          
          print('   ✅ Loaded ${additionalFamilies.length} additional families');
          
          setState(() {
            _families = additionalFamilies;
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading family members: $e');
    }
  }

  void _showHouseHeadSelectionDialog() {
    showDialog(
      context: context,
      builder: (context) => HouseHeadSelectionDialog(
        availableResidents: _availableResidents,
        selectedFamilyMembers: _selectedFamilyMembers,
        onResidentSelected: _selectHouseHead,
        barangayId: _barangayId,
      ),
    );
  }

  void _showFamilyMemberSelectionDialog() {
    showDialog(
      context: context,
      builder: (context) => FamilyMemberSelectionDialog(
        availableResidents: _availableResidents,
        selectedFamilyMembers: _selectedFamilyMembers,
        selectedHouseHead: _selectedHouseHead,
        onResidentSelected: _addFamilyMember,
        barangayId: _barangayId,
      ),
    );
  }

  void _addNewFamily() {
    setState(() {
      _familyCounter++;
      _families.add({
        'id': _familyCounter,
        'title': 'Family $_familyCounter',
        'houseHead': null,
        'members': <Resident>[],
      });
    });
  }

  void _showFamilyHeadSelectionDialog(int familyId) {
    // Get all residents already selected in other families
    final List<Resident> alreadySelectedResidents = [];
    
    // Add main household head and members
    if (_selectedHouseHead != null) {
      alreadySelectedResidents.add(_selectedHouseHead!);
    }
    alreadySelectedResidents.addAll(_selectedFamilyMembers);
    
    // Add residents from other families
    for (final family in _families) {
      if (family['id'] != familyId) {
        final houseHead = family['houseHead'] as Resident?;
        if (houseHead != null) {
          alreadySelectedResidents.add(houseHead);
        }
        final members = family['members'] as List<Resident>;
        alreadySelectedResidents.addAll(members);
      }
    }
    
    showDialog(
      context: context,
      builder: (context) => HouseHeadSelectionDialog(
        availableResidents: _availableResidents,
        selectedFamilyMembers: _families.firstWhere((f) => f['id'] == familyId)['members'],
        onResidentSelected: (resident) => _selectFamilyHead(familyId, resident),
        alreadySelectedResidents: alreadySelectedResidents,
        barangayId: _barangayId,
      ),
    );
  }

  void _showFamilyMemberSelectionDialogForFamily(int familyId) {
    // Get all residents already selected in other families
    final List<Resident> alreadySelectedResidents = [];
    
    // Add main household head and members
    if (_selectedHouseHead != null) {
      alreadySelectedResidents.add(_selectedHouseHead!);
    }
    alreadySelectedResidents.addAll(_selectedFamilyMembers);
    
    // Add residents from other families
    for (final family in _families) {
      if (family['id'] != familyId) {
        final houseHead = family['houseHead'] as Resident?;
        if (houseHead != null) {
          alreadySelectedResidents.add(houseHead);
        }
        final members = family['members'] as List<Resident>;
        alreadySelectedResidents.addAll(members);
      }
    }
    
    showDialog(
      context: context,
      builder: (context) => FamilyMemberSelectionDialog(
        availableResidents: _availableResidents,
        selectedFamilyMembers: _families.firstWhere((f) => f['id'] == familyId)['members'],
        selectedHouseHead: _families.firstWhere((f) => f['id'] == familyId)['houseHead'],
        onResidentSelected: (resident) => _addFamilyMemberToFamily(familyId, resident),
        alreadySelectedResidents: alreadySelectedResidents,
        barangayId: _barangayId,
      ),
    );
  }

  void _selectFamilyHead(int familyId, Resident resident) {
    setState(() {
      final familyIndex = _families.indexWhere((f) => f['id'] == familyId);
      if (familyIndex != -1) {
        _families[familyIndex]['houseHead'] = resident;
      }
    });
    // Close the dialog
    Navigator.of(context).pop();
  }

  void _addFamilyMemberToFamily(int familyId, Resident resident) {
    setState(() {
      final familyIndex = _families.indexWhere((f) => f['id'] == familyId);
      if (familyIndex != -1) {
        final members = _families[familyIndex]['members'] as List<Resident>;
        if (!members.any((member) => member.id == resident.id)) {
          members.add(resident);
        }
      }
    });
    // Don't close dialog - dialog handles this now with Done button
  }

  void _removeFamilyMemberFromFamily(int familyId, Resident resident) {
    setState(() {
      final familyIndex = _families.indexWhere((f) => f['id'] == familyId);
      if (familyIndex != -1) {
        final members = _families[familyIndex]['members'] as List<Resident>;
        members.removeWhere((member) => member.id == resident.id);
        // Auto-collapse if count drops to 2 or below
        if (members.length <= 2) {
          _isFamilyExpanded[familyId] = false;
        }
      }
    });
  }

  void _removeFamily(int familyId) {
    setState(() {
      _families.removeWhere((f) => f['id'] == familyId);
      _isFamilyExpanded.remove(familyId); // Clean up expand state
    });
  }

  void _selectHouseHead(Resident resident) async {
    // Check if resident already has a household
    if (resident.id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Resident ID is missing'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    
    final hasHousehold = await _checkResidentHasHousehold(resident.id!);
    
    if (hasHousehold) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${resident.fullName} already has a household and cannot be selected as house head'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }
    
    // Check if already selected as family member
    if (_selectedFamilyMembers.any((member) => member.id == resident.id)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${resident.fullName} is already selected as a family member. Please remove them from family members first.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _selectedHouseHead = resident;
    });
    
    // Close the dialog
    Navigator.of(context).pop();
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${resident.fullName} selected as house head'),
        backgroundColor: AppColors.success,
      ),
    );
  }

  @override
  void dispose() {
    _houseNumberController.dispose();
    _streetController.dispose();
    _areaController.dispose();
    _waterSourceController.dispose();
    _toiletFacilityController.dispose();
    _locationTimeout?.cancel();
    super.dispose();
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
        title: 'Crop Household Photo',
        aspectRatio: const CropAspectRatio(ratioX: 4, ratioY: 3), // Landscape ratio for household
        lockAspectRatio: false,
      );

      if (croppedFile != null && mounted) {
        setState(() {
          _householdImage = croppedFile;
        });
      }
    } catch (e) {
      if (mounted) {
        ImageUtils.showCropError(context, e);
      }
    }
  }

  void _showImageSourceDialog() {
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



  Future<void> _getLocationAndShowMap() async {
    if (!mounted) return;
    
    // First try to get GPS location
    double? gpsLatitude;
    double? gpsLongitude;
    
    try {
      // Check permissions FIRST (before checking if service is enabled)
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      
      if (permission == LocationPermission.deniedForever) {
        // Show dialog to open settings
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permission denied. Please enable it in app settings.'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 4),
            ),
          );
        }
      } else if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        // Check if location services are enabled
        bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
        if (!serviceEnabled) {
          // Show dialog requiring user to turn on location
          if (mounted) {
            await showDialog(
              context: context,
              barrierDismissible: false,
              builder: (context) => AlertDialog(
                title: const Row(
                  children: [
                    Icon(Icons.location_off, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Location Required'),
                  ],
                ),
                content: const Text('Location services must be turned on to use the map. Please enable location in your phone settings.'),
                actions: [
                  ElevatedButton(
                    onPressed: () async {
                      Navigator.of(context).pop();
                      await Geolocator.openLocationSettings();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Open Settings'),
                  ),
                ],
              ),
            );
          }
          return; // Exit without opening map
        } else {
          // Get current position
          Position position = await Geolocator.getCurrentPosition(
            locationSettings: const LocationSettings(
              accuracy: LocationAccuracy.medium,
              timeLimit: Duration(seconds: 10),
            ),
          );
          
          gpsLatitude = position.latitude;
          gpsLongitude = position.longitude;
          
          print('🗺️ GPS location acquired: $gpsLatitude, $gpsLongitude');
        }
      }
    } catch (e) {
      print('🗺️ GPS location error: $e');
      // Continue to map even if GPS fails
    }
    
    // Show map selector with GPS location (if available) or current location
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MapLocationSelector(
          initialLatitude: gpsLatitude ?? _latitude,
          initialLongitude: gpsLongitude ?? _longitude,
          // barangayId will be fetched from secure storage in the widget
        ),
      ),
    );
    
    if (result != null && mounted) {
      setState(() {
        _latitude = result['latitude'];
        _longitude = result['longitude'];
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Location set: ${_latitude!.toStringAsFixed(6)}, ${_longitude!.toStringAsFixed(6)}'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _saveHousehold() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_selectedHouseHead == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a house head'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    if (_selectedPurok == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select a purok'),
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

    setState(() {
      _isLoading = true;
    });

    try {
      final household = Household(
        houseNumber: _houseNumberController.text.trim().isEmpty 
            ? null 
            : _houseNumberController.text.trim(),
        street: _streetController.text.trim().isEmpty 
            ? null 
            : _streetController.text.trim(),
        purokId: int.parse(_selectedPurok!),
        barangayId: _barangayId!, // Dynamic barangay ID from stored data
        houseHead: _selectedHouseHead!.id!,
        housingType: _selectedHousingType ?? 'owned',
        structureType: _selectedStructureType ?? 'concrete',
        electricity: _hasElectricity,
        waterSource: _waterSourceController.text.trim().isEmpty 
            ? null 
            : _waterSourceController.text.trim(),
        toiletFacility: _toiletFacilityController.text.trim().isEmpty 
            ? null 
            : _toiletFacilityController.text.trim(),
        latitude: _latitude,
        longitude: _longitude,
        area: _areaController.text.trim().isEmpty 
            ? null 
            : double.tryParse(_areaController.text.trim()),
        householdImagePath: _householdImage?.path,
      );

      // Validate household
      if (!household.isValid()) {
        final errors = household.getValidationErrors();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Validation errors: ${errors.join(', ')}'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }
      
      // Validate additional families
      for (int i = 0; i < _families.length; i++) {
        final family = _families[i];
        final familyHead = family['houseHead'] as Resident?;
        if (familyHead == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Please select a family head for ${family['title']}'),
              backgroundColor: AppColors.error,
            ),
          );
          return;
        }
      }

      // Ensure database service is initialized
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }

      // Save to database (create or update)
      Household savedHousehold;
      
      if (widget.household != null) {
        // Editing existing household
        savedHousehold = await databaseService.householdRepository.update(household.copyWith(id: widget.household!.id));
        
        // Update PRIMARY family members for existing household
        final families = await databaseService.householdRepository.getFamiliesByHousehold(savedHousehold.id!);
        
        if (families.isNotEmpty) {
          // Find the PRIMARY family (household head's family)
          final family = families.firstWhere(
            (f) => f.familyHead == savedHousehold.houseHead,
            orElse: () => families.first, // Fallback to first if no match
          );
          print('   🎯 Updating PRIMARY family (DB ID: ${family.id}, Family Head: ${family.familyHead})');
          
          // Get existing family members
          final existingMembers = await databaseService.householdRepository.getFamilyMembers(family.id!);
          final existingMemberIds = existingMembers.map((m) => m.familyMember).toSet();
          final selectedMemberIds = _selectedFamilyMembers.map((m) => m.id!).toSet();
          
          // Remove members that are no longer selected
          print('   🔄 PRIMARY family: Checking for removed members...');
          for (final existingMember in existingMembers) {
            if (!selectedMemberIds.contains(existingMember.familyMember)) {
              print('      ➖ Removing member: ${existingMember.familyMember}');
              await databaseService.householdRepository.removeFamilyMember(existingMember.id!);
            }
          }
          
          // Add new members
          print('   🔄 PRIMARY family: Checking for new members...');
          for (final member in _selectedFamilyMembers) {
            if (!existingMemberIds.contains(member.id!)) {
              print('      ➕ Adding new member: ${member.id!}');
              final familyMember = FamilyMember(
                familyId: family.id!,
                familyMember: member.id!,
              );
              await databaseService.householdRepository.addFamilyMember(familyMember);
            }
          }
          print('   ✅ PRIMARY family updated');
        }
        
        // Handle additional families for existing household
        if (_families.isNotEmpty) {
          print('🏘️ Processing ${_families.length} additional families...');
          
          for (final family in _families) {
            final familyHead = family['houseHead'] as Resident?;
            final members = family['members'] as List<Resident>;
            final dbFamilyId = family['dbFamilyId'] as int?; // Existing family ID
            
            if (familyHead != null) {
              if (dbFamilyId != null) {
                // UPDATE existing family
                print('   🔄 Updating existing family ID: $dbFamilyId');
                
                // Get existing family members
                final existingMembers = await databaseService.householdRepository.getFamilyMembers(dbFamilyId);
                final existingMemberIds = existingMembers.map((m) => m.familyMember).toSet();
                final selectedMemberIds = members.map((m) => m.id!).toSet();
                
                // Add family head to selected IDs
                selectedMemberIds.add(familyHead.id!);
                
                // Remove members that are no longer selected
                for (final existingMember in existingMembers) {
                  if (!selectedMemberIds.contains(existingMember.familyMember)) {
                    print('      ➖ Removing member: ${existingMember.familyMember}');
                    await databaseService.householdRepository.removeFamilyMember(existingMember.id!);
                  }
                }
                
                // Add new members (including family head if not already there)
                for (final memberId in selectedMemberIds) {
                  if (!existingMemberIds.contains(memberId)) {
                    print('      ➕ Adding new member: $memberId');
                    final familyMember = FamilyMember(
                      familyId: dbFamilyId,
                      familyMember: memberId,
                    );
                    await databaseService.householdRepository.addFamilyMember(familyMember);
                  }
                }
                
                print('   ✅ Updated existing family $dbFamilyId');
              } else {
                // CREATE new family
                print('   ➕ Creating new additional family');
                final additionalFamilyMemberIds = members.map((m) => m.id!).toList();
                
                await Future.any([
                  databaseService.householdRepository.createAdditionalFamily(
                    savedHousehold.id!,
                    familyHead.id!,
                    additionalFamilyMemberIds,
                  ),
                  Future.delayed(const Duration(seconds: 30), () {
                    throw Exception('Additional family creation timed out after 30 seconds');
                  }),
                ]);
                
                print('   ✅ Created new additional family');
              }
            }
          }
        }
        
        // Delete ADDITIONAL families that were removed from _families list
        // IMPORTANT: Don't delete the PRIMARY family (household head's family)!
        final allFamilies = await databaseService.householdRepository.getFamiliesByHousehold(savedHousehold.id!);
        if (allFamilies.length > 1) {
          final loadedFamilyIds = _families
              .where((f) => f['dbFamilyId'] != null)
              .map((f) => f['dbFamilyId'] as int)
              .toSet();
          
          for (final dbFamily in allFamilies) {
            // Skip the PRIMARY family (household head's family) - it's managed separately
            if (dbFamily.familyHead == savedHousehold.houseHead) {
              print('   ⏭️ Skipping PRIMARY family (DB ID: ${dbFamily.id}) from deletion check');
              continue;
            }
            
            // Check if this additional family is still in the UI
            if (!loadedFamilyIds.contains(dbFamily.id)) {
              print('   🗑️ Deleting removed ADDITIONAL family ID: ${dbFamily.id}');
              // Delete all family members first
              final familyMembers = await databaseService.householdRepository.getFamilyMembers(dbFamily.id!);
              for (final member in familyMembers) {
                await databaseService.householdRepository.removeFamilyMember(member.id!);
              }
              // Then delete the family (you'll need to add this method if it doesn't exist)
              // await databaseService.householdRepository.deleteFamily(dbFamily.id!);
            }
          }
        }
      } else {
        // Creating new household - use the new family creation flow
        final familyMemberIds = _selectedFamilyMembers.map((m) => m.id!).toList();
        
        // Add timeout to prevent hanging
        savedHousehold = await Future.any([
          databaseService.householdRepository.createHouseholdWithFamily(household, familyMemberIds),
          Future.delayed(const Duration(seconds: 30), () {
            throw Exception('Household creation timed out after 30 seconds');
          }),
        ]);
        
        // Create additional families if any
        if (_families.isNotEmpty) {
          for (final family in _families) {
            final familyHead = family['houseHead'] as Resident?;
            final members = family['members'] as List<Resident>;
            
            if (familyHead != null) {
              final additionalFamilyMemberIds = members.map((m) => m.id!).toList();
              
              await Future.any([
                databaseService.householdRepository.createAdditionalFamily(
                  savedHousehold.id!,
                  familyHead.id!,
                  additionalFamilyMemberIds,
                ),
                Future.delayed(const Duration(seconds: 30), () {
                  throw Exception('Additional family creation timed out after 30 seconds');
                }),
              ]);
            }
          }
        }
      }
      
      // Save household image with proper filename: householdID_househeadID.jpg
      // IMPORTANT: Save image to permanent storage immediately to prevent temp file cleanup
      if (_householdImage != null && savedHousehold.id != null) {
        print('📸 Saving household image to permanent storage...');
        try {
          // Get the household head ID from the first family
          final families = await databaseService.householdRepository.getFamiliesByHousehold(savedHousehold.id!);
          if (families.isNotEmpty) {
            final househeadId = families.first.familyHead;
            print('   Household ID: ${savedHousehold.id}, Househead ID: $househeadId');
            
            final String? properImagePath = await ImageStorageHelper.saveHouseholdImage(
              _householdImage!,
              savedHousehold.id!,
              househeadId,
            );
            
            if (properImagePath != null) {
              print('✅ Household image saved to permanent storage: $properImagePath');
              // Update household with proper image path
              savedHousehold = await databaseService.householdRepository.update(
                savedHousehold.copyWith(householdImagePath: properImagePath)
              );
              print('✅ Household database updated with permanent image path');
            } else {
              print('⚠️ Failed to save household image to permanent storage');
              // Keep the original temp path - better than losing the image entirely
              print('   Original path will be kept: ${_householdImage!.path}');
            }
          } else {
            print('⚠️ No families found for household ${savedHousehold.id}');
          }
        } catch (e) {
          print('❌ Error saving household image: $e');
          // Don't throw - we already saved the household successfully
          // Just log the error and continue
        }
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(widget.household != null 
                ? 'Household updated successfully!' 
                : 'Household created successfully! ID: ${savedHousehold.id}'),
            backgroundColor: AppColors.success,
          ),
        );
        
        // Navigate back with success result
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      debugPrint('Error saving household: $e');
      
      if (mounted) {
        String errorMessage = 'Error saving household';
        if (e.toString().contains('timeout') || e.toString().contains('locked')) {
          errorMessage = 'Database is busy. Please try again in a moment.';
        } else if (e.toString().contains('Failed to create household with family')) {
          errorMessage = 'Failed to create household. Please check your data and try again.';
        } else {
          errorMessage = 'Error saving household: ${e.toString()}';
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 5),
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
        title: Text(widget.household != null ? 'Edit Household' : 'Add New Household'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _saveHousehold,
            child: Text(
              widget.household != null ? 'Update' : 'Save',
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
              // Household Image Section
              _buildHouseholdImageSection(),
              
              const SizedBox(height: 20),
              
              // Barangay Information
              _buildBarangayInfoSection(),
              
              const SizedBox(height: 20),
              
              // Basic Information
              _buildSectionHeader('Basic Information'),
              const SizedBox(height: 16),
              
              // House Number and Street
              Row(
                children: [
                  Expanded(
                                         child: TextFormField(
                       controller: _houseNumberController,
                       decoration: const InputDecoration(
                         labelText: 'House Number (Optional)',
                         border: OutlineInputBorder(),
                       ),
                     ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                                         child: TextFormField(
                       controller: _streetController,
                       decoration: const InputDecoration(
                         labelText: 'Street Name (Optional)',
                         border: OutlineInputBorder(),
                       ),
                     ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Purok Selection
              DropdownButtonFormField<String>(
                value: _selectedPurok != null && _availablePuroks.any((purok) => purok['id'].toString() == _selectedPurok)
                    ? _selectedPurok 
                    : null,
                decoration: const InputDecoration(
                  labelText: 'Purok *',
                  border: OutlineInputBorder(),
                  hintText: 'Select purok',
                ),
                items: _isLoadingData 
                    ? [const DropdownMenuItem(value: 'loading', child: Text('Loading puroks...'))]
                    : _availablePuroks.isEmpty
                        ? [const DropdownMenuItem(value: 'none', child: Text('No puroks available'))]
                        : [
                            const DropdownMenuItem(value: null, child: Text('Select purok...')),
                            ..._availablePuroks.map((purok) {
                              return DropdownMenuItem(
                                value: purok['id'].toString(),
                                child: Text(purok['name'] ?? 'Unknown Purok'),
                              );
                            }).toList(),
                          ],
                onChanged: _isLoadingData || _availablePuroks.isEmpty 
                    ? null 
                    : (value) {
                        setState(() {
                          _selectedPurok = value;
                        });
                      },
              ),
              
              const SizedBox(height: 16),
              
              // Family Members
              Container(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Family',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    IconButton(
                      onPressed: _addNewFamily,
                      icon: const Icon(AppIcons.plus),
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              
              // House Head Selection Button
              ElevatedButton.icon(
                onPressed: _showHouseHeadSelectionDialog,
                icon: const Icon(Icons.person_add),
                label: Text(_selectedHouseHead != null 
                    ? 'Change House Head' 
                    : 'Select House Head *'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _selectedHouseHead != null ? Colors.green : Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  minimumSize: const Size(double.infinity, 50),
                ),
              ),
              
              // Selected House Head Display
              if (_selectedHouseHead != null) ...[
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
                              'Selected House Head:',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: AppColors.success,
                              ),
                            ),
                            Text(_selectedHouseHead!.fullName),
                            Text('${_selectedHouseHead!.sex} • ${_selectedHouseHead!.civilStatus}'),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.remove_circle, color: Colors.red),
                        onPressed: () {
                          setState(() {
                            _selectedHouseHead = null;
                          });
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              
              const SizedBox(height: 16),
              
              // Add Family Members Button
              ElevatedButton.icon(
                onPressed: _showFamilyMemberSelectionDialog,
                icon: const Icon(AppIcons.plus),
                label: const Text('Add Family Members'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  minimumSize: const Size(double.infinity, 50),
                ),
              ),
              
              // Selected Family Members List
              if (_selectedFamilyMembers.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Selected Family Members: ${_selectedFamilyMembers.length}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (_selectedFamilyMembers.length > 2)
                      TextButton(
                        onPressed: () {
                          setState(() {
                            _isMainFamilyExpanded = !_isMainFamilyExpanded;
                          });
                        },
                        child: Text(
                          _isMainFamilyExpanded ? 'Hide' : 'See more (${_selectedFamilyMembers.length - 2})',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                ...((_isMainFamilyExpanded 
                    ? _selectedFamilyMembers 
                    : _selectedFamilyMembers.take(2).toList()
                  ).map((member) => Card(
                  child: ListTile(
                    title: Text(member.fullName),
                    subtitle: Text('${member.sex} • ${_formatCivilStatus(member.civilStatus)}'),
                    trailing: IconButton(
                      icon: const Icon(Icons.remove_circle, color: Colors.red),
                      onPressed: () => _removeFamilyMember(member),
                    ),
                  ),
                )).toList()),
                const SizedBox(height: 16),
              ],
              
              // Display Additional Families
              if (_families.isNotEmpty) ...[
                const SizedBox(height: 20),
                ...(_families.map((family) => _buildFamilySection(family)).toList()),
              ],
              
              const SizedBox(height: 20),
              
              // Housing Details
              _buildSectionHeader('Housing Details'),
              const SizedBox(height: 16),
              
              // Housing Type
              DropdownButtonFormField<String>(
                value: _selectedHousingType,
                decoration: const InputDecoration(
                  labelText: 'Housing Type (Optional)',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Select housing type...')),
                  DropdownMenuItem(value: 'owned', child: Text('Owned')),
                  DropdownMenuItem(value: 'rented', child: Text('Rented')),
                  DropdownMenuItem(value: 'shared', child: Text('Shared')),
                  DropdownMenuItem(value: 'caretaker', child: Text('Caretaker')),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedHousingType = value;
                  });
                },
              ),
              
              const SizedBox(height: 16),
              
              // Structure Type
              DropdownButtonFormField<String>(
                value: _selectedStructureType,
                decoration: const InputDecoration(
                  labelText: 'Structure Type (Optional)',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Select structure type...')),
                  DropdownMenuItem(value: 'concrete', child: Text('Concrete')),
                  DropdownMenuItem(value: 'wood', child: Text('Wood')),
                  DropdownMenuItem(value: 'bamboo', child: Text('Bamboo')),
                  DropdownMenuItem(value: 'mix', child: Text('Mix')),
                  DropdownMenuItem(value: 'other', child: Text('Other')),
                ],
                onChanged: (value) {
                  setState(() {
                    _selectedStructureType = value;
                  });
                },
              ),
              
              const SizedBox(height: 16),
              
              // Area and Electricity
              Row(
                children: [
                  Expanded(
                                         child: TextFormField(
                       controller: _areaController,
                       decoration: const InputDecoration(
                         labelText: 'Floor Area (sq.m) (Optional)',
                         border: OutlineInputBorder(),
                       ),
                       keyboardType: TextInputType.number,
                     ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: CheckboxListTile(
                      title: const Text('Has Electricity'),
                      value: _hasElectricity,
                      onChanged: (value) {
                        setState(() {
                          _hasElectricity = value ?? false;
                        });
                      },
                      controlAffinity: ListTileControlAffinity.leading,
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Water Source
              TextFormField(
                controller: _waterSourceController,
                decoration: const InputDecoration(
                  labelText: 'Water Source (Optional)',
                  border: OutlineInputBorder(),
                  hintText: 'Enter water source (e.g., Tap Water, Deep Well, etc.)',
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Toilet Facility
              TextFormField(
                controller: _toiletFacilityController,
                decoration: const InputDecoration(
                  labelText: 'Toilet Facility (Optional)',
                  border: OutlineInputBorder(),
                  hintText: 'Enter toilet facility (e.g., Water Sealed, Pit Latrine, etc.)',
                ),
              ),
              
              const SizedBox(height: 20),
              
              // Location Information
              _buildSectionHeader('Location Information'),
              const SizedBox(height: 16),
              
              // Location Options
              ElevatedButton.icon(
                onPressed: _getLocationAndShowMap,
                icon: const Icon(AppIcons.location),
                label: const Text('Get Current Location & Select on Map'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  minimumSize: const Size(double.infinity, 50),
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Coordinates Display
              if (_latitude != null && _longitude != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.success.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Location Captured:',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.success,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text('Latitude: ${_latitude!.toStringAsFixed(6)}'),
                      Text('Longitude: ${_longitude!.toStringAsFixed(6)}'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
              
              // Manual coordinates input removed - GPS location only
              
              const SizedBox(height: 32),
              
              // Save Button
              ElevatedButton(
                onPressed: _isLoading ? null : _saveHousehold,
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
                        widget.household != null ? 'Update Household' : 'Create Household',
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

  Widget _buildFamilySection(Map<String, dynamic> family) {
    final familyId = family['id'] as int;
    final familyTitle = family['title'] as String;
    final houseHead = family['houseHead'] as Resident?; // Note: This is actually the FAMILY head (bad naming)
    final members = family['members'] as List<Resident>;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
        borderRadius: BorderRadius.circular(8),
        color: Colors.grey[50],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Family Title with Remove Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                familyTitle,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              IconButton(
                onPressed: () => _removeFamily(familyId),
                icon: const Icon(Icons.delete, color: Colors.red),
                tooltip: 'Remove Family',
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Add Family Head Button
          ElevatedButton.icon(
            onPressed: () => _showFamilyHeadSelectionDialog(familyId),
            icon: const Icon(Icons.person_add),
            label: Text(houseHead != null ? 'Change Family Head' : 'Select Family Head *'),
            style: ElevatedButton.styleFrom(
              backgroundColor: houseHead != null ? Colors.green : Colors.blue,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              minimumSize: const Size(double.infinity, 50),
            ),
          ),
          
          // Selected Family Head Display
          if (houseHead != null) ...[
            const SizedBox(height: 12),
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
                          'Selected Family Head:',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.success,
                          ),
                        ),
                        Text(houseHead.fullName),
                        Text('${houseHead.sex} • ${houseHead.civilStatus}'),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.remove_circle, color: Colors.red),
                    onPressed: () {
                      setState(() {
                        final familyIndex = _families.indexWhere((f) => f['id'] == familyId);
                        if (familyIndex != -1) {
                          _families[familyIndex]['houseHead'] = null;
                        }
                      });
                    },
                  ),
                ],
              ),
            ),
          ],
          
          const SizedBox(height: 16),
          
          // Add Family Members Button
          ElevatedButton.icon(
            onPressed: () => _showFamilyMemberSelectionDialogForFamily(familyId),
            icon: const Icon(AppIcons.plus),
            label: const Text('Add Family Members'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              minimumSize: const Size(double.infinity, 50),
            ),
          ),
          
          // Selected Family Members List
          if (members.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Selected Family Members: ${members.length}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (members.length > 2)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _isFamilyExpanded[familyId] = !(_isFamilyExpanded[familyId] ?? false);
                      });
                    },
                    child: Text(
                      (_isFamilyExpanded[familyId] ?? false) ? 'Hide' : 'See more (${members.length - 2})',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            ...((_isFamilyExpanded[familyId] ?? false)
                ? members
                : members.take(2).toList()
              ).map((member) => Card(
              child: ListTile(
                title: Text(member.fullName),
                subtitle: Text('${member.sex} • ${member.civilStatus}'),
                trailing: IconButton(
                  icon: const Icon(Icons.remove_circle, color: Colors.red),
                  onPressed: () => _removeFamilyMemberFromFamily(familyId, member),
                ),
              ),
            )).toList(),
          ],
        ],
      ),
    );
  }

  Widget _buildBarangayInfoSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.location_city,
                color: Colors.blue[700],
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'Barangay Information',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.blue[700],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Barangay:',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _barangayName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Available Puroks:',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _isLoadingData 
                          ? 'Loading...' 
                          : '${_availablePuroks.length} puroks',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHouseholdImageSection() {
    return Center(
      child: Column(
        children: [
          // Household Image
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
              child: _householdImage != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(13),
                      child: Image.file(
                        _householdImage!,
                        fit: BoxFit.cover,
                      ),
                    )
                  : Icon(
                      AppIcons.household,
                      size: 60,
                      color: AppColors.primary,
                    ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Image Instructions
          Text(
            'Tap to add household image',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  // Family member management methods
  void _addFamilyMember(Resident resident) async {
    // Check if resident already has a household
    if (resident.id == null) {
      return;
    }
    
    final hasHousehold = await _checkResidentHasHousehold(resident.id!);
    
    if (hasHousehold) {
      return;
    }
    
    // Check if already selected
    if (_selectedFamilyMembers.any((member) => member.id == resident.id)) {
      return;
    }
    
    // Check if is house head
    if (_selectedHouseHead?.id == resident.id) {
      return;
    }

    // Add to selected family members list (for UI display)
    setState(() {
      _selectedFamilyMembers.add(resident);
    });
    
    // Don't close dialog or show snackbar - dialog handles this now
  }

  void _removeFamilyMember(Resident member) {
    setState(() {
      _selectedFamilyMembers.removeWhere((m) => m.id == member.id);
      // Auto-collapse if count drops to 2 or below
      if (_selectedFamilyMembers.length <= 2) {
        _isMainFamilyExpanded = false;
      }
    });
  }

  String _formatCivilStatus(String status) {
    switch (status) {
      case 'single':
        return 'Single';
      case 'married':
        return 'Married';
      case 'live_in':
        return 'Live in';
      case 'widowed':
        return 'Widowed';
      case 'separated':
        return 'Separated';
      case 'divorced':
        return 'Divorced';
      default:
        return status;
    }
  }
}

class HouseHeadSelectionDialog extends StatefulWidget {
  final List<Resident> availableResidents;
  final List<Resident> selectedFamilyMembers;
  final Function(Resident) onResidentSelected;
  final List<Resident>? alreadySelectedResidents;
  final int? barangayId;

  const HouseHeadSelectionDialog({
    super.key,
    required this.availableResidents,
    required this.selectedFamilyMembers,
    required this.onResidentSelected,
    this.alreadySelectedResidents,
    this.barangayId,
  });

  @override
  State<HouseHeadSelectionDialog> createState() => _HouseHeadSelectionDialogState();
}

class _HouseHeadSelectionDialogState extends State<HouseHeadSelectionDialog> {
  final _searchController = TextEditingController();
  List<Resident> _filteredResidents = [];
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    // Filter out synced residents from available residents
    _filteredResidents = widget.availableResidents.where((resident) => resident.syncStatus != 'synced').toList();
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
        // First filter out synced residents, then apply search filter
        List<Resident> availableResidents = widget.availableResidents.where((resident) => resident.syncStatus != 'synced').toList();
        
        if (query.isEmpty) {
          _filteredResidents = availableResidents;
        } else {
          _filteredResidents = availableResidents.where((resident) {
            return resident.fullName.toLowerCase().contains(query) ||
                   resident.firstName.toLowerCase().contains(query) ||
                   resident.lastName.toLowerCase().contains(query);
          }).toList();
        }
      });
    });
  }

  Future<bool> _checkResidentHasHousehold(String residentId) async {
    try {
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      // Check if resident is a house head (only in current barangay)
      final households = await databaseService.householdRepository.getAll(barangayId: widget.barangayId);
      final isHouseHead = households.any((household) => household.houseHead == residentId);
      
      if (isHouseHead) {
        return true;
      }
      
      // Check if resident is a family member in any household (only in current barangay)
      final allHouseholds = await databaseService.householdRepository.getAll(barangayId: widget.barangayId);
      for (final household in allHouseholds) {
        final families = await databaseService.householdRepository.getFamiliesByHousehold(household.id!);
        for (final family in families) {
          final familyMembers = await databaseService.householdRepository.getFamilyMembers(family.id!);
          final isFamilyMember = familyMembers.any((member) => member.familyMember == residentId);
          if (isFamilyMember) {
            return true;
          }
        }
      }
      
      return false;
    } catch (e) {
      debugPrint('Error checking resident household: $e');
      return false;
    }
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
                    'Select House Head',
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
                        final isAlreadySelected = widget.selectedFamilyMembers
                            .any((member) => member.id == resident.id);
                        final isAlreadySelectedInOtherFamilies = widget.alreadySelectedResidents != null &&
                            widget.alreadySelectedResidents!.any((member) => member.id == resident.id);
                        
                        return FutureBuilder<bool>(
                          future: resident.id != null 
                              ? _checkResidentHasHousehold(resident.id!) 
                              : Future.value(false),
                          builder: (context, snapshot) {
                            final hasHousehold = snapshot.data ?? false;
                            final isDisabled = hasHousehold || isAlreadySelected || isAlreadySelectedInOtherFamilies;
                            
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
                                  style: TextStyle(
                                    color: isDisabled ? Colors.grey : null,
                                    fontWeight: FontWeight.w500,
                                    fontSize: 16,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${resident.sex} • ${_formatCivilStatus(resident.civilStatus)}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    if (hasHousehold)
                                      const Text(
                                        'Already has a family/household',
                                        style: TextStyle(
                                          color: Colors.red,
                                          fontSize: 11,
                                        ),
                                      )
                                    else if (isAlreadySelectedInOtherFamilies)
                                      const Text(
                                        'Already selected in another family',
                                        style: TextStyle(
                                          color: Colors.red,
                                          fontSize: 11,
                                        ),
                                      )
                                    else if (isAlreadySelected)
                                      const Text(
                                        'Selected as family member',
                                        style: TextStyle(
                                          color: Colors.orange,
                                          fontSize: 11,
                                        ),
                                      ),
                                  ],
                                ),
                                trailing: isDisabled
                                    ? const Icon(Icons.block, color: Colors.grey, size: 20)
                                    : IconButton(
                                        onPressed: () => widget.onResidentSelected(resident),
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
                                onTap: isDisabled 
                                    ? null 
                                    : () => widget.onResidentSelected(resident),
                              ),
                            );
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatCivilStatus(String status) {
    switch (status) {
      case 'single':
        return 'Single';
      case 'married':
        return 'Married';
      case 'live_in':
        return 'Live in';
      case 'widowed':
        return 'Widowed';
      case 'separated':
        return 'Separated';
      case 'divorced':
        return 'Divorced';
      default:
        return status;
    }
  }
}

class FamilyMemberSelectionDialog extends StatefulWidget {
  final List<Resident> availableResidents;
  final List<Resident> selectedFamilyMembers;
  final Resident? selectedHouseHead;
  final Function(Resident) onResidentSelected;
  final List<Resident>? alreadySelectedResidents;
  final int? barangayId;

  const FamilyMemberSelectionDialog({
    super.key,
    required this.availableResidents,
    required this.selectedFamilyMembers,
    required this.selectedHouseHead,
    required this.onResidentSelected,
    this.alreadySelectedResidents,
    this.barangayId,
  });

  @override
  State<FamilyMemberSelectionDialog> createState() => _FamilyMemberSelectionDialogState();
}

class _FamilyMemberSelectionDialogState extends State<FamilyMemberSelectionDialog> {
  final _searchController = TextEditingController();
  List<Resident> _filteredResidents = [];
  Timer? _searchDebounce;
  Set<String> _selectedResidentIds = {}; // Track selected residents

  @override
  void initState() {
    super.initState();
    // Initialize with already selected members
    _selectedResidentIds = widget.selectedFamilyMembers.map((r) => r.id!).toSet();
    
    // Filter out synced residents from available residents
    _filteredResidents = widget.availableResidents.where((resident) => resident.syncStatus != 'synced').toList();
    _sortAndFilterResidents();
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
        _sortAndFilterResidents();
      });
    });
  }

  void _sortAndFilterResidents() {
    final query = _searchController.text.toLowerCase();
    // First filter out synced residents
    List<Resident> availableResidents = widget.availableResidents.where((resident) => resident.syncStatus != 'synced').toList();
    
    // Apply search filter
    if (query.isNotEmpty) {
      availableResidents = availableResidents.where((resident) {
        return resident.fullName.toLowerCase().contains(query) ||
               resident.firstName.toLowerCase().contains(query) ||
               resident.lastName.toLowerCase().contains(query);
      }).toList();
    }
    
    // Sort: Selected first, then by ID descending (newest first)
    availableResidents.sort((a, b) {
      final aSelected = _selectedResidentIds.contains(a.id);
      final bSelected = _selectedResidentIds.contains(b.id);
      
      if (aSelected && !bSelected) return -1; // a goes first
      if (!aSelected && bSelected) return 1; // b goes first
      
      // Both selected or both not selected - sort by ID descending (newest first)
      // Assuming newer residents have higher/later IDs or creation time
      return (b.id ?? '').compareTo(a.id ?? '');
    });
    
    _filteredResidents = availableResidents;
  }

  Future<bool> _checkResidentHasHousehold(String residentId) async {
    try {
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      // Check if resident is a house head (only in current barangay)
      final households = await databaseService.householdRepository.getAll(barangayId: widget.barangayId);
      final isHouseHead = households.any((household) => household.houseHead == residentId);
      
      if (isHouseHead) {
        return true;
      }
      
      // Check if resident is a family member in any household (only in current barangay)
      final allHouseholds = await databaseService.householdRepository.getAll(barangayId: widget.barangayId);
      for (final household in allHouseholds) {
        final families = await databaseService.householdRepository.getFamiliesByHousehold(household.id!);
        for (final family in families) {
          final familyMembers = await databaseService.householdRepository.getFamilyMembers(family.id!);
          final isFamilyMember = familyMembers.any((member) => member.familyMember == residentId);
          if (isFamilyMember) {
            return true;
          }
        }
      }
      
      return false;
    } catch (e) {
      debugPrint('Error checking resident household: $e');
      return false;
    }
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
                const Icon(Icons.people, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Select Family Members',
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
            
            // Selection Counter
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${_filteredResidents.length} found',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                  Text(
                    '${_selectedResidentIds.length} selected',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
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
                        final isSelected = _selectedResidentIds.contains(resident.id);
                        final isHouseHead = widget.selectedHouseHead?.id == resident.id;
                        final isAlreadySelectedInOtherFamilies = widget.alreadySelectedResidents != null &&
                            widget.alreadySelectedResidents!.any((member) => member.id == resident.id);
                        
                        return FutureBuilder<bool>(
                          future: resident.id != null 
                              ? _checkResidentHasHousehold(resident.id!) 
                              : Future.value(false),
                          builder: (context, snapshot) {
                            final hasHousehold = snapshot.data ?? false;
                            final isDisabled = hasHousehold || isHouseHead || isAlreadySelectedInOtherFamilies;
                            
                            return Container(
                              margin: const EdgeInsets.only(bottom: 1),
                              decoration: BoxDecoration(
                                color: isSelected ? AppColors.primary.withOpacity(0.05) : null,
                                border: Border(
                                  bottom: BorderSide(
                                    color: Colors.grey.shade300,
                                    width: 1,
                                  ),
                                ),
                              ),
                              child: CheckboxListTile(
                                value: isSelected,
                                onChanged: isDisabled 
                                    ? null 
                                    : (bool? value) {
                                        setState(() {
                                          if (value == true) {
                                            _selectedResidentIds.add(resident.id!);
                                          } else {
                                            _selectedResidentIds.remove(resident.id!);
                                          }
                                          _sortAndFilterResidents(); // Re-sort to move selected to top
                                        });
                                      },
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                controlAffinity: ListTileControlAffinity.leading,
                                activeColor: AppColors.primary,
                                title: Text(
                                  resident.fullName,
                                  style: TextStyle(
                                    color: isDisabled ? Colors.grey : null,
                                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                    fontSize: 16,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${resident.sex} • ${_formatCivilStatus(resident.civilStatus)}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                    if (hasHousehold)
                                      const Text(
                                        'Already has a family/household',
                                        style: TextStyle(
                                          color: Colors.red,
                                          fontSize: 11,
                                        ),
                                      )
                                    else if (isAlreadySelectedInOtherFamilies)
                                      const Text(
                                        'Already selected in another family',
                                        style: TextStyle(
                                          color: Colors.red,
                                          fontSize: 11,
                                        ),
                                      )
                                    else if (isHouseHead)
                                      const Text(
                                        'Is house head',
                                        style: TextStyle(
                                          color: Colors.orange,
                                          fontSize: 11,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
            ),
            
            // Done Button
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      // Get selected residents
                      final selectedResidents = widget.availableResidents
                          .where((r) => _selectedResidentIds.contains(r.id))
                          .toList();
                      
                      // Call onResidentSelected for each newly selected resident
                      int addedCount = 0;
                      for (final resident in selectedResidents) {
                        if (!widget.selectedFamilyMembers.any((m) => m.id == resident.id)) {
                          widget.onResidentSelected(resident);
                          addedCount++;
                        }
                      }
                      
                      Navigator.of(context).pop();
                      
                      // Show success message
                      if (addedCount > 0) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('✅ Added $addedCount family member${addedCount > 1 ? 's' : ''}'),
                            backgroundColor: AppColors.success,
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    icon: const Icon(Icons.check, size: 20),
                    label: Text('Done (${_selectedResidentIds.length})'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatCivilStatus(String status) {
    switch (status) {
      case 'single':
        return 'Single';
      case 'married':
        return 'Married';
      case 'live_in':
        return 'Live in';
      case 'widowed':
        return 'Widowed';
      case 'separated':
        return 'Separated';
      case 'divorced':
        return 'Divorced';
      default:
        return status;
    }
  }
}
