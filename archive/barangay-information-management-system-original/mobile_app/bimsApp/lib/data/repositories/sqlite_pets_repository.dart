import 'package:sqflite/sqflite.dart';
import '../../domain/repositories/pets_repository.dart';
import '../models/pet.dart';
import '../database/database_helper.dart';

class SQLitePetsRepository implements PetsRepository {
  final DatabaseHelper _databaseHelper = DatabaseHelper.instance;

  @override
  Future<Pet> create(Pet pet) async {
    final db = await _databaseHelper.database;
    
    final newPet = pet.copyWith(
      createdAt: DateTime.now().toIso8601String(),
      updatedAt: DateTime.now().toIso8601String(),
    );
    
    final result = await db.insert(
      'pets',
      newPet.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    
    if (result > 0) {
      return newPet.copyWith(id: result);
    } else {
      throw Exception('Failed to create pet');
    }
  }

  @override
  Future<Pet?> getById(int id) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'pets',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (maps.isNotEmpty) {
      return Pet.fromMap(maps.first);
    }
    return null;
  }

  @override
  Future<List<Pet>> getAll({int? barangayId}) async {
    final db = await _databaseHelper.database;
    
    List<Map<String, dynamic>> maps;
    
    if (barangayId != null) {
      // Join with residents table to filter by barangay_id
      maps = await db.rawQuery('''
        SELECT p.* FROM pets p
        INNER JOIN residents r ON p.owner_id = r.id
        WHERE r.barangay_id = ?
        ORDER BY p.pet_name ASC
      ''', [barangayId]);
    } else {
      maps = await db.query(
        'pets',
        orderBy: 'pet_name ASC',
      );
    }
    
    return maps.map((map) => Pet.fromMap(map)).toList();
  }

