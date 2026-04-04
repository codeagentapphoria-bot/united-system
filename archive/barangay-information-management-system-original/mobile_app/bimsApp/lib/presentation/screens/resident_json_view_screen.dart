import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
import '../../data/models/resident.dart';
import '../../data/database/database_helper.dart';

class ResidentJsonViewScreen extends StatefulWidget {
  final Resident resident;

  const ResidentJsonViewScreen({
    super.key,
    required this.resident,
  });

  @override
  State<ResidentJsonViewScreen> createState() => _ResidentJsonViewScreenState();
}

class _ResidentJsonViewScreenState extends State<ResidentJsonViewScreen> {
  List<Map<String, dynamic>> _classifications = [];

  @override
  void initState() {
    super.initState();
    _loadClassifications();
  }

  Future<void> _loadClassifications() async {
    if (widget.resident.id == null) {
      return;
    }

    try {
      final dbHelper = DatabaseHelper.instance;
      final classifications = await dbHelper.getResidentClassifications(widget.resident.id!);
      
      setState(() {
        _classifications = classifications;
      });
    } catch (e) {
      debugPrint('Error loading classifications: $e');
    }
  }

  Widget _buildClassificationDetails(String? details) {
    if (details == null || details.isEmpty) {
      return Text(
        'No additional details',
        style: TextStyle(
          fontSize: 12,
          color: Colors.grey[600],
          fontStyle: FontStyle.italic,
        ),
      );
    }

    // Check if it's JSON (dynamic fields) or plain text
    if (details.startsWith('{') || details.startsWith('[')) {
      try {
        final dynamicFields = jsonDecode(details) as Map<String, dynamic>;
        if (dynamicFields.isNotEmpty) {
          // Display each field on a new line
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: dynamicFields.entries.map((entry) {
              // Format the field name to be more readable
              final fieldName = entry.key
                  .replaceAll('_', ' ')
                  .split(' ')
                  .map((word) => word.isNotEmpty ? word[0].toUpperCase() + word.substring(1) : '')
                  .join(' ');
              
              final fieldValue = entry.value?.toString() ?? 'N/A';
              
              return Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  '$fieldName: $fieldValue',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              );
            }).toList(),
          );
        }
      } catch (e) {
        // If JSON parsing fails, treat as plain text
        debugPrint('Error parsing dynamic fields: $e');
      }
    }

    // Display as plain text
    return Text(
      details,
      style: TextStyle(
        fontSize: 12,
        color: Colors.grey[600],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Resident Details'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with resident name and photo
            _buildResidentHeader(),
            const SizedBox(height: 20),
            
            // Personal Information
            _buildPersonalInfoSection(),
            const SizedBox(height: 20),
            
            // Contact Information
            _buildContactInfoSection(),
            const SizedBox(height: 20),
            
            // Employment Information
            _buildEmploymentInfoSection(),
            const SizedBox(height: 20),
            
            // Education Information
            _buildEducationInfoSection(),
            const SizedBox(height: 20),
            
            // Status Information
            _buildStatusSection(),
            const SizedBox(height: 20),
            
            // Classifications
            if (_classifications.isNotEmpty) ...[
              _buildClassificationsSection(),
              const SizedBox(height: 20),
            ],
          ],
        ),
      ),
    );
  }


  Widget _buildResidentHeader() {
    return Container(
              width: double.infinity,
      padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue[600]!, Colors.blue[400]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12.0),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundColor: Colors.white,
            child: Text(
              widget.resident.fullName.split(' ').map((e) => e[0]).take(2).join('').toUpperCase(),
              style: TextStyle(
                color: Colors.blue[600],
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                  widget.resident.fullName,
                    style: const TextStyle(
                    fontSize: 24,
                      fontWeight: FontWeight.bold,
                    color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Server ID: ${widget.resident.serverResidentId ?? 'N/A'}',
                  style: const TextStyle(
                      fontSize: 14,
                    color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPersonalInfoSection() {
    return _buildInfoCard(
      title: 'Personal Information',
      icon: Icons.person,
      color: Colors.green,
              children: [
                _buildInfoRow('Sex', widget.resident.sex),
                _buildInfoRow('Civil Status', _formatCivilStatus(widget.resident.civilStatus)),
                _buildInfoRow('Birth Date', widget.resident.birthdate),
                _buildInfoRow('Age', widget.resident.age.toString()),
                _buildInfoRow('Place of Birth', widget.resident.birthplace ?? 'N/A'),
              ],
    );
  }

  Widget _buildContactInfoSection() {
    return _buildInfoCard(
      title: 'Contact Information',
      icon: Icons.contact_phone,
      color: Colors.orange,
      children: [
        _buildInfoRow('Phone Number', widget.resident.contactNumber ?? 'N/A'),
        _buildInfoRow('Email', widget.resident.email ?? 'N/A'),
      ],
    );
  }

  Widget _buildEmploymentInfoSection() {
    return _buildInfoCard(
      title: 'Employment Information',
      icon: Icons.work,
      color: Colors.blue,
      children: [
        _buildInfoRow('Occupation', widget.resident.occupation ?? 'N/A'),
        _buildInfoRow('Employment Status', _formatEmploymentStatus(widget.resident.employmentStatus)),
        if (widget.resident.monthlyIncome != null)
          _buildInfoRow('Monthly Income', _formatIncome(widget.resident.monthlyIncome!)),
      ],
    );
  }

  Widget _buildEducationInfoSection() {
    return _buildInfoCard(
      title: 'Education Information',
      icon: Icons.school,
      color: Colors.indigo,
      children: [
        _buildInfoRow('Education Attainment', _formatEducationAttainment(widget.resident.educationAttainment)),
      ],
    );
  }

  Widget _buildStatusSection() {
    return _buildInfoCard(
      title: 'Status Information',
      icon: Icons.info,
      color: Colors.purple,
      children: [
        _buildInfoRow('Resident Status', widget.resident.residentStatus),
        _buildInfoRow('Sync Status', widget.resident.syncStatus),
        _buildInfoRow('Created At', widget.resident.createdAt ?? 'N/A'),
        _buildInfoRow('Updated At', widget.resident.updatedAt ?? 'N/A'),
      ],
    );
  }

  Widget _buildClassificationsSection() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: Colors.teal.withOpacity(0.3)),
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
              color: Colors.teal.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12.0),
                topRight: Radius.circular(12.0),
              ),
            ),
            child: Row(
              children: [
                Icon(Icons.category, color: Colors.teal, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Classifications',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.teal,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: _classifications.map((classification) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12.0),
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8.0),
                    border: Border.all(color: Colors.teal.withOpacity(0.3)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.teal.withOpacity(0.1),
                        blurRadius: 2,
                        offset: const Offset(0, 1),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8.0),
                        decoration: BoxDecoration(
                          color: Colors.teal.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(6.0),
                        ),
                        child: Icon(
                          Icons.label,
                          color: Colors.teal,
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              classification['classification_type'] ?? 'Unknown Type',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: Colors.black87,
                              ),
                            ),
                            const SizedBox(height: 4),
                            _buildClassificationDetails(classification['classification_details']),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.green.withOpacity(0.3)),
                        ),
                        child: Text(
                          'ACTIVE',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.green[700],
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
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

  // Formatting methods for employment and education data
  String _formatEmploymentStatus(String? status) {
    if (status == null || status.isEmpty) return 'N/A';
    
    switch (status.toLowerCase()) {
      case 'employed':
        return 'Employed';
      case 'unemployed':
        return 'Unemployed';
      case 'self-employed':
        return 'Self-Employed';
      case 'student':
        return 'Student';
      case 'retired':
        return 'Retired';
      case 'not_applicable':
        return 'Not Applicable';
      case 'housewife':
        return 'Housewife';
      default:
        return status;
    }
  }

  String _formatEducationAttainment(String? education) {
    if (education == null || education.isEmpty) return 'N/A';
    
    switch (education.toLowerCase()) {
      case 'no_formal_education':
        return 'No Formal Education';
      case 'primary_school':
        return 'Primary School';
      case 'elementary':
        return 'Elementary';
      case 'high_school':
        return 'High School';
      case 'vocational':
        return 'Vocational';
      case 'college':
        return 'College';
      case 'post_graduate':
        return 'Post Graduate';
      case 'masters':
        return 'Masters Degree';
      case 'doctorate':
        return 'Doctorate';
      default:
        return education;
    }
  }

  String _formatIncome(double income) {
    return '₱${income.toStringAsFixed(2)}';
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
