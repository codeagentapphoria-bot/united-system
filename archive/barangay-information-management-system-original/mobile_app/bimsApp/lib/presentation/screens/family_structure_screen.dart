import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/database_service.dart';
import '../../data/models/family.dart';
import '../../data/models/family_member.dart';
import '../../data/models/household.dart';
import '../../data/models/resident.dart';

class FamilyStructureScreen extends StatefulWidget {
  final Household household;
  
  const FamilyStructureScreen({super.key, required this.household});

  @override
  State<FamilyStructureScreen> createState() => _FamilyStructureScreenState();
}

class _FamilyStructureScreenState extends State<FamilyStructureScreen> {
  List<Family> _families = [];
  List<Resident> _availableResidents = [];
  bool _isLoading = true;
  bool _isAddingFamily = false;
  
  final _familyGroupController = TextEditingController();
  Resident? _selectedFamilyHead;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _familyGroupController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Ensure database service is initialized
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      // Load families for this household
      final families = await databaseService.householdRepository.getFamiliesByHousehold(widget.household.id!);
      
      // Load available residents for this barangay
      final residents = await databaseService.residentRepository.getByBarangay(widget.household.barangayId);
      
      setState(() {
        _families = families;
        _availableResidents = residents;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading data: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showAddFamilyDialog() {
    _familyGroupController.clear();
    _selectedFamilyHead = null;
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Add New Family'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _familyGroupController,
                decoration: const InputDecoration(
                  labelText: 'Family Group Name',
                  hintText: 'e.g., Nuclear Family, Extended Family',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<Resident>(
                value: _selectedFamilyHead,
                decoration: const InputDecoration(
                  labelText: 'Family Head *',
                  border: OutlineInputBorder(),
                ),
                hint: const Text('Select family head'),
                items: _availableResidents.map((resident) {
                  return DropdownMenuItem(
                    value: resident,
                    child: Text(resident.fullName),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedFamilyHead = value;
                  });
                },
                validator: (value) {
                  if (value == null) {
                    return 'Please select a family head';
                  }
                  return null;
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: _selectedFamilyHead != null && _familyGroupController.text.isNotEmpty
                  ? () => _addFamily()
                  : null,
              child: const Text('Add Family'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _addFamily() async {
    if (_selectedFamilyHead == null || _familyGroupController.text.trim().isEmpty) {
      return;
    }

    try {
      final family = Family(
        householdId: widget.household.id!,
        familyGroup: _familyGroupController.text.trim(),
        familyHead: _selectedFamilyHead!.id!,
      );

      // Ensure database service is initialized
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      final savedFamily = await databaseService.householdRepository.createFamily(family);
      
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Family added successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        _loadData(); // Refresh the list
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error adding family: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _showAddMemberDialog(Family family) {
    Resident? selectedMember;
    String selectedRelationship = 'spouse';
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Add Family Member'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<Resident>(
                    value: selectedMember,
                    decoration: const InputDecoration(
                      labelText: 'Family Member *',
                      border: OutlineInputBorder(),
                    ),
                    hint: const Text('Select family member'),
                    items: _availableResidents.map((resident) {
                      return DropdownMenuItem(
                        value: resident,
                        child: Text(resident.fullName),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        selectedMember = value;
                      });
                    },
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: selectedRelationship,
                    decoration: const InputDecoration(
                      labelText: 'Relationship to Head',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'spouse', child: Text('Spouse')),
                      DropdownMenuItem(value: 'child', child: Text('Child')),
                      DropdownMenuItem(value: 'parent', child: Text('Parent')),
                      DropdownMenuItem(value: 'sibling', child: Text('Sibling')),
                      DropdownMenuItem(value: 'grandparent', child: Text('Grandparent')),
                      DropdownMenuItem(value: 'grandchild', child: Text('Grandchild')),
                      DropdownMenuItem(value: 'uncle_aunt', child: Text('Uncle/Aunt')),
                      DropdownMenuItem(value: 'nephew_niece', child: Text('Nephew/Niece')),
                      DropdownMenuItem(value: 'cousin', child: Text('Cousin')),
                      DropdownMenuItem(value: 'other', child: Text('Other')),
                    ],
                    onChanged: (value) {
                      setState(() {
                        selectedRelationship = value!;
                      });
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: selectedMember != null
                      ? () => _addFamilyMember(family, selectedMember!, selectedRelationship)
                      : null,
                  child: const Text('Add Member'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _addFamilyMember(Family family, Resident member, String relationship) async {
    try {
      final familyMember = FamilyMember(
        familyId: family.id!,
        familyMember: member.id!,
        relationshipToHead: relationship,
      );

      // Ensure database service is initialized
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      await databaseService.householdRepository.addFamilyMember(familyMember);
      
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Family member added successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        _loadData(); // Refresh the list
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error adding family member: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  Future<void> _removeFamilyMember(FamilyMember member) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Remove Family Member'),
          content: const Text('Are you sure you want to remove this family member?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
              child: const Text('Remove'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      try {
        // Ensure database service is initialized
        final databaseService = DatabaseService();
        if (!databaseService.isInitialized) {
          await databaseService.initialize();
        }
        
        await databaseService.householdRepository.removeFamilyMember(member.id!);
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Family member removed successfully!'),
              backgroundColor: AppColors.success,
            ),
          );
          _loadData(); // Refresh the list
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error removing family member: $e'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    }
  }

  Future<void> _removeFamily(Family family) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Remove Family'),
          content: const Text('Are you sure you want to remove this family? This will also remove all family members.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
              child: const Text('Remove'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      try {
        // Ensure database service is initialized
        final databaseService = DatabaseService();
        if (!databaseService.isInitialized) {
          await databaseService.initialize();
        }
        
        await databaseService.householdRepository.removeFamily(family.id!);
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Family removed successfully!'),
              backgroundColor: AppColors.success,
            ),
          );
          _loadData(); // Refresh the list
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Error removing family: $e'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Family Structure - ${widget.household.houseNumber ?? 'No Number'}'),
        actions: [
          IconButton(
            onPressed: _loadData,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Household Info Card
                _buildHouseholdInfoCard(),
                
                const SizedBox(height: 16),
                
                // Families List
                Expanded(
                  child: _families.isEmpty
                      ? _buildEmptyState()
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _families.length,
                          itemBuilder: (context, index) {
                            return _buildFamilyCard(_families[index]);
                          },
                        ),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddFamilyDialog,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildHouseholdInfoCard() {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.home, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  'Household Information',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text('Address: ${widget.household.street ?? 'No Street'} ${widget.household.houseNumber ?? ''}'),
            Text('Purok: ${widget.household.purokId}'),
            Text('Barangay: ${widget.household.barangayId}'),
            if (widget.household.latitude != null && widget.household.longitude != null)
              Text('Location: ${widget.household.latitude!.toStringAsFixed(6)}, ${widget.household.longitude!.toStringAsFixed(6)}'),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.family_restroom,
            size: 64,
            color: AppColors.textSecondary,
          ),
          const SizedBox(height: 16),
          Text(
            'No families added yet',
            style: TextStyle(
              fontSize: 18,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tap the + button to add the first family',
            style: TextStyle(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFamilyCard(Family family) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: ExpansionTile(
        title: Row(
          children: [
            Icon(Icons.family_restroom, color: AppColors.primary),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                family.familyGroup,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        subtitle: FutureBuilder<Resident?>(
          future: _getResidentById(family.familyHead),
          builder: (context, snapshot) {
            if (snapshot.hasData && snapshot.data != null) {
              return Text('Head: ${snapshot.data!.fullName}');
            }
            return const Text('Head: Loading...');
          },
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) {
            switch (value) {
              case 'add_member':
                _showAddMemberDialog(family);
                break;
              case 'remove_family':
                _removeFamily(family);
                break;
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'add_member',
              child: Row(
                children: [
                  Icon(Icons.person_add),
                  SizedBox(width: 8),
                  Text('Add Member'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'remove_family',
              child: Row(
                children: [
                  Icon(Icons.delete, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Remove Family', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
        children: [
          FutureBuilder<List<FamilyMember>>(
            future: _getFamilyMembers(family.id!),
            builder: (context, snapshot) {
              if (snapshot.hasData) {
                final members = snapshot.data!;
                if (members.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No family members added yet'),
                  );
                }
                
                return Column(
                  children: members.map((member) => _buildFamilyMemberTile(member)).toList(),
                );
              }
              return const Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFamilyMemberTile(FamilyMember member) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: AppColors.primary,
               child: Text(
         (member.relationshipToHead ?? 'U').substring(0, 1).toUpperCase(),
         style: const TextStyle(color: Colors.white),
       ),
      ),
      title: FutureBuilder<Resident?>(
        future: _getResidentById(member.familyMember),
        builder: (context, snapshot) {
          if (snapshot.hasData && snapshot.data != null) {
            return Text(snapshot.data!.fullName);
          }
          return const Text('Loading...');
        },
      ),
             subtitle: Text(_getRelationshipDisplayName(member.relationshipToHead ?? 'other')),
      trailing: IconButton(
        icon: const Icon(Icons.remove_circle, color: Colors.red),
        onPressed: () => _removeFamilyMember(member),
      ),
    );
  }

  String _getRelationshipDisplayName(String relationship) {
    switch (relationship) {
      case 'spouse': return 'Spouse';
      case 'child': return 'Child';
      case 'parent': return 'Parent';
      case 'sibling': return 'Sibling';
      case 'grandparent': return 'Grandparent';
      case 'grandchild': return 'Grandchild';
      case 'uncle_aunt': return 'Uncle/Aunt';
      case 'nephew_niece': return 'Nephew/Niece';
      case 'cousin': return 'Cousin';
      case 'other': return 'Other';
      default: return relationship;
    }
  }

  Future<Resident?> _getResidentById(String? id) async {
    if (id == null) return null;
    try {
      return await DatabaseService().residentRepository.getById(id);
    } catch (e) {
      return null;
    }
  }

  Future<List<FamilyMember>> _getFamilyMembers(int familyId) async {
    try {
      // Ensure database service is initialized
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }
      
      return await databaseService.householdRepository.getFamilyMembers(familyId);
    } catch (e) {
      return [];
    }
  }
}