  @override
  Future<List<Pet>> getByOwner(String ownerId) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'pets',
      where: 'owner_id = ?',
      whereArgs: [ownerId],
      orderBy: 'pet_name ASC',
    );
    
    return maps.map((map) => Pet.fromMap(map)).toList();
  }

  /// Get pets by household ID (all pets owned by residents in the household)
  Future<List<Pet>> getPetsByHousehold(String householdId) async {
    final db = await _databaseHelper.database;
    
    // Get all resident IDs in the household (house head + family members)
    final List<Map<String, dynamic>> residentMaps = await db.rawQuery('''
      SELECT DISTINCT r.id as resident_id
      FROM residents r
      WHERE r.id IN (
        -- Get house head
        SELECT h.house_head 
        FROM households h 
        WHERE h.id = ?
        UNION
        -- Get family heads
        SELECT f.family_head
        FROM families f
        WHERE f.household_id = ?
        UNION
        -- Get family members
        SELECT fm.family_member
        FROM families f
        JOIN family_members fm ON f.id = fm.family_id
        WHERE f.household_id = ?
      )
    ''', [householdId, householdId, householdId]);
    
    if (residentMaps.isEmpty) {
      return [];
    }
    
    // Extract resident IDs
    final residentIds = residentMaps.map((map) => map['resident_id'] as String).toList();
    
    // Get pets for all residents in the household
    final List<Map<String, dynamic>> petMaps = await db.query(
      'pets',
      where: 'owner_id IN (${residentIds.map((_) => '?').join(',')})',
      whereArgs: residentIds,
      orderBy: 'pet_name ASC',
    );
    
    return petMaps.map((map) => Pet.fromMap(map)).toList();
  }

  @override
  Future<List<Pet>> getBySpecies(String species) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'pets',
      where: 'species = ?',
      whereArgs: [species],
      orderBy: 'pet_name ASC',
    );
    
    return maps.map((map) => Pet.fromMap(map)).toList();
  }

  @override
  Future<List<Pet>> getByVaccinationStatus(bool isVaccinated) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'pets',
      where: 'is_vaccinated = ?',
      whereArgs: [isVaccinated ? 1 : 0],
      orderBy: 'pet_name ASC',
    );
    
    return maps.map((map) => Pet.fromMap(map)).toList();
  }

  @override
  Future<List<Pet>> searchPets(String query, {int? barangayId}) async {
    final db = await _databaseHelper.database;
    
    List<Map<String, dynamic>> maps;
    
    if (barangayId != null) {
      // Join with residents table to filter by barangay_id
      maps = await db.rawQuery('''
        SELECT p.* FROM pets p
        INNER JOIN residents r ON p.owner_id = r.id
        WHERE r.barangay_id = ?
        AND (p.pet_name LIKE ? OR p.species LIKE ? OR p.breed LIKE ? OR p.color LIKE ?)
        ORDER BY p.pet_name ASC
      ''', [barangayId, '%$query%', '%$query%', '%$query%', '%$query%']);
    } else {
      maps = await db.query(
        'pets',
        where: 'pet_name LIKE ? OR species LIKE ? OR breed LIKE ? OR color LIKE ?',
        whereArgs: ['%$query%', '%$query%', '%$query%', '%$query%'],
        orderBy: 'pet_name ASC',
      );
    }
    
    return maps.map((map) => Pet.fromMap(map)).toList();
  }

  @override
  Future<Pet> update(Pet pet) async {
    final db = await _databaseHelper.database;
    
    final updatedPet = pet.copyWith(
      updatedAt: DateTime.now().toIso8601String(),
    );
    
    final result = await db.update(
      'pets',
      updatedPet.toMap(),
      where: 'id = ?',
      whereArgs: [pet.id],
    );
    
    if (result > 0) {
      return updatedPet;
    } else {
      throw Exception('Failed to update pet');
    }
  }

  @override
  Future<void> delete(int id) async {
    final db = await _databaseHelper.database;
    
    final result = await db.delete(
      'pets',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (result == 0) {
      throw Exception('Failed to delete pet');
    }
  }

  @override
  Future<void> deleteByOwner(String ownerId) async {
    final db = await _databaseHelper.database;
    
    await db.delete(
      'pets',
      where: 'owner_id = ?',
      whereArgs: [ownerId],
    );
  }

  @override
  Future<List<String>> getAllSpecies() async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.rawQuery(
      'SELECT DISTINCT species FROM pets ORDER BY species ASC',
    );
    
    return maps.map((map) => map['species'] as String).toList();
  }

  @override
  Future<List<String>> getBreedsBySpecies(String species) async {
    final db = await _databaseHelper.database;
    
    final List<Map<String, dynamic>> maps = await db.query(
      'pets',
      columns: ['breed'],
      where: 'species = ?',
      whereArgs: [species],
      distinct: true,
      orderBy: 'breed ASC',
    );
    
    return maps.map((map) => map['breed'] as String).toList();
  }

  @override
  Future<Map<String, int>> getStatistics() async {
    final db = await _databaseHelper.database;
    
    // Total pets count
    final totalResult = await db.rawQuery('SELECT COUNT(*) as count FROM pets');
    final total = Sqflite.firstIntValue(totalResult) ?? 0;
    
    // Vaccinated pets count
    final vaccinatedResult = await db.rawQuery('SELECT COUNT(*) as count FROM pets WHERE is_vaccinated = 1');
    final vaccinated = Sqflite.firstIntValue(vaccinatedResult) ?? 0;
    
    // Pets by species
    final speciesResult = await db.rawQuery('''
      SELECT species, COUNT(*) as count 
      FROM pets 
      GROUP BY species 
      ORDER BY count DESC
    ''');
    
    final speciesMap = <String, int>{};
    for (final row in speciesResult) {
      speciesMap[row['species'] as String] = row['count'] as int;
    }
    
    return {
      'total': total,
      'vaccinated': vaccinated,
      'not_vaccinated': total - vaccinated,
      ...speciesMap,
    };
  }

  @override
  Future<bool> updateServerId(int id, int serverId) async {
    final db = await _databaseHelper.database;
    
    try {
      final result = await db.update(
        'pets',
        {
          'server_id': serverId,  // Use server_id column
          'sync_status': 'synced',  // ✅ Mark as synced
          'updated_at': DateTime.now().toIso8601String(),
        },
        where: 'id = ?',  // ✅ Use id column (primary key)
        whereArgs: [id],
      );
      
      print('✅ Updated pet $id with server_id $serverId, rows affected: $result');
      return result > 0;
    } catch (e) {
      print('❌ Error updating server ID for pet: $e');
      return false;
    }
  }

  @override
  Future<bool> updateSyncStatus(int id, String status) async {
    final db = await _databaseHelper.database;
    
    try {
      final result = await db.update(
        'pets',
        {
          'sync_status': status,
          'updated_at': DateTime.now().toIso8601String(),
        },
        where: 'id = ?',
        whereArgs: [id],
      );
      
      return result > 0;
    } catch (e) {
      print('Error updating sync status for pet: $e');
      return false;
    }
  }

  @override
  Future<List<Pet>> getPendingSync() async {
    final db = await _databaseHelper.database;
    
    try {
      final results = await db.query(
        'pets',
        where: 'sync_status = ?',
        whereArgs: ['pending'],
        orderBy: 'created_at ASC',
      );
      
      return results.map((pet) => Pet.fromMap(pet)).toList();
    } catch (e) {
      print('Error getting pending pets: $e');
      return [];
    }
  }
}
