import 'package:flutter/material.dart';
import '../../data/models/pet.dart';
import '../../core/services/database_service.dart';
import '../../core/services/auth_service.dart';
import '../../core/constants/app_colors.dart';
import '../../widgets/image_avatar_widget.dart';

class PetDetailsScreen extends StatefulWidget {
  final Pet pet;

  const PetDetailsScreen({
    super.key,
    required this.pet,
  });

  @override
  State<PetDetailsScreen> createState() => _PetDetailsScreenState();
}

class _PetDetailsScreenState extends State<PetDetailsScreen> {
  String _ownerName = 'Loading...';
  String _purokName = 'Loading...';
  String _barangayName = 'Loading...';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPetData();
  }

  Future<void> _loadPetData() async {
    try {
      final databaseService = DatabaseService();
      if (!databaseService.isInitialized) {
        await databaseService.initialize();
      }

      // Get owner name
      final owner = await databaseService.residentRepository.getById(widget.pet.ownerId);
      if (owner != null) {
        setState(() {
          _ownerName = owner.fullName;
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
        if (userData?.targetId != null) {
          final puroks = await authService.getStoredPuroks(userData!.targetId!);
          if (puroks.isNotEmpty) {
            setState(() {
              _purokName = puroks.first['name'] ?? 'Unknown Purok';
            });
          } else {
            setState(() {
              _purokName = 'Unknown Purok';
            });
          }
        }
        
        print('🐾 PET DETAILS - Loaded names:');
        print('   Barangay: $_barangayName');
        print('   Purok: $_purokName');
        print('   Owner: $_ownerName');
        
      } catch (e) {
        debugPrint('Error loading purok/barangay names: $e');
        setState(() {
          _purokName = 'Unknown Purok';
          _barangayName = 'Unknown Barangay';
        });
      }

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading pet data: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pet Details'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header with pet info
                  _buildPetHeader(),
                  const SizedBox(height: 20),
                  
                  // Basic Information
                  _buildBasicInfoSection(),
                  const SizedBox(height: 20),
                  
                  // Owner Information
                  _buildOwnerSection(),
                  const SizedBox(height: 20),
                  
                  // Health Information
                  _buildHealthSection(),
                ],
              ),
            ),
      ), // Closes SafeArea
    );
  }

  Widget _buildPetHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, AppColors.primary.withOpacity(0.8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12.0),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          PetAvatarWidget(
            imagePath: widget.pet.picturePath,
            name: widget.pet.petName,
            size: 60,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.pet.petName.isNotEmpty ? widget.pet.petName[0].toUpperCase() + widget.pet.petName.substring(1) : widget.pet.petName,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${widget.pet.species} • ${widget.pet.breed}',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.white70,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Owner: $_ownerName',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.white60,
                  ),
                ),
                if (widget.pet.color.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Color: ${widget.pet.color}',
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
        _buildInfoRow('Pet Name', widget.pet.petName.isNotEmpty ? widget.pet.petName[0].toUpperCase() + widget.pet.petName.substring(1) : widget.pet.petName),
        _buildInfoRow('Species', widget.pet.species),
        _buildInfoRow('Breed', widget.pet.breed),
        _buildInfoRow('Sex', widget.pet.sex),
        _buildInfoRow('Age', widget.pet.ageString),
        _buildInfoRow('Color', widget.pet.color.isNotEmpty ? widget.pet.color : 'N/A'),
        _buildInfoRow('Sync Status', widget.pet.syncStatus),
        _buildInfoRow('Created At', widget.pet.createdAt ?? 'N/A'),
        _buildInfoRow('Updated At', widget.pet.updatedAt ?? 'N/A'),
      ],
    );
  }

  Widget _buildOwnerSection() {
    return _buildInfoCard(
      title: 'Owner Information',
      icon: Icons.person,
      color: Colors.green,
      children: [
        _buildInfoRow('Owner Name', _ownerName),
        _buildInfoRow('Purok', _purokName),
        _buildInfoRow('Barangay', _barangayName),
      ],
    );
  }

  Widget _buildHealthSection() {
    return _buildInfoCard(
      title: 'Health Information',
      icon: Icons.health_and_safety,
      color: Colors.orange,
      children: [
        _buildInfoRow('Vaccination Status', widget.pet.isVaccinated ? 'Vaccinated' : 'Not Vaccinated'),
        _buildInfoRow('Vaccination Date', widget.pet.vaccinationDate ?? 'N/A'),
        _buildInfoRow('Description', widget.pet.description?.isNotEmpty == true ? widget.pet.description! : 'N/A'),
      ],
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
}
