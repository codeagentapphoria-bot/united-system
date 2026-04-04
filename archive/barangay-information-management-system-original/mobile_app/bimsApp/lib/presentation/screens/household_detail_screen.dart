import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:io';
import '../../data/models/household.dart';
import '../../data/models/family.dart';
import '../../data/models/family_member.dart';
import '../../data/models/resident.dart';
import '../../data/models/pet.dart';
import '../../core/services/database_service.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import 'household_form.dart';
import 'pet_form_screen.dart';

class HouseholdDetailScreen extends StatefulWidget {
  final Household household;

  const HouseholdDetailScreen({
    super.key,
    required this.household,
  });

  @override
  State<HouseholdDetailScreen> createState() => _HouseholdDetailScreenState();
}

class _HouseholdDetailScreenState extends State<HouseholdDetailScreen> {
  final DatabaseService _databaseService = DatabaseService();
  
  List<Family> _families = [];
  List<FamilyMember> _familyMembers = [];
  Map<String, Resident> _residents = {};
  List<Pet> _pets = [];
  bool _isLoading = true;
  late Household _currentHousehold;

  @override
  void initState() {
    super.initState();
    _currentHousehold = widget.household;
    _loadHouseholdDetails();
  }

  Future<void> _loadHouseholdDetails() async {
    try {
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      // Reload household data to get updated house_head
      final updatedHousehold = await _databaseService.householdRepository.getById(widget.household.id!);
      if (updatedHousehold != null) {
        _currentHousehold = updatedHousehold;
        print('Debug: Updated household house_head to: ${updatedHousehold.houseHead}');
        print('Debug: Household ID: ${updatedHousehold.id}');
      }
      
      final currentHousehold = _currentHousehold;

      // Load families for this household
      final families = await _databaseService.householdRepository.getFamiliesByHousehold(currentHousehold.id!);
      
      // Load family members for each family
      final List<FamilyMember> allFamilyMembers = [];
      for (final family in families) {
        final members = await _databaseService.householdRepository.getFamilyMembers(family.id!);
        allFamilyMembers.addAll(members);
      }

      // Load resident details
      final Map<String, Resident> residents = {};
      
      // Load house head (use updated household data)
      final houseHead = await _databaseService.residentRepository.getById(currentHousehold.houseHead);
      if (houseHead != null) {
        residents[houseHead.id!] = houseHead;
      }

      // Load family heads for each family
      for (final family in families) {
        final familyHead = await _databaseService.residentRepository.getById(family.familyHead);
        if (familyHead != null) {
          residents[familyHead.id!] = familyHead;
        }
      }

      // Load family members
      for (final member in allFamilyMembers) {
        final resident = await _databaseService.residentRepository.getById(member.familyMember);
        if (resident != null) {
          residents[resident.id!] = resident;
        }
      }

      // Load pets for all household members
      final List<Pet> pets = [];
      for (final residentId in residents.keys) {
        final residentPets = await _databaseService.petsRepository.getByOwner(residentId);
        pets.addAll(residentPets);
      }

      setState(() {
        _families = families;
        _familyMembers = allFamilyMembers;
        _residents = residents;
        _pets = pets;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading household details: $e');
      setState(() {
        _isLoading = false;
      });
      _showErrorSnackBar('Error loading household details: $e');
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Household Details'),
        actions: [
          IconButton(
            onPressed: () => _addAdditionalFamily(),
            icon: const Icon(Icons.group_add),
            tooltip: 'Add Family',
          ),
          IconButton(
            onPressed: () => _editHousehold(),
            icon: const Icon(AppIcons.edit),
            tooltip: 'Edit Household',
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                  // Household Information Card
                  _buildHouseholdInfoCard(),
                  const SizedBox(height: 16),
                  
                  // Family Structure Card
                  _buildFamilyStructureCard(),
                  const SizedBox(height: 16),
                  
                  // Family Members Table
                  _buildFamilyMembersTable(),
                  const SizedBox(height: 16),
                  
                  // Pets Section
                  _buildPetsSection(),
                ],
              ),
            ),
      ), // Closes SafeArea
    );
  }

