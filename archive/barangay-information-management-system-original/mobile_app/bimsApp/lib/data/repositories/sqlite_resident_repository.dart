import 'package:sqflite/sqflite.dart';
import '../../domain/repositories/resident_repository.dart';
import '../models/resident.dart';
import '../database/database_helper.dart';

class SQLiteResidentRepository implements ResidentRepository {
  final DatabaseHelper _databaseHelper = DatabaseHelper.instance;

  @override
  Future<Resident> create(Resident resident) async {
    final db = await _databaseHelper.database;
    
    // Generate local ID if not provided
    final localId = resident.localId ?? await _getNextLocalId(db);
    
    // Create new resident with local ID
    final newResident = resident.copyWith(
      localId: localId,
      id: 'LOCAL_$localId',
      createdAt: DateTime.now().toIso8601String(),
      updatedAt: DateTime.now().toIso8601String(),
    );
    
    final result = await db.insert(
      'residents',
      newResident.toJson(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    
    if (result > 0) {
      return newResident.copyWith(id: 'LOCAL_$result');
    } else {
      throw Exception('Failed to create resident');
    }
  }

  @override
  Future<Resident?> getById(String id) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'residents',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (maps.isNotEmpty) {
      return Resident.fromJson(maps.first);
    }
    return null;
  }

  @override
  Future<Resident?> getByLocalId(int localId) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'residents',
      where: 'local_id = ?',
      whereArgs: [localId],
    );
    
