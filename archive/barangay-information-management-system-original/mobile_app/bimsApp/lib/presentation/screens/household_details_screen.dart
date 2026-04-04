import 'package:flutter/material.dart';
import '../../data/models/household.dart';
import '../../data/models/pet.dart';
import '../../core/services/database_service.dart';
import '../../core/services/auth_service.dart';
import '../../widgets/image_avatar_widget.dart';

class HouseholdDetailsScreen extends StatefulWidget {
  final Household household;

  const HouseholdDetailsScreen({
    super.key,
    required this.household,
  });

  @override
  State<HouseholdDetailsScreen> createState() => _HouseholdDetailsScreenState();
}

class _HouseholdDetailsScreenState extends State<HouseholdDetailsScreen> {
  String _houseHeadName = 'Loading...';
  String _purokName = 'Loading...';
  String _barangayName = 'Loading...';
  List<Map<String, dynamic>> _families = [];
  List<Pet> _pets = [];
  List<Map<String, dynamic>> _householdMembers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHouseholdData();
  }

  Future<void> _loadHouseholdData() async {
    try {
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }

      // Get house head name
      final houseHead = await databaseService.residentRepository.getById(widget.household.houseHead);
      if (houseHead != null) {
        setState(() {
          _houseHeadName = houseHead.fullName;
        });
      }

      // Get purok and barangay names from stored data
      try {
        final authService = AuthService();
        
        // Get barangay name from user data
        final userData = await authService.getStoredUserData();
        if (userData != null && userData.barangayName != null) {
          setState(() {
            _barangayName = userData.barangayName!;
          });
        } else {
          setState(() {
            _barangayName = 'Unknown Barangay';
          });
        }
        
        // Get purok name from stored puroks
        final puroks = await authService.getStoredPuroks(widget.household.barangayId);
        final purok = puroks.firstWhere(
          (p) => p['id'] == widget.household.purokId, 
          orElse: () => {'name': 'Unknown Purok'}
        );
        setState(() {
          _purokName = purok['name'] ?? 'Unknown Purok';
        });
        
        print('🏘️ HOUSEHOLD DETAILS - Loaded names:');
        print('   Barangay: $_barangayName');
        print('   Purok: $_purokName');
        print('   Purok ID: ${widget.household.purokId}');
        print('   Barangay ID: ${widget.household.barangayId}');
        
      } catch (e) {
        debugPrint('Error loading purok/barangay names: $e');
        setState(() {
          _purokName = 'Unknown Purok';
          _barangayName = 'Unknown Barangay';
        });
      }

      // Get families for this household
      final families = await databaseService.householdRepository.getFamiliesByHousehold(widget.household.id!);
      
      // Get family members for each family
      final List<Map<String, dynamic>> familiesData = [];
      for (final family in families) {
        final familyMembers = await databaseService.householdRepository.getFamilyMembers(family.id!);
        
        // Get resident details for each family member
        final List<Map<String, dynamic>> familyMembersData = [];
        for (final member in familyMembers) {
          final resident = await databaseService.residentRepository.getById(member.familyMember);
          if (resident != null) {
            familyMembersData.add({
              'name': resident.fullName,
              'relationship': member.relationshipToHead,
            });
          }
        }

        // Get family head name
        final familyHead = await databaseService.residentRepository.getById(family.familyHead);
        final familyHeadName = familyHead?.fullName ?? 'Unknown';

        familiesData.add({
          'id': family.id,
          'head_name': familyHeadName,
          'members': familyMembersData,
        });
      }

      // Get pets for this household
      final pets = await databaseService.petsRepository.getPetsByHousehold(widget.household.id!.toString());
      
      // Get all household members with their income data
      await _loadHouseholdMembers(databaseService);
      
      setState(() {
        _families = familiesData;
        _pets = pets;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading household data: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadHouseholdMembers(DatabaseService databaseService) async {
    try {
      final db = await databaseService.databaseHelper.database;
      
      // Get all household members (house head + family members) for this household
      final List<Map<String, dynamic>> householdMembers = await db.rawQuery('''
        SELECT DISTINCT 
          r.id,
          r.first_name,
          r.last_name,
          r.middle_name,
          r.suffix,
          r.monthly_income,
          r.occupation,
          r.employment_status,
          CASE 
            WHEN h.house_head = r.id THEN 'House Head'
            WHEN f.family_head = r.id THEN 'Family Head'
            ELSE COALESCE(fm.relationship_to_head, 'Family Member')
          END as relationship
        FROM residents r
        LEFT JOIN households h ON h.house_head = r.id
        LEFT JOIN families f ON f.household_id = h.id AND f.family_head = r.id
        LEFT JOIN family_members fm ON fm.family_id = f.id AND fm.family_member = r.id
        WHERE r.id IN (
          -- Get house head
          SELECT h2.house_head 
          FROM households h2 
          WHERE h2.id = ?
          UNION
          -- Get family heads
          SELECT f2.family_head
          FROM families f2
          WHERE f2.household_id = ?
          UNION
          -- Get family members
          SELECT fm2.family_member
          FROM families f3
          JOIN family_members fm2 ON f3.id = fm2.family_id
          WHERE f3.household_id = ?
        )
        ORDER BY 
          CASE WHEN h.house_head = r.id THEN 1 ELSE 2 END,
          r.last_name, r.first_name
      ''', [widget.household.id, widget.household.id, widget.household.id]);
      
      setState(() {
        _householdMembers = householdMembers;
      });
    } catch (e) {
      debugPrint('Error loading household members: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Household Details'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header with household info
                  _buildHouseholdHeader(),
                  const SizedBox(height: 20),
                  
                  // Basic Information
                  _buildBasicInfoSection(),
                  const SizedBox(height: 20),
                  
                  // Location Information
                  _buildLocationSection(),
                  const SizedBox(height: 20),
                  
                  // Housing Details
                  _buildHousingSection(),
                  const SizedBox(height: 20),
                  
                  // Household Income
                  if (_householdMembers.isNotEmpty) ...[
                    _buildHouseholdIncomeSection(),
                    const SizedBox(height: 20),
                  ],
                  
                  // Family Information
                  if (_families.isNotEmpty) ...[
                    _buildFamilySection(),
                    const SizedBox(height: 20),
                  ],
                  
                  // Pets Information
                  if (_pets.isNotEmpty) ...[
                    _buildPetsSection(),
                    const SizedBox(height: 20),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildHouseholdHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.green[600]!, Colors.green[400]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12.0),
        boxShadow: [
          BoxShadow(
            color: Colors.green.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          HouseholdAvatarWidget(
            imagePath: widget.household.householdImagePath,
            name: _purokName,
            size: 60,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _purokName.isNotEmpty ? _purokName[0].toUpperCase() + _purokName.substring(1) : _purokName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Head: $_houseHeadName',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.white70,
                  ),
                ),
                if (widget.household.houseNumber != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'House #${widget.household.houseNumber}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.white60,
                    ),
                  ),
                ],
                if (widget.household.street != null && widget.household.street!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    '${widget.household.street}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.white60,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBasicInfoSection() {
    return _buildInfoCard(
      title: 'Basic Information',
      icon: Icons.info,
      color: Colors.blue,
      children: [
        _buildInfoRow('House Number', widget.household.houseNumber ?? 'N/A'),
        _buildInfoRow('Street', widget.household.street ?? 'N/A'),
        _buildInfoRow('Purok', _purokName),
        _buildInfoRow('Barangay', _barangayName),
        _buildInfoRow('House Head', _houseHeadName),
        _buildInfoRow('Sync Status', widget.household.syncStatus),
        _buildInfoRow('Created At', widget.household.createdAt ?? 'N/A'),
        _buildInfoRow('Updated At', widget.household.updatedAt ?? 'N/A'),
      ],
    );
  }

  Widget _buildLocationSection() {
    return _buildInfoCard(
      title: 'Location Information',
      icon: Icons.location_on,
      color: Colors.orange,
      children: [
        _buildInfoRow('Latitude', widget.household.latitude?.toString() ?? 'N/A'),
        _buildInfoRow('Longitude', widget.household.longitude?.toString() ?? 'N/A'),
        _buildInfoRow('Has Location', widget.household.hasLocation ? 'Yes' : 'No'),
        _buildInfoRow('Area (sq.m)', widget.household.area?.toString() ?? 'N/A'),
      ],
    );
  }

  Widget _buildHousingSection() {
    return _buildInfoCard(
      title: 'Housing Details',
      icon: Icons.home_work,
      color: Colors.purple,
      children: [
        _buildInfoRow('Housing Type', widget.household.housingType ?? 'N/A'),
        _buildInfoRow('Structure Type', widget.household.structureType ?? 'N/A'),
        _buildInfoRow('Has Electricity', widget.household.electricity ? 'Yes' : 'No'),
        _buildInfoRow('Water Source', widget.household.waterSource ?? 'N/A'),
        _buildInfoRow('Toilet Facility', widget.household.toiletFacility ?? 'N/A'),
      ],
    );
  }

  Widget _buildHouseholdIncomeSection() {
    // Calculate total household income
    double totalIncome = 0.0;
    int membersWithIncome = 0;
    
    for (final member in _householdMembers) {
      final income = member['monthly_income'];
      if (income != null && income > 0) {
        totalIncome += income;
        membersWithIncome++;
      }
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: Colors.amber.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12.0),
                topRight: Radius.circular(12.0),
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.account_balance_wallet, color: Colors.amber[700], size: 20),
                const SizedBox(width: 8),
                Text(
                  'Household Income',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.amber[700],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                // Summary row
                Container(
                  padding: const EdgeInsets.all(12.0),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(8.0),
                    border: Border.all(color: Colors.amber.withOpacity(0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total Household Income:',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.amber[700],
                        ),
                      ),
                      Text(
                        '₱${totalIncome.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.amber[700],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                // Summary statistics
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey[50],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: Column(
                          children: [
                            Text(
                              _householdMembers.length.toString(),
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.amber,
                              ),
                            ),
                            const Text(
                              'Total Members',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey[50],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: Column(
                          children: [
                            Text(
                              membersWithIncome.toString(),
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                            ),
                            const Text(
                              'With Income',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFamilySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Family summary info
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: Colors.teal.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12.0),
            border: Border.all(color: Colors.teal.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              Icon(Icons.family_restroom, color: Colors.teal, size: 20),
              const SizedBox(width: 8),
              Text(
                'Family Information',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.teal,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        
        // Family summary stats
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Column(
                  children: [
                    Text(
                      _families.length.toString(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.teal,
                      ),
                    ),
                    const Text(
                      'Total Families',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Column(
                  children: [
                    Text(
                      _families.fold(0, (sum, family) => sum + (family['members'] as List).length).toString(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.teal,
                      ),
                    ),
                    const Text(
                      'Total Members',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        
        // Individual families without card wrapper
        ...(_families.asMap().entries.map((entry) {
          final index = entry.key;
          final family = entry.value;
          return _buildFamilyItem(family, index + 1);
        }).toList()),
      ],
    );
  }

  Widget _buildFamilyItem(Map<String, dynamic> family, int familyNumber) {
    final members = family['members'] as List<Map<String, dynamic>>;
    
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.teal.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'Family $familyNumber',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: Colors.teal,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Head: ${family['head_name']}',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          if (members.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              'Members (${members.length}):',
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 4),
            ...(members.map((member) => Padding(
              padding: const EdgeInsets.only(left: 8, bottom: 2),
              child: Text(
                '• ${member['name']} (${member['relationship']})',
                style: const TextStyle(fontSize: 12, color: Colors.black87),
              ),
            )).toList()),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required String title,
    required IconData icon,
    required Color color,
    required List<Widget> children,
  }) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: color.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12.0),
                topRight: Radius.circular(12.0),
              ),
            ),
            child: Row(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: children,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
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
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPetsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Pets summary info
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16.0),
          decoration: BoxDecoration(
            color: Colors.orange.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12.0),
            border: Border.all(color: Colors.orange.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              Icon(Icons.pets, color: Colors.orange, size: 20),
              const SizedBox(width: 8),
              Text(
                'Pets Information',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.orange,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        
        // Pets summary stats
        Row(
          children: [
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Column(
                  children: [
                    Text(
                      _pets.length.toString(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.orange,
                      ),
                    ),
                    const Text(
                      'Total Pets',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Column(
                  children: [
                    Text(
                      _pets.where((pet) => pet.isVaccinated).length.toString(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                    const Text(
                      'Vaccinated',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        
        // Individual pets
        ...(_pets.map((pet) => _buildPetItem(pet)).toList()),
      ],
    );
  }

  Widget _buildPetItem(Pet pet) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 2,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: Colors.orange.withOpacity(0.1),
                child: Icon(
                  Icons.pets,
                  color: Colors.orange,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      pet.petName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${pet.species} • ${pet.breed}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
              ),
              _buildPetStatusChip(pet),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildPetInfoItem('Age', '${pet.age} years'),
              const SizedBox(width: 16),
              _buildPetInfoItem('Gender', pet.sex),
              const SizedBox(width: 16),
              _buildPetInfoItem('Color', pet.color),
            ],
          ),
          if (pet.isVaccinated && pet.vaccinationDate != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.green.withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Colors.green.withOpacity(0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.vaccines, color: Colors.green, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    'Vaccinated on ${pet.vaccinationDate}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.green,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPetStatusChip(Pet pet) {
    Color color;
    String label;
    
    switch (pet.syncStatus) {
      case 'synced':
        color = Colors.green;
        label = 'Synced';
        break;
      case 'pending':
        color = Colors.orange;
        label = 'Pending';
        break;
      case 'failed':
        color = Colors.red;
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

  Widget _buildPetInfoItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: Colors.grey,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.black87,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  String _buildFullName(String firstName, String lastName, String? middleName, String? suffix) {
    List<String> nameParts = [firstName];
    if (middleName != null && middleName.isNotEmpty) {
      nameParts.add(middleName);
    }
    nameParts.add(lastName);
    if (suffix != null && suffix.isNotEmpty) {
      nameParts.add(suffix);
    }
    return nameParts.join(' ');
  }
}
