import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';
import '../../core/services/database_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../data/models/pet.dart';
import '../../data/models/resident.dart';
import '../../widgets/image_avatar_widget.dart';
import 'pet_form_screen.dart';
import 'pet_details_screen.dart';

class PetsListScreen extends StatefulWidget {
  const PetsListScreen({super.key});

  @override
  State<PetsListScreen> createState() => _PetsListScreenState();
}

class _PetsListScreenState extends State<PetsListScreen> {
  final DatabaseService _databaseService = DatabaseService();
  final TextEditingController _searchController = TextEditingController();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  
  List<Pet> _pets = [];
  List<Pet> _filteredPets = [];
  Map<String, Resident> _owners = {};
  bool _isLoading = true;
  String _searchQuery = '';
  bool? _vaccinationFilter; // null = all, true = vaccinated, false = not vaccinated
  String? _speciesFilter;
  int? _barangayId;

  @override
  void initState() {
    super.initState();
    _loadBarangayIdAndPets();
  }
  
  Future<void> _loadBarangayIdAndPets() async {
    final barangayId = await _offlineAuth.getBarangayId();
    setState(() {
      _barangayId = barangayId;
    });
    _loadPets();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPets() async {
    try {
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      final pets = await _databaseService.petsRepository.getAll(barangayId: _barangayId);
      
      // Load owner details for each pet
      final Map<String, Resident> owners = {};
      for (final pet in pets) {
        if (!owners.containsKey(pet.ownerId)) {
          final owner = await _databaseService.residentRepository.getById(pet.ownerId);
          if (owner != null) {
            owners[pet.ownerId] = owner;
          }
        }
      }

      if (mounted) {
        setState(() {
          _pets = pets;
          _owners = owners;
          _isLoading = false;
        });

        _applyFilters();
      }
    } catch (e) {
      debugPrint('Error loading pets: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorSnackBar('Error loading pets: $e');
      }
    }
  }

  void _applyFilters() {
    if (!mounted) return;
    
    List<Pet> filtered = _pets;

    // Hide synced pets permanently
    filtered = filtered.where((pet) => pet.syncStatus != 'synced').toList();

    // Apply search filter
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((pet) {
        return pet.petName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               pet.species.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               pet.breed.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               pet.color.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               (_owners[pet.ownerId]?.fullName.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
      }).toList();
    }

    // Apply vaccination filter
    if (_vaccinationFilter != null) {
      filtered = filtered.where((pet) => pet.isVaccinated == _vaccinationFilter).toList();
    }

    // Apply species filter
    if (_speciesFilter != null && _speciesFilter!.isNotEmpty) {
      filtered = filtered.where((pet) => pet.species == _speciesFilter).toList();
    }

    if (mounted) {
      setState(() {
        _filteredPets = filtered;
      });
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

  void _showRawJsonDialog(Pet pet) {
    final jsonString = _formatJson(pet.toMap());
    
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('${pet.petName} - Raw JSON Data'),
          content: SizedBox(
            width: double.maxFinite,
            height: 400,
            child: SingleChildScrollView(
              child: SelectableText(
                jsonString,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                ),
              ),
            ),
          ),
          actions: [
            TextButton.icon(
              onPressed: () {
                Clipboard.setData(ClipboardData(text: jsonString));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('JSON data copied to clipboard'),
                    duration: Duration(seconds: 2),
                    backgroundColor: AppColors.success,
                  ),
                );
              },
              icon: const Icon(Icons.copy, size: 16),
              label: const Text('Copy'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  String _formatJson(Map<String, dynamic> json) {
    // Simple JSON formatting for display
    final buffer = StringBuffer();
    buffer.writeln('{');
    json.forEach((key, value) {
      if (value is String) {
        buffer.writeln('  "$key": "$value",');
      } else if (value is int || value is double) {
        buffer.writeln('  "$key": $value,');
      } else if (value is bool) {
        buffer.writeln('  "$key": $value,');
      } else if (value == null) {
        buffer.writeln('  "$key": null,');
      } else {
        buffer.writeln('  "$key": "$value",');
      }
    });
    buffer.writeln('}');
    return buffer.toString();
  }

  Future<void> _deletePet(Pet pet) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Delete Pet'),
          content: Text('Are you sure you want to delete ${pet.petName}? This action cannot be undone.'),
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
      await _databaseService.petsRepository.delete(pet.id!);
      await _loadPets();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Pet deleted successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      debugPrint('Error deleting pet: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error deleting pet: ${e.toString()}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // Add Pet Button at the top
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16.0),
            child: ElevatedButton.icon(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const PetFormScreen(),
                  ),
                );
                if (result == true) {
                  await _loadPets();
                }
              },
              icon: const Icon(Icons.add),
              label: const Text('Add New Pet'),
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
                    hintText: 'Search pets, owners, species...',
                    prefixIcon: const Icon(AppIcons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            onPressed: () {
                              _searchController.clear();
                              if (mounted) {
                                setState(() {
                                  _searchQuery = '';
                                });
                                _applyFilters();
                              }
                            },
                            icon: const Icon(Icons.clear),
                          )
                        : null,
                    border: const OutlineInputBorder(),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                  onChanged: (value) {
                    if (mounted) {
                      setState(() {
                        _searchQuery = value;
                      });
                      _applyFilters();
                    }
                  },
                ),
                
                const SizedBox(height: 12),
                
                // Filter Options
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<bool?>(
                        value: _vaccinationFilter,
                        decoration: const InputDecoration(
                          labelText: 'Vaccination Status',
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        items: const [
                          DropdownMenuItem(value: null, child: Text('All')),
                          DropdownMenuItem(value: true, child: Text('Vaccinated')),
                          DropdownMenuItem(value: false, child: Text('Not Vaccinated')),
                        ],
                        onChanged: (value) {
                          if (mounted) {
                            setState(() {
                              _vaccinationFilter = value;
                            });
                            _applyFilters();
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FutureBuilder<List<String>>(
                        future: _databaseService.petsRepository.getAllSpecies(),
                        builder: (context, snapshot) {
                          return DropdownButtonFormField<String?>(
                            value: _speciesFilter,
                            decoration: const InputDecoration(
                              labelText: 'Species',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                            items: [
                              const DropdownMenuItem(value: null, child: Text('All Species')),
                              if (snapshot.hasData)
                                ...snapshot.data!.map((species) => DropdownMenuItem(
                                  value: species,
                                  child: Text(species),
                                )),
                            ],
                            onChanged: (value) {
                              if (mounted) {
                                setState(() {
                                  _speciesFilter = value;
                                });
                                _applyFilters();
                              }
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Pets List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredPets.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _filteredPets.length,
                        itemBuilder: (context, index) {
                          final pet = _filteredPets[index];
                          final owner = _owners[pet.ownerId];
                          return _buildPetCard(pet, owner);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            AppIcons.pet,
            size: 64,
            color: Colors.grey,
          ),
          const SizedBox(height: 16),
          Text(
            _pets.isEmpty ? 'No pets registered' : 'No pets found',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _pets.isEmpty 
                ? 'Tap the + button to add your first pet'
                : 'Try adjusting your search or filters',
            style: const TextStyle(
              fontSize: 14,
              color: Colors.grey,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPetCard(Pet pet, Resident? owner) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      elevation: 2,
      child: ListTile(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => PetDetailsScreen(pet: pet),
            ),
          );
        },
        leading: PetAvatarWidget(
          imagePath: pet.picturePath,
          name: pet.petName,
          size: 48,
        ),
        title: Text(
          pet.petName.isNotEmpty ? pet.petName[0].toUpperCase() + pet.petName.substring(1) : pet.petName,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            if (owner != null) Text('Owner: ${owner.fullName}'),
            const SizedBox(height: 4),
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
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) async {
            switch (value) {
              case 'view':
                _showRawJsonDialog(pet);
                break;
              case 'edit':
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => PetFormScreen(pet: pet),
                  ),
                );
                if (result == true) {
                  await _loadPets();
                }
                break;
              case 'delete':
                await _deletePet(pet);
                break;
            }
          },
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'view',
              child: Row(
                children: [
                  Icon(AppIcons.view, color: Colors.blue),
                  SizedBox(width: 8),
                  Text('View Details'),
                ],
              ),
            ),
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
    );
  }

}