    if (maps.isNotEmpty) {
      return Resident.fromJson(maps.first);
    }
    return null;
  }

  @override
  Future<List<Resident>> getAll({int? barangayId}) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'residents',
      where: barangayId != null ? 'barangay_id = ?' : null,
      whereArgs: barangayId != null ? [barangayId] : null,
      orderBy: 'last_name ASC, first_name ASC',
    );
    
    return maps.map((map) => Resident.fromJson(map)).toList();
  }

  @override
  Future<List<Resident>> getByBarangay(int barangayId) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'residents',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
      orderBy: 'last_name ASC, first_name ASC',
    );
    
    return maps.map((map) => Resident.fromJson(map)).toList();
  }

  @override
  Future<Resident> update(Resident resident) async {
    final db = await _databaseHelper.database;
    
    final updatedResident = resident.copyWith(
      updatedAt: DateTime.now().toIso8601String(),
    );
    
    final result = await db.update(
      'residents',
      updatedResident.toJson(),
      where: 'id = ?',
      whereArgs: [resident.id],
    );
    
    if (result > 0) {
      return updatedResident;
    } else {
      throw Exception('Failed to update resident');
    }
  }

  @override
  Future<bool> delete(String id) async {
    final db = await _databaseHelper.database;
    
    final result = await db.delete(
      'residents',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    return result > 0;
  }

  @override
  Future<List<Resident>> searchByName(String query, {int? barangayId}) async {
    final db = await _databaseHelper.database;
    
    String whereClause = 'last_name LIKE ? OR first_name LIKE ? OR middle_name LIKE ?';
    List<dynamic> whereArgs = ['%$query%', '%$query%', '%$query%'];
    
    if (barangayId != null) {
      whereClause = '($whereClause) AND barangay_id = ?';
      whereArgs.add(barangayId);
    }
    
    final List<Map<String, dynamic>> maps = await db.query(
      'residents',
      where: whereClause,
      whereArgs: whereArgs,
      orderBy: 'last_name ASC, first_name ASC',
    );
    
    return maps.map((map) => Resident.fromJson(map)).toList();
  }

  @override
  Future<List<Resident>> getByStatus(String status) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'residents',
      where: 'resident_status = ?',
      whereArgs: [status],
      orderBy: 'last_name ASC, first_name ASC',
    );
    
    return maps.map((map) => Resident.fromJson(map)).toList();
  }

  @override
  Future<List<Resident>> getByClassification(String classificationType) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.rawQuery('''
      SELECT r.* FROM residents r
      INNER JOIN resident_classifications rc ON r.id = rc.resident_id
      WHERE rc.classification_type = ?
      ORDER BY r.last_name ASC, r.first_name ASC
    ''', [classificationType]);
    
    return maps.map((map) => Resident.fromJson(map)).toList();
  }

  @override
  Future<List<Resident>> getPendingSync() async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'residents',
      where: 'sync_status = ?',
      whereArgs: ['pending'],
      orderBy: 'created_at ASC',
    );
    
    return maps.map((map) => Resident.fromJson(map)).toList();
  }

  @override
  Future<bool> updateSyncStatus(String id, String status) async {
    final db = await _databaseHelper.database;
    
    final result = await db.update(
      'residents',
      {
        'sync_status': status,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    
    return result > 0;
  }

  @override
  Future<bool> updateServerId(String localId, String serverId) async {
    final db = await _databaseHelper.database;
    
    final result = await db.update(
      'residents',
      {
        'server_id': serverId,
        'sync_status': 'synced',
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'local_id = ?',
      whereArgs: [localId],
    );
    
    return result > 0;
  }

  // Update server resident ID after successful API sync
  // Usage: When posting resident data to main server, use the returned server ID
  // Update server resident ID using the UUID (id field, not local_id)
  // Example: await repository.updateServerResidentId(resident.id, serverResponseId);
  Future<bool> updateServerResidentId(String id, String serverResidentId) async {
    final db = await _databaseHelper.database;
    
    final result = await db.update(
      'residents',
      {
        'server_resident_id': serverResidentId,
        'sync_status': 'synced',
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',  // ✅ Use UUID id, not local_id
      whereArgs: [id],
    );
    
    return result > 0;
  }

  @override
  Future<int> getCount() async {
    final db = await _databaseHelper.database;
    
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM residents');
    return Sqflite.firstIntValue(result) ?? 0;
  }

  @override
  Future<int> getCountByBarangay(int barangayId) async {
    final db = await _databaseHelper.database;
    
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM residents WHERE barangay_id = ?',
      [barangayId],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  @override
  Future<int> getCountByStatus(String status) async {
    final db = await _databaseHelper.database;
    
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM residents WHERE resident_status = ?',
      [status],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  // Pagination support
  Future<List<Resident>> getPaginated({
    int limit = 20,
    int offset = 0,
    String? searchQuery,
    String? statusFilter,
    String? syncStatusFilter,
    int? barangayId,
  }) async {
    final db = await _databaseHelper.database;
    
    String whereClause = '';
    List<dynamic> whereArgs = [];
    
    // Add barangay filter first if provided
    if (barangayId != null) {
      whereClause += 'barangay_id = ?';
      whereArgs.add(barangayId);
    }
    
    if (searchQuery != null && searchQuery.isNotEmpty) {
      if (whereClause.isNotEmpty) {
        whereClause += ' AND ';
      }
      whereClause += '(last_name LIKE ? OR first_name LIKE ? OR middle_name LIKE ?)';
      whereArgs.addAll(['%$searchQuery%', '%$searchQuery%', '%$searchQuery%']);
    }
    
    if (statusFilter != null && statusFilter.isNotEmpty) {
      if (whereClause.isNotEmpty) {
        whereClause += ' AND ';
      }
      whereClause += 'resident_status = ?';
      whereArgs.add(statusFilter);
    }
    
    if (syncStatusFilter != null && syncStatusFilter.isNotEmpty) {
      if (whereClause.isNotEmpty) {
        whereClause += ' AND ';
      }
      whereClause += 'sync_status = ?';
      whereArgs.add(syncStatusFilter);
    }
    
    final List<Map<String, dynamic>> maps = await db.query(
      'residents',
      where: whereClause.isNotEmpty ? whereClause : null,
      whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
      orderBy: 'last_name ASC, first_name ASC',
      limit: limit,
      offset: offset,
    );
    
    return maps.map((map) => Resident.fromJson(map)).toList();
  }

  // Helper method to get next local ID
  Future<int> _getNextLocalId(Database db) async {
    final result = await db.rawQuery('SELECT MAX(local_id) as max_id FROM residents');
    final maxId = Sqflite.firstIntValue(result) ?? 0;
    return maxId + 1;
  }
}