  Widget _buildHouseholdInfoCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(AppIcons.household, size: 24, color: AppColors.primary),
                const SizedBox(width: 8),
                const Text(
                  'Household Information',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Household Image Section
            _buildHouseholdImageSection(),
            const SizedBox(height: 16),
            
            _buildInfoRow('Household ID', _currentHousehold.id?.toString() ?? 'Not available'),
            _buildInfoRow('Local ID', _currentHousehold.localId?.toString() ?? 'Not available'),
            _buildInfoRow('Address', _currentHousehold.fullAddress),
            _buildInfoRow('House Number', _currentHousehold.houseNumber ?? 'Not specified'),
            _buildInfoRow('Street', _currentHousehold.street ?? 'Not specified'),
            _buildInfoRow('Purok ID', _currentHousehold.purokId.toString()),
            _buildInfoRow('Barangay ID', _currentHousehold.barangayId.toString()),
            _buildInfoRow('Household Head ID', _currentHousehold.houseHead),
            _buildInfoRow('Household Head', _residents[_currentHousehold.houseHead]?.fullName ?? 'Unknown'),
            _buildInfoRow('Housing Type', _currentHousehold.housingType ?? 'Not specified'),
            _buildInfoRow('Structure Type', _currentHousehold.structureType ?? 'Not specified'),
            _buildInfoRow('Electricity', _currentHousehold.electricity ? 'Yes' : 'No'),
            _buildInfoRow('Water Source', _currentHousehold.waterSource ?? 'Not specified'),
            _buildInfoRow('Toilet Facility', _currentHousehold.toiletFacility ?? 'Not specified'),
            if (_currentHousehold.latitude != null && _currentHousehold.longitude != null)
              _buildInfoRow('Coordinates', '${_currentHousehold.latitude!.toStringAsFixed(6)}, ${_currentHousehold.longitude!.toStringAsFixed(6)}'),
            if (_currentHousehold.area != null)
              _buildInfoRow('Area', '${_currentHousehold.area!.toStringAsFixed(2)} sqm'),
          ],
        ),
      ),
    );
  }

  Widget _buildFamilyStructureCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(AppIcons.users, size: 24, color: AppColors.primary),
                const SizedBox(width: 8),
                const Text(
                  'Family Structure',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_families.isEmpty)
              const Text(
                'No family information available',
                style: TextStyle(
                  color: Colors.grey,
                  fontStyle: FontStyle.italic,
                ),
              )
            else
              ...(_families.map((family) => _buildFamilyInfo(family))),
          ],
        ),
      ),
    );
  }

  Widget _buildFamilyInfo(Family family) {
    final familyHead = _residents[family.familyHead];
    final familyMemberCount = _familyMembers.where((m) => m.familyId == family.id).length;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            family.familyGroup,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text('Family ID: ${family.id}'),
          Text('Household ID: ${family.householdId}'),
          Text('Family Head ID: ${family.familyHead}'),
          Text('Family Head: ${familyHead?.fullName ?? 'Unknown'}'),
          Text('Members: $familyMemberCount'),
        ],
      ),
    );
  }

  Widget _buildFamilyMembersTable() {
    if (_familyMembers.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const Icon(AppIcons.users, size: 48, color: Colors.grey),
              const SizedBox(height: 8),
              const Text(
                'No family members found',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(AppIcons.users, size: 24, color: AppColors.primary),
                const SizedBox(width: 8),
                const Text(
                  'Family Members',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                Text(
                  '${_familyMembers.length} members',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Group family members by family
            ...(_families.map((family) => _buildFamilyMembersGroup(family))),
          ],
        ),
      ),
    );
  }

  Widget _buildFamilyMembersGroup(Family family) {
    final familyMembers = _familyMembers.where((m) => m.familyId == family.id).toList();
    final familyHead = _residents[family.familyHead];
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Family Group Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  family.familyGroup,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Head: ${familyHead?.fullName ?? 'Unknown'}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Text(
                '${familyMembers.length} members',
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 12,
                ),
              ),
              const SizedBox(width: 8),
              // Edit Family Button
              IconButton(
                onPressed: () => _editFamily(family),
                icon: const Icon(
                  AppIcons.edit,
                  size: 20,
                  color: AppColors.primary,
                ),
                tooltip: 'Edit Family',
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(
                  minWidth: 32,
                  minHeight: 32,
                ),
              ),
              // Delete Family Button
              IconButton(
                onPressed: () => _deleteFamily(family),
                icon: const Icon(
                  AppIcons.delete,
                  size: 20,
                  color: AppColors.error,
                ),
                tooltip: 'Delete Family',
                padding: const EdgeInsets.all(4),
                constraints: const BoxConstraints(
                  minWidth: 32,
                  minHeight: 32,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Family Members List
          if (familyMembers.isEmpty)
            const Text(
              'No members in this family',
              style: TextStyle(
                color: Colors.grey,
                fontStyle: FontStyle.italic,
              ),
            )
          else
            ...(familyMembers.map((member) => _buildFamilyMemberRow(member, family))),
        ],
      ),
    );
  }

  Widget _buildFamilyMemberRow(FamilyMember member, Family family) {
    final resident = _residents[member.familyMember];
    final isFamilyHead = family.familyHead == member.familyMember;
    final isHouseHead = _currentHousehold.houseHead == member.familyMember;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isHouseHead ? AppColors.success.withOpacity(0.1) : Colors.white,
        border: Border.all(
          color: isHouseHead ? AppColors.success.withOpacity(0.3) : Colors.grey.shade300,
          width: 1,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          // Member Avatar/Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: isFamilyHead ? AppColors.primary : Colors.grey.shade400,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isFamilyHead ? Icons.person : Icons.person_outline,
              color: Colors.white,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          
          // Member Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        resident?.fullName ?? 'Unknown',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: isHouseHead ? AppColors.success : null,
                        ),
                      ),
                    ),
                    if (isHouseHead)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.success,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'HOUSE HEAD',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      )
                    else if (isFamilyHead)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'FAMILY HEAD',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${resident?.sex ?? '-'} • ${resident?.civilStatus ?? '-'}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'ID: ${member.familyMember}',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPetsSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(AppIcons.pet, size: 24, color: AppColors.primary),
                const SizedBox(width: 8),
                const Text(
                  'Pets',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                if (_pets.isNotEmpty)
                  Text(
                    '${_pets.length} pets',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _addPet(),
                  icon: const Icon(AppIcons.plus),
                  tooltip: 'Add Pet',
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_pets.isEmpty)
              Container(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    const Icon(
                      AppIcons.pet,
                      size: 48,
                      color: Colors.grey,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'No pets registered',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tap the + button to add a pet',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              )
            else
              ...(_pets.map((pet) => _buildPetCard(pet))),
          ],
        ),
      ),
    );
  }

  Widget _buildPetCard(Pet pet) {
    final owner = _residents[pet.ownerId];
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.primary.withOpacity(0.1),
                backgroundImage: pet.picturePath != null && pet.picturePath!.isNotEmpty
                    ? FileImage(File(pet.picturePath!))
                    : null,
                child: pet.picturePath == null || pet.picturePath!.isEmpty
                    ? Icon(
                        AppIcons.pet,
                        color: AppColors.primary,
                        size: 20,
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      pet.petName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      '${pet.species} • ${pet.breed}',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                    if (owner != null)
                      Text(
                        'Owner: ${owner.fullName}',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                        ),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Row(
                    children: [
                      Icon(
                        pet.isVaccinated ? Icons.check_circle : Icons.cancel,
                        size: 16,
                        color: pet.isVaccinated ? AppColors.success : AppColors.error,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        pet.isVaccinated ? 'Vaccinated' : 'Not Vaccinated',
                        style: TextStyle(
                          color: pet.isVaccinated ? AppColors.success : AppColors.error,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    pet.ageString,
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ],
          ),
          if (pet.description != null && pet.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              pet.description!,
              style: TextStyle(
                color: Colors.grey[700],
                fontSize: 14,
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _editHousehold() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => HouseholdForm(household: _currentHousehold),
      ),
    );
    
    if (result == true) {
      // Refresh the data
      setState(() {
        _isLoading = true;
      });
      await _loadHouseholdDetails();
    }
  }

  Future<void> _addPet() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const PetFormScreen(),
      ),
    );
    
    if (result == true) {
      // Refresh the data
      setState(() {
        _isLoading = true;
      });
      await _loadHouseholdDetails();
    }
  }

  Future<void> _editFamily(Family family) async {
    try {
      // Ensure database service is initialized
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      // Get current family members
      final currentMembers = _familyMembers
          .where((m) => m.familyId == family.id)
          .map((m) => m.familyMember)
          .toList();

      // Show dialog to edit family head (current head is disabled)
      final newFamilyHead = await _showFamilyHeadSelectionDialog(
        currentFamilyHead: family.familyHead,
        currentMembers: currentMembers,
      );
      if (newFamilyHead == null) {
        // User cancelled the dialog
        return;
      }

      // Show dialog to edit family members (pre-select current members)
      final newFamilyMembers = await _showFamilyMemberSelectionDialog(
        newFamilyHead,
        currentMembers: currentMembers,
      );

      // Check if user cancelled the member selection dialog
      // If the dialog returns null, it means user cancelled
      if (newFamilyMembers == null) {
        // User cancelled - don't update anything
        return;
      }

      // Update family in database
      setState(() {
        _isLoading = true;
      });

      await _databaseService.householdRepository.updateFamily(
        family.id!,
        newFamilyHead.id!,
        newFamilyMembers.map((r) => r.id!).toList(),
      );

      // Debug: Print updated household head
      print('Debug: After family update, household head should be: ${newFamilyHead.id}');

      // Refresh the data
      await _loadHouseholdDetails();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Family updated successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      debugPrint('Error editing family: $e');
      
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error editing family: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _deleteFamily(Family family) async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Delete Family'),
          content: Text(
            'Are you sure you want to delete ${family.familyGroup}? This action cannot be undone and will remove all family members from this family.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: TextButton.styleFrom(
                foregroundColor: AppColors.error,
              ),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    try {
      // Ensure database service is initialized
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      setState(() {
        _isLoading = true;
      });

      // Delete family and all its members
      await _databaseService.householdRepository.removeFamily(family.id!);

      // Refresh the data
      await _loadHouseholdDetails();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Family deleted successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      debugPrint('Error deleting family: $e');
      
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error deleting family: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _addAdditionalFamily() async {
    try {
      // Ensure database service is initialized
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      // Show dialog to select family head
      final familyHead = await _showFamilyHeadSelectionDialog();
      if (familyHead == null) return;

      // Show dialog to select family members
      final familyMembers = await _showFamilyMemberSelectionDialog(familyHead);
      if (familyMembers == null || familyMembers.isEmpty) return;

      // Show loading indicator
      setState(() {
        _isLoading = true;
      });

      // Create the additional family with timeout
      final familyMemberIds = familyMembers.map((m) => m.id!).toList();
      
      // Add timeout to prevent hanging
      await Future.any([
        _databaseService.householdRepository.createAdditionalFamily(
          widget.household.id!,
          familyHead.id!,
          familyMemberIds,
        ),
        Future.delayed(const Duration(seconds: 30), () {
          throw Exception('Family creation timed out after 30 seconds');
        }),
      ]);

      // Refresh the data
      await _loadHouseholdDetails();

      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Family added successfully with ${familyMembers.length} members'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      debugPrint('Error adding family: $e');
      
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        
        String errorMessage = 'Error adding family';
        if (e.toString().contains('timeout') || e.toString().contains('locked')) {
          errorMessage = 'Database is busy. Please try again in a moment.';
        } else if (e.toString().contains('Failed to create additional family')) {
          errorMessage = 'Failed to create family. Please check your data and try again.';
        } else {
          errorMessage = 'Error adding family: ${e.toString()}';
        }
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }


  // Helper method to get residents who are family heads in current barangay households
  Future<List<String>> _getAllFamilyHeads() async {
    try {
      // Get barangay ID from current household
      final barangayId = _currentHousehold.barangayId;
      final allHouseholds = await _databaseService.householdRepository.getAll(barangayId: barangayId);
      final List<String> allFamilyHeads = [];
      
      for (final household in allHouseholds) {
        final families = await _databaseService.householdRepository.getFamiliesByHousehold(household.id!);
        allFamilyHeads.addAll(families.map((f) => f.familyHead));
      }
      
      return allFamilyHeads;
    } catch (e) {
      debugPrint('Error getting all family heads: $e');
      return [];
    }
  }

  // Helper method to get residents who are family members in current barangay households
  Future<List<String>> _getAllFamilyMembers() async {
    try {
      // Get barangay ID from current household
      final barangayId = _currentHousehold.barangayId;
      final allHouseholds = await _databaseService.householdRepository.getAll(barangayId: barangayId);
      final List<String> allFamilyMembers = [];
      
      for (final household in allHouseholds) {
        final families = await _databaseService.householdRepository.getFamiliesByHousehold(household.id!);
        
        for (final family in families) {
          final members = await _databaseService.householdRepository.getFamilyMembers(family.id!);
          allFamilyMembers.addAll(members.map((m) => m.familyMember));
        }
      }
      
      return allFamilyMembers;
    } catch (e) {
      debugPrint('Error getting all family members: $e');
      return [];
    }
  }

  // Helper method to get residents who are family members in CURRENT household only
  Future<List<String>> _getCurrentHouseholdMembers() async {
    try {
      final families = await _databaseService.householdRepository.getFamiliesByHousehold(_currentHousehold.id!);
      final List<String> currentHouseholdMembers = [];
      
      for (final family in families) {
        final members = await _databaseService.householdRepository.getFamilyMembers(family.id!);
        currentHouseholdMembers.addAll(members.map((m) => m.familyMember));
      }
      
      return currentHouseholdMembers;
    } catch (e) {
      debugPrint('Error getting current household members: $e');
      return [];
    }
  }

  Future<Resident?> _showFamilyHeadSelectionDialog({
    String? currentFamilyHead,
    List<String> currentMembers = const [],
  }) async {
    try {
      final residents = await _databaseService.residentRepository.getAll();
      final allFamilyHeads = await _getAllFamilyHeads();
      final allFamilyMembers = await _getAllFamilyMembers();
      
      // Get current household members to exclude them from disabled list
      final currentHouseholdMembers = await _getCurrentHouseholdMembers();
      
      return await showDialog<Resident>(
        context: context,
        builder: (context) => AdditionalFamilyHeadSelectionDialog(
          allResidents: residents,
          availableResidents: residents.where((r) => 
            r.id != _currentHousehold.houseHead
          ).toList(),
          existingFamilyHeads: allFamilyHeads,
          existingFamilyMembers: allFamilyMembers,
          currentHouseholdMembers: currentHouseholdMembers,
          currentFamilyHead: currentFamilyHead,
        ),
      );
    } catch (e) {
      debugPrint('Error loading residents for family head selection: $e');
      return null;
    }
  }

  Future<List<Resident>?> _showFamilyMemberSelectionDialog(
    Resident familyHead, {
    List<String> currentMembers = const [],
  }) async {
    try {
      final residents = await _databaseService.residentRepository.getAll();
      final allFamilyHeads = await _getAllFamilyHeads();
      final allFamilyMembers = await _getAllFamilyMembers();
      
      // Get current household members to exclude them from disabled list
      final currentHouseholdMembers = await _getCurrentHouseholdMembers();
      
      return await showDialog<List<Resident>>(
        context: context,
        builder: (context) => AdditionalFamilyMemberSelectionDialog(
          allResidents: residents,
          availableResidents: residents.where((r) => 
            r.id != _currentHousehold.houseHead && 
            r.id != familyHead.id
          ).toList(),
          existingFamilyHeads: allFamilyHeads,
          existingFamilyMembers: allFamilyMembers,
          currentHouseholdMembers: currentHouseholdMembers,
          familyHead: familyHead,
          currentMembers: currentMembers,
        ),
      );
    } catch (e) {
      debugPrint('Error loading residents for family member selection: $e');
      return null;
    }
  }

  Widget _buildHouseholdImageSection() {
    return Center(
      child: Column(
        children: [
          // Household Image
          Container(
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
            child: _currentHousehold.householdImagePath != null && 
                   _currentHousehold.householdImagePath!.isNotEmpty
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(13),
                    child: Image.file(
                      File(_currentHousehold.householdImagePath!),
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Icon(
                          AppIcons.household,
                          size: 60,
                          color: AppColors.primary,
                        );
                      },
                    ),
                  )
                : Icon(
                    AppIcons.household,
                    size: 60,
                    color: AppColors.primary,
                  ),
          ),
          
          const SizedBox(height: 8),
          
          // Image Status
          Text(
            _currentHousehold.householdImagePath != null && 
            _currentHousehold.householdImagePath!.isNotEmpty
                ? 'Household photo'
                : 'No photo available',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class AdditionalFamilyHeadSelectionDialog extends StatefulWidget {
  final List<Resident> allResidents;
  final List<Resident> availableResidents;
  final List<String> existingFamilyHeads;
  final List<String> existingFamilyMembers;
  final List<String> currentHouseholdMembers;
  final String? currentFamilyHead;

  const AdditionalFamilyHeadSelectionDialog({
    super.key,
    required this.allResidents,
    required this.availableResidents,
    required this.existingFamilyHeads,
    required this.existingFamilyMembers,
    required this.currentHouseholdMembers,
    this.currentFamilyHead,
  });

  @override
  State<AdditionalFamilyHeadSelectionDialog> createState() => _AdditionalFamilyHeadSelectionDialogState();
}

class _AdditionalFamilyHeadSelectionDialogState extends State<AdditionalFamilyHeadSelectionDialog> {
  final _searchController = TextEditingController();
  List<Resident> _filteredResidents = [];
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    _filteredResidents = widget.allResidents;
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
          _filteredResidents = widget.allResidents;
        } else {
          _filteredResidents = widget.allResidents.where((resident) {
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
                const Icon(Icons.group_add, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.currentFamilyHead != null 
                        ? 'Select New Family Head'
                        : 'Select Family Head for New Family',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close, size: 20),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Search Field
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search residents...',
                prefixIcon: const Icon(Icons.search, size: 18),
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
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
                        
                        final isCurrentFamilyHead = widget.currentFamilyHead != null && 
                            resident.id == widget.currentFamilyHead;
                        final isExistingFamilyHead = widget.existingFamilyHeads.contains(resident.id);
                        final isExistingFamilyMember = widget.existingFamilyMembers.contains(resident.id);
                        final isCurrentHouseholdMember = widget.currentHouseholdMembers.contains(resident.id);
                        
                        // A resident is available if:
                        // 1. They are in the availableResidents list (basic filtering)
                        // 2. AND they are not a family head in OTHER households (outside current household)
                        // 3. AND they are not a family member in OTHER households (outside current household)
                        // NOTE: Current family head is disabled (cannot be unselected)
                        final isHeadInOtherHousehold = isExistingFamilyHead && !isCurrentHouseholdMember;
                        final isMemberInOtherHousehold = isExistingFamilyMember && !isCurrentHouseholdMember;
                        
                        final isAvailable = widget.availableResidents.any((r) => r.id == resident.id) &&
                            !isHeadInOtherHousehold &&
                            !isMemberInOtherHousehold;
                        
                        return Container(
                          margin: const EdgeInsets.only(bottom: 1),
                          decoration: BoxDecoration(
                            gradient: isCurrentFamilyHead 
                                ? LinearGradient(
                                    colors: [
                                      AppColors.primary.withOpacity(0.08),
                                      AppColors.primary.withOpacity(0.12),
                                    ],
                                    begin: Alignment.centerLeft,
                                    end: Alignment.centerRight,
                                  )
                                : null,
                            color: isCurrentFamilyHead 
                                ? null
                                : !isAvailable 
                                    ? Colors.grey.shade100 
                                    : Colors.white,
                            border: Border(
                              bottom: BorderSide(
                                color: Colors.grey.shade300,
                                width: 1,
                              ),
                              left: isCurrentFamilyHead ? BorderSide(
                                color: AppColors.primary,
                                width: 5,
                              ) : BorderSide.none,
                            ),
                            boxShadow: isCurrentFamilyHead ? [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.15),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ] : null,
                          ),
                          child: Opacity(
                            opacity: !isAvailable ? 0.6 : 1.0,
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            title: Text(
                              resident.fullName,
                              style: TextStyle(
                                fontWeight: isCurrentFamilyHead ? FontWeight.w700 : FontWeight.w500,
                                fontSize: 16,
                                  color: isCurrentFamilyHead 
                                      ? AppColors.primary.withOpacity(0.9)
                                      : !isAvailable 
                                          ? Colors.grey 
                                          : null,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${resident.sex} • ${resident.civilStatus}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: !isAvailable ? Colors.grey : null,
                                ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                if (isCurrentFamilyHead)
                                  Container(
                                          margin: const EdgeInsets.only(right: 4),
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                            borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Text(
                                            'Current Head (click to proceed)',
                                      style: TextStyle(
                                        color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      if (isExistingFamilyHead && !isCurrentFamilyHead)
                                        Container(
                                          margin: const EdgeInsets.only(right: 4),
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isHeadInOtherHousehold ? AppColors.warning : AppColors.success,
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Text(
                                            isHeadInOtherHousehold 
                                                ? 'Head in Other Household'
                                                : 'Head in This Household',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      if (isExistingFamilyMember && !isCurrentFamilyHead && !isExistingFamilyHead)
                                        Container(
                                          margin: const EdgeInsets.only(right: 4),
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isMemberInOtherHousehold ? AppColors.info : AppColors.success,
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Text(
                                            isMemberInOtherHousehold 
                                                ? 'Member in Other Household'
                                                : 'Member in This Household',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                        ),
                                    ],
                                  ),
                              ],
                            ),
                            trailing: isCurrentFamilyHead 
                                ? Container(
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [
                                          AppColors.primary.withOpacity(0.8),
                                          AppColors.primary,
                                        ],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      ),
                                      borderRadius: BorderRadius.circular(25),
                                      boxShadow: [
                                        BoxShadow(
                                          color: AppColors.primary.withOpacity(0.4),
                                          blurRadius: 8,
                                          offset: const Offset(0, 3),
                                        ),
                                        BoxShadow(
                                          color: Colors.white.withOpacity(0.2),
                                          blurRadius: 2,
                                          offset: const Offset(0, 1),
                                        ),
                                      ],
                                    ),
                                    child: IconButton(
                                      onPressed: () => Navigator.of(context).pop(resident),
                                      icon: const Icon(
                                        Icons.arrow_forward,
                                        color: Colors.white,
                                        size: 22,
                                      ),
                                      tooltip: 'Click to proceed with current head',
                                      style: IconButton.styleFrom(
                                        backgroundColor: Colors.transparent,
                                        foregroundColor: Colors.white,
                                      ),
                                    ),
                                  )
                                : IconButton(
                                    onPressed: !isAvailable ? null : () => Navigator.of(context).pop(resident),
                                    icon: Icon(
                                      Icons.add,
                                      color: !isAvailable 
                                          ? Colors.grey 
                                          : AppColors.primary,
                                      size: 20,
                                    ),
                                  ),
                            onTap: isCurrentFamilyHead 
                                ? () => Navigator.of(context).pop(resident) // Allow clicking current head to proceed
                                : (!isAvailable ? null : () => Navigator.of(context).pop(resident)),
                          ),
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

class AdditionalFamilyMemberSelectionDialog extends StatefulWidget {
  final List<Resident> allResidents;
  final List<Resident> availableResidents;
  final List<String> existingFamilyHeads;
  final List<String> existingFamilyMembers;
  final List<String> currentHouseholdMembers;
  final Resident familyHead;
  final List<String> currentMembers;

  const AdditionalFamilyMemberSelectionDialog({
    super.key,
    required this.allResidents,
    required this.availableResidents,
    required this.existingFamilyHeads,
    required this.existingFamilyMembers,
    required this.currentHouseholdMembers,
    required this.familyHead,
    this.currentMembers = const [],
  });

  @override
  State<AdditionalFamilyMemberSelectionDialog> createState() => _AdditionalFamilyMemberSelectionDialogState();
}

class _AdditionalFamilyMemberSelectionDialogState extends State<AdditionalFamilyMemberSelectionDialog> {
  final _searchController = TextEditingController();
  List<Resident> _filteredResidents = [];
  List<Resident> _selectedMembers = [];
  Timer? _searchDebounce;

  @override
  void initState() {
    super.initState();
    _filteredResidents = widget.allResidents;
    _searchController.addListener(_filterResidents);
    
    // Pre-select current members when editing
    _selectedMembers = widget.allResidents
        .where((resident) => widget.currentMembers.contains(resident.id))
        .toList();
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
          _filteredResidents = widget.allResidents;
        } else {
          _filteredResidents = widget.allResidents.where((resident) {
            return resident.fullName.toLowerCase().contains(query) ||
                   resident.firstName.toLowerCase().contains(query) ||
                   resident.lastName.toLowerCase().contains(query);
          }).toList();
        }
      });
    });
  }

  void _toggleMember(Resident resident) {
    // Use the same availability logic as the ListView
    final isExistingFamilyHead = widget.existingFamilyHeads.contains(resident.id);
    final isExistingFamilyMember = widget.existingFamilyMembers.contains(resident.id);
    final isCurrentHouseholdMember = widget.currentHouseholdMembers.contains(resident.id);
    
    final isHeadInOtherHousehold = isExistingFamilyHead && !isCurrentHouseholdMember;
    final isMemberInOtherHousehold = isExistingFamilyMember && !isCurrentHouseholdMember;
    
    // Current household members are always available for toggling
    final isAvailable = isCurrentHouseholdMember || 
        (widget.availableResidents.any((r) => r.id == resident.id) &&
        !isHeadInOtherHousehold &&
        !isMemberInOtherHousehold);
        
    if (!isAvailable) return; // Don't toggle if not available
    
    setState(() {
      if (_selectedMembers.any((m) => m.id == resident.id)) {
        _selectedMembers.removeWhere((m) => m.id == resident.id);
      } else {
        _selectedMembers.add(resident);
      }
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
                const Icon(Icons.group_add, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Select Family Members',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Family Head: ${widget.familyHead.fullName}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(null),
                  icon: const Icon(Icons.close, size: 20),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Search Field
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search residents...',
                prefixIcon: const Icon(Icons.search, size: 18),
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
              ),
            ),
            const SizedBox(height: 8),
            
            // Selected Members Count
            Text(
              '${_selectedMembers.length} selected',
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
                        final isSelected = _selectedMembers.any((m) => m.id == resident.id);
                        final isExistingFamilyHead = widget.existingFamilyHeads.contains(resident.id);
                        final isExistingFamilyMember = widget.existingFamilyMembers.contains(resident.id);
                        final isCurrentHouseholdMember = widget.currentHouseholdMembers.contains(resident.id);
                        
                        // A resident is available if:
                        // 1. They are in the availableResidents list (basic filtering)
                        // 2. AND they are not a family head in OTHER households (outside current household)
                        // 3. AND they are not a family member in OTHER households (outside current household)
                        // NOTE: Current household members and heads are always available for toggling
                        final isHeadInOtherHousehold = isExistingFamilyHead && !isCurrentHouseholdMember;
                        final isMemberInOtherHousehold = isExistingFamilyMember && !isCurrentHouseholdMember;
                        
                        // Current household members are always available for toggling
                        final isAvailable = isCurrentHouseholdMember || 
                            (widget.availableResidents.any((r) => r.id == resident.id) &&
                            !isHeadInOtherHousehold &&
                            !isMemberInOtherHousehold);
                        
                        return Container(
                          margin: const EdgeInsets.only(bottom: 1),
                          decoration: BoxDecoration(
                            color: isSelected 
                                ? AppColors.primary.withOpacity(0.1) 
                                : !isAvailable 
                                    ? Colors.grey.shade100 
                                    : null,
                            border: Border(
                              bottom: BorderSide(
                                color: Colors.grey.shade300,
                                width: 1,
                              ),
                            ),
                          ),
                          child: Opacity(
                            opacity: !isAvailable ? 0.6 : 1.0,
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            title: Text(
                              resident.fullName,
                              style: TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 16,
                                  color: isSelected 
                                      ? AppColors.primary 
                                      : !isAvailable 
                                          ? Colors.grey 
                                          : null,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                              '${resident.sex} • ${resident.civilStatus}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: !isAvailable ? Colors.grey : null,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      if (isExistingFamilyHead)
                                        Container(
                                          margin: const EdgeInsets.only(right: 4),
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isHeadInOtherHousehold ? AppColors.warning : AppColors.success,
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Text(
                                            isHeadInOtherHousehold 
                                                ? 'Head in Other Household'
                                                : 'Head in This Household',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      if (isExistingFamilyMember && !isExistingFamilyHead)
                                        Container(
                                          margin: const EdgeInsets.only(right: 4),
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: isMemberInOtherHousehold ? AppColors.info : AppColors.success,
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Text(
                                            isMemberInOtherHousehold 
                                                ? 'Member in Other Household'
                                                : 'Current Member (can remove)',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                            ),
                            trailing: Checkbox(
                              value: isSelected,
                                onChanged: !isAvailable ? null : (_) => _toggleMember(resident),
                            ),
                              onTap: !isAvailable ? null : () => _toggleMember(resident),
                            ),
                          ),
                        );
                      },
                    ),
            ),
            
            // Action Buttons
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(null),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _selectedMembers.isEmpty 
                        ? null 
                        : () => Navigator.of(context).pop(_selectedMembers),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                    ),
                    child: Text('Add ${_selectedMembers.length} Members'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
