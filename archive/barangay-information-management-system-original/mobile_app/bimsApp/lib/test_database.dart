import 'package:flutter/material.dart';
import 'core/services/database_service.dart';
import 'data/models/resident.dart';
import 'seed_data.dart';

class DatabaseTestScreen extends StatefulWidget {
  const DatabaseTestScreen({super.key});

  @override
  State<DatabaseTestScreen> createState() => _DatabaseTestScreenState();
}

class _DatabaseTestScreenState extends State<DatabaseTestScreen> {
  final DatabaseService _databaseService = DatabaseService();
  List<Resident> _residents = [];
  String _status = 'Ready to test';
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _initializeDatabase();
  }

  Future<void> _initializeDatabase() async {
    setState(() {
      _isLoading = true;
      _status = 'Initializing database...';
    });

    try {
      await _databaseService.initialize();
      setState(() {
        _status = 'Database initialized successfully!';
      });
      await _loadResidents();
    } catch (e) {
      setState(() {
        _status = 'Error initializing database: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadResidents() async {
    try {
      final residents = await _databaseService.residentRepository.getAll();
      setState(() {
        _residents = residents;
        _status = 'Loaded ${residents.length} residents';
      });
    } catch (e) {
      setState(() {
        _status = 'Error loading residents: $e';
      });
    }
  }

  Future<void> _addTestResident() async {
    setState(() {
      _isLoading = true;
      _status = 'Adding test resident...';
    });

    try {
      final testResident = Resident(
        barangayId: 1, // Test data - this is fine for testing
        lastName: 'Dela Cruz',
        firstName: 'Juan',
        middleName: 'Santos',
        sex: 'male',
        civilStatus: 'single',
        birthdate: '1990-05-15',
        birthplace: 'Manila',
        contactNumber: '+639123456789',
        email: 'juan.delacruz@email.com',
        occupation: 'Software Developer',
        monthlyIncome: 50000.0,
        employmentStatus: 'employed',
        educationAttainment: 'college',
        residentStatus: 'active',
        indigenousPerson: false,
      );

      final createdResident = await _databaseService.residentRepository.create(testResident);
      
      setState(() {
        _status = 'Test resident added successfully! ID: ${createdResident.id}';
      });
      
      await _loadResidents();
    } catch (e) {
      setState(() {
        _status = 'Error adding test resident: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _getDatabaseStats() async {
    setState(() {
      _isLoading = true;
      _status = 'Getting database stats...';
    });

    try {
      final stats = await _databaseService.getDatabaseStats();
      setState(() {
        _status = 'Database Stats: $stats';
      });
    } catch (e) {
      setState(() {
        _status = 'Error getting stats: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _clearAllData() async {
    setState(() {
      _isLoading = true;
      _status = 'Clearing all data...';
    });

    try {
      await _databaseService.clearAllData();
      setState(() {
        _status = 'All data cleared successfully!';
        _residents = [];
      });
    } catch (e) {
      setState(() {
        _status = 'Error clearing data: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _seedSampleData() async {
    setState(() {
      _isLoading = true;
      _status = 'Seeding sample data...';
    });

    try {
      await DataSeeder.seedSampleResidents();
      setState(() {
        _status = 'Sample data seeded successfully!';
      });
      await _loadResidents();
    } catch (e) {
      setState(() {
        _status = 'Error seeding data: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Database Test'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Status:',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(_status),
                    if (_isLoading) ...[
                      const SizedBox(height: 16),
                      const LinearProgressIndicator(),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ElevatedButton(
                  onPressed: _isLoading ? null : _addTestResident,
                  child: const Text('Add Test Resident'),
                ),
                ElevatedButton(
                  onPressed: _isLoading ? null : _seedSampleData,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Seed Sample Data'),
                ),
                ElevatedButton(
                  onPressed: _isLoading ? null : _loadResidents,
                  child: const Text('Load Residents'),
                ),
                ElevatedButton(
                  onPressed: _isLoading ? null : _getDatabaseStats,
                  child: const Text('Get Stats'),
                ),
                ElevatedButton(
                  onPressed: _isLoading ? null : _clearAllData,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Clear All Data'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Residents (${_residents.length}):',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 300, // Fixed height for the list
                      child: _residents.isEmpty
                          ? const Center(
                              child: Text('No residents found'),
                            )
                          : ListView.builder(
                              itemCount: _residents.length,
                              itemBuilder: (context, index) {
                                final resident = _residents[index];
                                return ListTile(
                                  title: Text(resident.fullName),
                                  subtitle: Text(
                                    '${resident.sex} • ${resident.civilStatus} • ${resident.residentStatus}',
                                  ),
                                  trailing: Text('ID: ${resident.id}'),
                                );
                              },
                            ),
                    ),
                  ],
                ),
              ),
            ),
            ],
          ),
        ),
      ),
    );
  }
}
