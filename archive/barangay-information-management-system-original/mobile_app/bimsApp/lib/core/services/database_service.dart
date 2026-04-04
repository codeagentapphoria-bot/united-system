import '../../data/database/database_helper.dart';
import '../../data/repositories/sqlite_resident_repository.dart';
import '../../data/repositories/sqlite_household_repository.dart';
import '../../data/repositories/sqlite_pets_repository.dart';
import '../../domain/repositories/resident_repository.dart';
import '../../domain/repositories/household_repository.dart';
import '../../domain/repositories/pets_repository.dart';

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  late DatabaseHelper _databaseHelper;
  late ResidentRepository _residentRepository;
  late HouseholdRepository _householdRepository;
  late PetsRepository _petsRepository;

  bool _isInitialized = false;

  // Getters
  DatabaseHelper get databaseHelper => _databaseHelper;
  ResidentRepository get residentRepository => _residentRepository;
  HouseholdRepository get householdRepository => _householdRepository;
  PetsRepository get petsRepository => _petsRepository;
  bool get isInitialized => _isInitialized;

  // Initialize database and repositories
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      print('Initializing database service...');
      
      // Initialize database helper
      _databaseHelper = DatabaseHelper.instance;
      
      // Wait for database to be ready with timeout
      try {
        await Future.any([
          _databaseHelper.database,
          Future.delayed(const Duration(seconds: 10), () {
            throw Exception('Database initialization timeout');
          }),
        ]);
        print('Database connection established');
      } catch (e) {
        print('Database connection failed: $e');
        // Try to close and recreate database connection
        try {
          await _databaseHelper.close();
        } catch (closeError) {
          print('Error closing database: $closeError');
        }
        
        // Reinitialize database helper
        _databaseHelper = DatabaseHelper.instance;
        await _databaseHelper.database;
        print('Database connection re-established');
      }
      
      // Initialize repositories
      _residentRepository = SQLiteResidentRepository();
      _householdRepository = SQLiteHouseholdRepository();
      _petsRepository = SQLitePetsRepository();
      
      _isInitialized = true;
      print('Database service initialized successfully');
    } catch (e) {
      print('Failed to initialize database service: $e');
      _isInitialized = false;
      
      // Don't rethrow immediately, try to provide a fallback
      print('Attempting to recover from database initialization failure...');
      
      // Wait a bit and try again
      await Future.delayed(const Duration(seconds: 2));
      
      try {
        // Try one more time with minimal configuration
        _databaseHelper = DatabaseHelper.instance;
        await _databaseHelper.database;
        
        _residentRepository = SQLiteResidentRepository();
        _householdRepository = SQLiteHouseholdRepository();
        _petsRepository = SQLitePetsRepository();
        
        _isInitialized = true;
        print('Database service recovered successfully');
      } catch (retryError) {
        print('Database recovery failed: $retryError');
        _isInitialized = false;
        rethrow;
      }
    }
  }

  // Close database connection
  Future<void> close() async {
    if (_isInitialized) {
      await _databaseHelper.close();
      _isInitialized = false;
    }
  }

  // Check database health
  Future<bool> isHealthy() async {
    if (!_isInitialized) return false;
    
    try {
      // Try to execute a simple query
      final db = await _databaseHelper.database;
      await db.rawQuery('SELECT 1');
      return true;
    } catch (e) {
      print('Database health check failed: $e');
      return false;
    }
  }

  // Check if database is available for operations
  bool get isAvailable => _isInitialized;

  // Get database status
  String get status {
    if (!_isInitialized) return 'Not initialized';
    return 'Ready';
  }

  // Get database statistics
  Future<Map<String, dynamic>> getDatabaseStats({int? barangayId}) async {
    if (!_isInitialized) {
      return {'error': 'Database not initialized'};
    }

    try {
      final db = await _databaseHelper.database;
      
      // Build WHERE clause for barangay filtering
      final barangayFilter = barangayId != null ? 'AND barangay_id = $barangayId' : '';
      
      // Get synced residents count (sync_status = 'synced' or has server_id)
      final syncedResidentsResult = await db.rawQuery('''
        SELECT COUNT(*) as count FROM residents 
        WHERE (sync_status = 'synced' OR server_id IS NOT NULL) $barangayFilter
      ''');
      final syncedResidents = syncedResidentsResult.first['count'] as int;
      
      // Get pending residents count (sync_status = 'pending')
      final pendingResidentsResult = await db.rawQuery('''
        SELECT COUNT(*) as count FROM residents 
        WHERE sync_status = 'pending' $barangayFilter
      ''');
      final pendingResidents = pendingResidentsResult.first['count'] as int;
      
      // Get synced households count (sync_status = 'synced' or has server_id)
      final syncedHouseholdsResult = await db.rawQuery('''
        SELECT COUNT(*) as count FROM households 
        WHERE (sync_status = 'synced' OR server_id IS NOT NULL) $barangayFilter
      ''');
      final syncedHouseholds = syncedHouseholdsResult.first['count'] as int;
      
      // Get pending households count (sync_status = 'pending')
      final pendingHouseholdsResult = await db.rawQuery('''
        SELECT COUNT(*) as count FROM households 
        WHERE sync_status = 'pending' $barangayFilter
      ''');
      final pendingHouseholds = pendingHouseholdsResult.first['count'] as int;
      
      return {
        'total_residents': syncedResidents,
        'total_households': syncedHouseholds,
        'pending_sync_residents': pendingResidents,
        'pending_sync_households': pendingHouseholds,
        'database_size': await _getDatabaseSize(),
        'last_updated': DateTime.now().toIso8601String(),
      };
    } catch (e) {
      return {'error': 'Failed to get database stats: $e'};
    }
  }

  // Get database file size
  Future<String> _getDatabaseSize() async {
    try {
      // This is a placeholder - in a real app you'd use dart:io to get file size
      return 'Unknown';
    } catch (e) {
      return 'Unknown';
    }
  }

  // Clear all data (for testing/reset purposes)
  Future<void> clearAllData() async {
    if (!_isInitialized) return;

    try {
      final db = await _databaseHelper.database;
      
      // Clear all tables
      await db.delete('residents');
      await db.delete('households');
      await db.delete('families');
      await db.delete('family_members');
      await db.delete('resident_classifications');
      await db.delete('sync_log');
      
      print('All data cleared successfully');
    } catch (e) {
      print('Failed to clear data: $e');
      rethrow;
    }
  }

  // Export database for backup
  Future<Map<String, dynamic>> exportData() async {
    if (!_isInitialized) {
      return {'error': 'Database not initialized'};
    }

    try {
      final residents = await _residentRepository.getAll();
      final households = await _householdRepository.getAll();
      
      return {
        'exported_at': DateTime.now().toIso8601String(),
        'residents': residents.map((r) => r.toJson()).toList(),
        'households': households.map((h) => h.toJson()).toList(),
        'total_records': residents.length + households.length,
      };
    } catch (e) {
      return {'error': 'Failed to export data: $e'};
    }
  }
  
  // Verify database schema
  Future<void> verifyDatabaseSchema() async {
    if (!_isInitialized) {
      throw Exception('Database not initialized');
    }
    
    try {
      await _databaseHelper.verifyDatabaseSchema();
    } catch (e) {
      print('Failed to verify database schema: $e');
      rethrow;
    }
  }
  
  // Recreate database (use with caution - will delete all data)
  Future<void> recreateDatabase() async {
    try {
      await _databaseHelper.recreateDatabase();
      // Reinitialize the service
      _isInitialized = false;
      await initialize();
    } catch (e) {
      print('Failed to recreate database: $e');
      rethrow;
    }
  }
}
