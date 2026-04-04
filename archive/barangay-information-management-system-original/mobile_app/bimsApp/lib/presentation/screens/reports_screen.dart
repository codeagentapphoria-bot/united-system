import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../core/services/database_service.dart';
import '../../core/services/offline_auth_manager.dart';
import '../../data/models/resident.dart';
import '../../data/models/household.dart';
import '../../core/constants/app_colors.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final DatabaseService _databaseService = DatabaseService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();
  bool _isLoading = true;
  int? _barangayId;
  
  // Chart data
  List<Resident> _residents = [];
  List<Household> _households = [];
  
  // Monthly data for line chart
  Map<String, int> _monthlyResidents = {};
  
  // Gender distribution for pie chart
  Map<String, int> _genderDistribution = {};
  
  // Age groups for bar chart
  Map<String, int> _ageGroups = {};
  
  // Purok distribution for bar chart
  Map<String, int> _purokDistribution = {};
  
  // Household totals
  int _totalHouseholds = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      await _databaseService.initialize();
      
      // Get barangay ID from secure storage
      _barangayId = await _offlineAuth.getBarangayId();
      
      // Load all residents and households (filtered by barangay)
      _residents = await _databaseService.residentRepository.getAll(barangayId: _barangayId);
      _households = await _databaseService.householdRepository.getAll(barangayId: _barangayId);
      
      // Process data for charts
      _processMonthlyData();
      _processGenderData();
      _processAgeData();
      _processPurokData();
      
      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading reports data: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _processMonthlyData() {
    _monthlyResidents.clear();
    
    // Get last 12 months
    final now = DateTime.now();
    for (int i = 11; i >= 0; i--) {
      final date = DateTime(now.year, now.month - i, 1);
      final monthKey = DateFormat('MMM yyyy').format(date);
      _monthlyResidents[monthKey] = 0;
    }
    
    // Count residents by month
    for (final resident in _residents) {
      if (resident.createdAt != null) {
        try {
          final createdDate = DateTime.parse(resident.createdAt!);
          final monthKey = DateFormat('MMM yyyy').format(createdDate);
          if (_monthlyResidents.containsKey(monthKey)) {
            _monthlyResidents[monthKey] = (_monthlyResidents[monthKey] ?? 0) + 1;
          }
        } catch (e) {
          print('Error parsing date: ${resident.createdAt}');
        }
      }
    }
  }

  void _processGenderData() {
    _genderDistribution.clear();
    for (final resident in _residents) {
      final gender = resident.sex.toLowerCase();
      _genderDistribution[gender] = (_genderDistribution[gender] ?? 0) + 1;
    }
  }

  void _processAgeData() {
    _ageGroups.clear();
    final now = DateTime.now();
    
    for (final resident in _residents) {
      try {
        final birthDate = DateTime.parse(resident.birthdate);
        final age = now.year - birthDate.year;
        
        String ageGroup;
        if (age < 18) {
          ageGroup = '0-17';
        } else if (age < 30) {
          ageGroup = '18-29';
        } else if (age < 45) {
          ageGroup = '30-44';
        } else if (age < 60) {
          ageGroup = '45-59';
        } else {
          ageGroup = '60+';
        }
        
        _ageGroups[ageGroup] = (_ageGroups[ageGroup] ?? 0) + 1;
      } catch (e) {
        print('Error parsing birthdate: ${resident.birthdate}');
      }
    }
  }

  void _processPurokData() {
    _purokDistribution.clear();
    _totalHouseholds = _households.length;
    
    for (final household in _households) {
      final purok = 'Purok ${household.purokId}';
      _purokDistribution[purok] = (_purokDistribution[purok] ?? 0) + 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports & Analytics'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSummaryCards(),
                    const SizedBox(height: 24),
                    _buildMonthlyResidentsChart(),
                    const SizedBox(height: 24),
                    _buildGenderDistributionChart(),
                    const SizedBox(height: 24),
                    _buildAgeGroupsChart(),
                    const SizedBox(height: 24),
                    _buildPurokDistributionChart(),
                    const SizedBox(height: 24),
                    _buildHouseholdStats(),
                  ],
                ),
              ),
            ),
      ), // Closes SafeArea
    );
  }

  Widget _buildSummaryCards() {
    return Row(
      children: [
        Expanded(
          child: _buildSummaryCard(
            'Total Residents',
            _residents.length.toString(),
            Icons.people,
            AppColors.primary,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildSummaryCard(
            'Total Households',
            _totalHouseholds.toString(),
            Icons.home,
            AppColors.success,
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthlyResidentsChart() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Residents Added by Month',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  gridData: const FlGridData(show: true),
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: true),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index >= 0 && index < _monthlyResidents.keys.length) {
                            final month = _monthlyResidents.keys.elementAt(index);
                            return Text(
                              month.split(' ')[0], // Show only month abbreviation
                              style: const TextStyle(fontSize: 10),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: true),
                  lineBarsData: [
                    LineChartBarData(
                      spots: _monthlyResidents.values
                          .toList()
                          .asMap()
                          .entries
                          .map((e) => FlSpot(e.key.toDouble(), e.value.toDouble()))
                          .toList(),
                      isCurved: true,
                      color: AppColors.primary,
                      barWidth: 3,
                      dotData: const FlDotData(show: true),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppColors.primary.withOpacity(0.1),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGenderDistributionChart() {
    if (_genderDistribution.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Gender Distribution',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sections: _genderDistribution.entries.map((entry) {
                    final color = entry.key.toLowerCase() == 'male' 
                        ? AppColors.primary 
                        : AppColors.success;
                    return PieChartSectionData(
                      color: color,
                      value: entry.value.toDouble(),
                      title: '${entry.key}\n${entry.value}',
                      radius: 60,
                      titleStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    );
                  }).toList(),
                  sectionsSpace: 2,
                  centerSpaceRadius: 40,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAgeGroupsChart() {
    if (_ageGroups.isEmpty) {
      return const SizedBox.shrink();
    }

    final sortedAgeGroups = _ageGroups.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Age Groups Distribution',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: sortedAgeGroups.map((e) => e.value).reduce((a, b) => a > b ? a : b).toDouble() + 5,
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: true),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index >= 0 && index < sortedAgeGroups.length) {
                            return Text(
                              sortedAgeGroups[index].key,
                              style: const TextStyle(fontSize: 10),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: true),
                  barGroups: sortedAgeGroups.asMap().entries.map((entry) {
                    return BarChartGroupData(
                      x: entry.key,
                      barRods: [
                        BarChartRodData(
                          toY: entry.value.value.toDouble(),
                          color: AppColors.primary,
                          width: 20,
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPurokDistributionChart() {
    if (_purokDistribution.isEmpty) {
      return const SizedBox.shrink();
    }

    final sortedPuroks = _purokDistribution.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));

    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Households by Purok',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: sortedPuroks.map((e) => e.value).reduce((a, b) => a > b ? a : b).toDouble() + 2,
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: true),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final index = value.toInt();
                          if (index >= 0 && index < sortedPuroks.length) {
                            return Text(
                              sortedPuroks[index].key,
                              style: const TextStyle(fontSize: 10),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                  ),
                  borderData: FlBorderData(show: true),
                  barGroups: sortedPuroks.asMap().entries.map((entry) {
                    return BarChartGroupData(
                      x: entry.key,
                      barRods: [
                        BarChartRodData(
                          toY: entry.value.value.toDouble(),
                          color: AppColors.success,
                          width: 20,
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHouseholdStats() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Household Statistics',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    'With Electricity',
                    _households.where((h) => h.electricity).length.toString(),
                    Icons.electrical_services,
                    AppColors.success,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatItem(
                    'Without Electricity',
                    _households.where((h) => !h.electricity).length.toString(),
                    Icons.power_off,
                    AppColors.error,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    'With Housing Type',
                    _households.where((h) => h.housingType != null && h.housingType!.isNotEmpty).length.toString(),
                    Icons.home_work,
                    AppColors.info,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildStatItem(
                    'With Location',
                    _households.where((h) => h.latitude != null && h.longitude != null).length.toString(),
                    Icons.location_on,
                    AppColors.warning,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            title,
            style: const TextStyle(
              fontSize: 10,
              color: Colors.grey,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
