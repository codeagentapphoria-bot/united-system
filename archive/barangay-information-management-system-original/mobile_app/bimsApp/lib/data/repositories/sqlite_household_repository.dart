import 'package:sqflite/sqflite.dart';
import '../../data/database/database_helper.dart';
import '../../data/models/household.dart';
import '../../data/models/family.dart';
import '../../data/models/family_member.dart';
import '../../domain/repositories/household_repository.dart';

class SQLiteHouseholdRepository implements HouseholdRepository {
  final DatabaseHelper _databaseHelper = DatabaseHelper.instance;

  @override
  Future<Household> create(Household household) async {
    final db = await _databaseHelper.database;
    
    // Generate local ID if not provided
    final localId = household.localId ?? DateTime.now().millisecondsSinceEpoch;
    
    final householdData = household.toJson();
    householdData['local_id'] = localId;
    householdData['created_at'] = DateTime.now().toIso8601String();
    householdData['updated_at'] = DateTime.now().toIso8601String();
    
    final id = await db.insert('households', householdData);
    
    return household.copyWith(
      id: id,
      localId: localId,
      createdAt: householdData['created_at'],
      updatedAt: householdData['updated_at'],
    );
  }

  @override
  Future<Household?> getById(int id) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'households',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    if (result.isEmpty) return null;
    return Household.fromJson(result.first);
  }

  @override
  Future<Household?> getByLocalId(int localId) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'households',
      where: 'local_id = ?',
      whereArgs: [localId],
    );
    
    if (result.isEmpty) return null;
    return Household.fromJson(result.first);
  }

  @override
  Future<List<Household>> getAll({int? barangayId}) async {
    final db = await _databaseHelper.database;
    
    // CRITICAL: Check household data integrity before querying
    await _checkHouseholdDataIntegrity(db);
    
    final result = await db.query(
      'households',
      where: barangayId != null ? 'barangay_id = ?' : null,
      whereArgs: barangayId != null ? [barangayId] : null,
      orderBy: 'created_at DESC',
    );
    
    
    return result.map((json) => Household.fromJson(json)).toList();
  }

  @override
  Future<List<Household>> getByBarangay(int barangayId) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'households',
      where: 'barangay_id = ?',
      whereArgs: [barangayId],
      orderBy: 'created_at DESC',
    );
    
    return result.map((json) => Household.fromJson(json)).toList();
  }

  @override
  Future<List<Household>> getByPurok(int purokId) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'households',
      where: 'purok_id = ?',
      whereArgs: [purokId],
      orderBy: 'created_at DESC',
    );
    
    return result.map((json) => Household.fromJson(json)).toList();
  }

  @override
  Future<Household> update(Household household) async {
    final db = await _databaseHelper.database;
    
    final householdData = household.toJson();
    householdData['updated_at'] = DateTime.now().toIso8601String();
    
    await db.update(
      'households',
      householdData,
      where: 'id = ?',
      whereArgs: [household.id],
    );
    
    return household.copyWith(updatedAt: householdData['updated_at']);
  }

  @override
  Future<bool> delete(int id) async {
    final db = await _databaseHelper.database;
    final result = await db.delete(
      'households',
      where: 'id = ?',
      whereArgs: [id],
    );
    
    return result > 0;
  }

  @override
  Future<List<Household>> searchByAddress(String query, {int? barangayId}) async {
    final db = await _databaseHelper.database;
    
    String whereClause = 'house_number LIKE ? OR street LIKE ?';
    List<dynamic> whereArgs = ['%$query%', '%$query%'];
    
    if (barangayId != null) {
      whereClause = '($whereClause) AND barangay_id = ?';
      whereArgs.add(barangayId);
    }
    
    final result = await db.query(
      'households',
      where: whereClause,
      whereArgs: whereArgs,
      orderBy: 'created_at DESC',
    );
    
    return result.map((json) => Household.fromJson(json)).toList();
  }

  @override
  Future<List<Household>> getByHousingType(String housingType) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'households',
      where: 'housing_type = ?',
      whereArgs: [housingType],
      orderBy: 'created_at DESC',
    );
    
    return result.map((json) => Household.fromJson(json)).toList();
  }

  @override
  Future<List<Household>> getByElectricity(bool hasElectricity) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'households',
      where: 'electricity = ?',
      whereArgs: [hasElectricity ? 1 : 0],
      orderBy: 'created_at DESC',
    );
    
    return result.map((json) => Household.fromJson(json)).toList();
  }

  @override
  Future<Family> createFamily(Family family) async {
    final db = await _databaseHelper.database;
    
    final familyData = family.toJson();
    familyData['created_at'] = DateTime.now().toIso8601String();
    familyData['updated_at'] = DateTime.now().toIso8601String();
    
    final id = await db.insert('families', familyData);
    
    return family.copyWith(
      id: id,
      createdAt: familyData['created_at'],
      updatedAt: familyData['updated_at'],
    );
  }


  @override
  Future<Family> updateFamily(int familyId, String newFamilyHead, List<String> familyMemberIds) async {
    final db = await _databaseHelper.database;
    
    try {
      Family? updatedFamily;
      
      await db.transaction((txn) async {
        // Get family data to check if this is Family #1
        final familyData = await txn.query(
          'families',
          where: 'id = ?',
          whereArgs: [familyId],
        );
        
        if (familyData.isEmpty) {
          throw Exception('Family not found');
        }
        
        final family = familyData.first;
        final householdId = family['household_id'] as int;
        final familyGroup = family['family_group'] as String;
        final isFirstFamily = familyGroup == 'Family #1';
        
        // Update family head
        await txn.update(
          'families',
          {
            'family_head': newFamilyHead,
            'updated_at': DateTime.now().toIso8601String(),
          },
          where: 'id = ?',
          whereArgs: [familyId],
        );
        
        // If this is Family #1, update the household's house_head as well
        if (isFirstFamily) {
          await txn.update(
            'households',
            {
              'house_head': newFamilyHead,
              'updated_at': DateTime.now().toIso8601String(),
            },
            where: 'id = ?',
            whereArgs: [householdId],
          );
          
          print('Debug: Updated household house_head to: $newFamilyHead');
        }
        
        // Remove all existing family members
        await txn.delete(
          'family_members',
          where: 'family_id = ?',
          whereArgs: [familyId],
        );
        
        // Add new family members
        for (final memberId in familyMemberIds) {
          final memberData = {
            'family_id': familyId,
            'family_member': memberId,
            'relationship_to_head': memberId == newFamilyHead ? 'Self' : null,
            'sync_status': 'pending',
            'created_at': DateTime.now().toIso8601String(),
            'updated_at': DateTime.now().toIso8601String(),
          };
          
          await txn.insert('family_members', memberData);
        }
        
        // Get the updated family data
        final updatedFamilyData = await txn.query(
          'families',
          where: 'id = ?',
          whereArgs: [familyId],
        );
        
        if (updatedFamilyData.isNotEmpty) {
          updatedFamily = Family.fromJson(updatedFamilyData.first);
        }
      });
      
      if (updatedFamily == null) {
        throw Exception('Failed to update family');
      }
      
      return updatedFamily!;
    } catch (e) {
      throw Exception('Failed to update family: $e');
    }
  }

  @override
  Future<List<Family>> getFamiliesByHousehold(int householdId) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'families',
      where: 'household_id = ?',
      whereArgs: [householdId],
      orderBy: 'created_at DESC',
    );
    
    print('Debug: Loading families for household $householdId: $result');
    
    final families = result.map((json) => Family.fromJson(json)).toList();
    
    print('Debug: Parsed families: ${families.map((f) => f.familyGroup).toList()}');
    
    return families;
  }

  @override
  Future<FamilyMember> addFamilyMember(FamilyMember member) async {
    final db = await _databaseHelper.database;
    
    final memberData = member.toJson();
    memberData['created_at'] = DateTime.now().toIso8601String();
    memberData['updated_at'] = DateTime.now().toIso8601String();
    
    final id = await db.insert('family_members', memberData);
    
    return member.copyWith(
      id: id,
      createdAt: memberData['created_at'],
      updatedAt: memberData['updated_at'],
    );
  }

  @override
  Future<List<FamilyMember>> getFamilyMembers(int familyId) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'family_members',
      where: 'family_id = ?',
      whereArgs: [familyId],
      orderBy: 'created_at DESC',
    );
    
    return result.map((json) => FamilyMember.fromJson(json)).toList();
  }

  @override
  Future<bool> removeFamilyMember(int memberId) async {
    final db = await _databaseHelper.database;
    final result = await db.delete(
      'family_members',
      where: 'id = ?',
      whereArgs: [memberId],
    );
    
    return result > 0;
  }

  @override
  Future<bool> removeFamily(int familyId) async {
    final db = await _databaseHelper.database;
    final result = await db.delete(
      'families',
      where: 'id = ?',
      whereArgs: [familyId],
    );
    
    return result > 0;
  }

  @override
  Future<List<Household>> getPendingSync() async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'households',
      where: 'sync_status = ?',
      whereArgs: ['pending'],
      orderBy: 'created_at ASC',
    );
    
    return result.map((json) => Household.fromJson(json)).toList();
  }

  @override
  Future<bool> updateSyncStatus(int id, String status) async {
    final db = await _databaseHelper.database;
    final result = await db.update(
      'households',
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
  Future<bool> updateServerId(int id, int serverId) async {
    final db = await _databaseHelper.database;
    final result = await db.update(
      'households',
      {
        'server_id': serverId,
        'sync_status': 'synced',
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',  // ✅ Use id column (primary key)
      whereArgs: [id],
    );
    
    print('✅ Updated household $id with server_id $serverId, rows affected: $result');
    return result > 0;
  }

  @override
  Future<int> getCount() async {
    final db = await _databaseHelper.database;
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM households');
    return result.first['count'] as int;
  }

  @override
  Future<int> getCountByBarangay(int barangayId) async {
    final db = await _databaseHelper.database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM households WHERE barangay_id = ?',
      [barangayId],
    );
    return result.first['count'] as int;
  }

  @override
  Future<int> getCountByPurok(int purokId) async {
    final db = await _databaseHelper.database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM households WHERE purok_id = ?',
      [purokId],
    );
    return result.first['count'] as int;
  }

  @override
  Future<double> getAverageIncomeByBarangay(int barangayId) async {
    // This would require income data from residents
    // For now, return 0 as placeholder
    return 0.0;
  }

  @override
  Future<Map<String, dynamic>?> checkResidentHousehold(String residentId) async {
    final db = await _databaseHelper.database;
    
    // Check if resident is a house head
    final houseHeadResult = await db.query(
      'households',
      where: 'house_head = ?',
      whereArgs: [residentId],
    );
    
    if (houseHeadResult.isNotEmpty) {
      return {
        'type': 'house_head',
        'household_id': houseHeadResult.first['id'],
        'house_number': houseHeadResult.first['house_number'],
        'street': houseHeadResult.first['street'],
      };
    }
    
    // Check if resident is a family member
    final familyMemberResult = await db.rawQuery('''
      SELECT h.id, h.house_number, h.street, f.family_group
      FROM households h
      JOIN families f ON h.id = f.household_id
      JOIN family_members fm ON f.id = fm.family_id
      WHERE fm.family_member = ?
    ''', [residentId]);
    
    if (familyMemberResult.isNotEmpty) {
      return {
        'type': 'family_member',
        'household_id': familyMemberResult.first['id'],
        'house_number': familyMemberResult.first['house_number'],
        'street': familyMemberResult.first['street'],
        'family_group': familyMemberResult.first['family_group'],
      };
    }
    
    return null;
  }

  // Get next family group number for a household
  Future<int> getNextFamilyGroupNumber(int householdId) async {
    final db = await _databaseHelper.database;
    
    // Get the highest family group number for this household
    final result = await db.rawQuery('''
      SELECT MAX(CAST(SUBSTR(family_group, 8) AS INTEGER)) as max_group
      FROM families 
      WHERE household_id = ? AND family_group LIKE 'Family #%'
    ''', [householdId]);
    
    final maxGroup = result.first['max_group'] as int?;
    return (maxGroup ?? 0) + 1;
  }

  // Create household with automatic family setup
  Future<Household> createHouseholdWithFamily(Household household, List<String> familyMemberIds) async {
    final db = await _databaseHelper.database;
    
    try {
      Household? createdHousehold;
      
      await db.transaction((txn) async {
        // Generate local ID if not provided
        final localId = household.localId ?? DateTime.now().millisecondsSinceEpoch;
        
        final householdData = household.toJson();
        householdData['local_id'] = localId;
        householdData['created_at'] = DateTime.now().toIso8601String();
        householdData['updated_at'] = DateTime.now().toIso8601String();
        
        // Insert household
        final householdId = await txn.insert('households', householdData);
        
        // Create Family #1 with house head as family head
        final familyData = {
          'household_id': householdId,
          'family_group': 'Family #1',
          'family_head': household.houseHead,
          'sync_status': 'pending',
          'created_at': DateTime.now().toIso8601String(),
          'updated_at': DateTime.now().toIso8601String(),
        };
        
        final familyId = await txn.insert('families', familyData);
        
        // Add house head as family member
        final houseHeadMemberData = {
          'family_id': familyId,
          'family_member': household.houseHead,
          'relationship_to_head': 'self',
          'sync_status': 'pending',
          'created_at': DateTime.now().toIso8601String(),
          'updated_at': DateTime.now().toIso8601String(),
        };
        
        await txn.insert('family_members', houseHeadMemberData);
        
        // Add other family members
        for (final memberId in familyMemberIds) {
          if (memberId != household.houseHead) {
            final memberData = {
              'family_id': familyId,
              'family_member': memberId,
              'relationship_to_head': null, // Can be set later
              'sync_status': 'pending',
              'created_at': DateTime.now().toIso8601String(),
              'updated_at': DateTime.now().toIso8601String(),
            };
            
            await txn.insert('family_members', memberData);
          }
        }
        
        // Create the household object to return
        createdHousehold = household.copyWith(
          id: householdId,
          localId: localId,
          createdAt: householdData['created_at'],
          updatedAt: householdData['updated_at'],
        );
      });
      
      return createdHousehold!;
    } catch (e) {
      throw Exception('Failed to create household with family: $e');
    }
  }


  // Create additional family for existing household
  Future<Family> createAdditionalFamily(int householdId, String familyHeadId, List<String> familyMemberIds) async {
    final db = await _databaseHelper.database;
    
    try {
      Family? createdFamily;
      
      await db.transaction((txn) async {
        // Get next family group number using transaction
        final nextGroupNumber = await _getNextFamilyGroupNumberInTransaction(txn, householdId);
        
        // Debug logging
        print('Debug: Creating family with group number: $nextGroupNumber');
        
        // Create new family
        final familyData = {
          'household_id': householdId,
          'family_group': 'Family #$nextGroupNumber',
          'family_head': familyHeadId,
          'sync_status': 'pending',
          'created_at': DateTime.now().toIso8601String(),
          'updated_at': DateTime.now().toIso8601String(),
        };
        
        print('Debug: Family data to insert: $familyData');
        
        final familyId = await txn.insert('families', familyData);
        
        // Add family head as family member
        final familyHeadMemberData = {
          'family_id': familyId,
          'family_member': familyHeadId,
          'relationship_to_head': 'self',
          'sync_status': 'pending',
          'created_at': DateTime.now().toIso8601String(),
          'updated_at': DateTime.now().toIso8601String(),
        };
        
        await txn.insert('family_members', familyHeadMemberData);
        
        // Add other family members
        for (final memberId in familyMemberIds) {
          if (memberId != familyHeadId) {
            final memberData = {
              'family_id': familyId,
              'family_member': memberId,
              'relationship_to_head': null, // Can be set later
              'sync_status': 'pending',
              'created_at': DateTime.now().toIso8601String(),
              'updated_at': DateTime.now().toIso8601String(),
            };
            
            await txn.insert('family_members', memberData);
          }
        }
        
        // Create the family object to return
        createdFamily = Family(
          id: familyId,
          householdId: householdId,
          familyGroup: 'Family #$nextGroupNumber',
          familyHead: familyHeadId,
          syncStatus: 'pending',
          createdAt: familyData['created_at'] as String?,
          updatedAt: familyData['updated_at'] as String?,
        );
        
        print('Debug: Created family object: ${createdFamily!.familyGroup}');
      });
      
      print('Debug: Returning family: ${createdFamily!.familyGroup}');
      return createdFamily!;
    } catch (e) {
      throw Exception('Failed to create additional family: $e');
    }
  }

  // Helper method to get next family group number within a transaction
  Future<int> _getNextFamilyGroupNumberInTransaction(Transaction txn, int householdId) async {
    // First, get all family groups for this household
    final allFamilies = await txn.rawQuery('''
      SELECT family_group
      FROM families 
      WHERE household_id = ?
      ORDER BY family_group
    ''', [householdId]);
    
    print('Debug: All families for household $householdId: $allFamilies');
    
    // Extract numbers from family_group strings
    int maxGroup = 0;
    for (final family in allFamilies) {
      final familyGroup = family['family_group'] as String?;
      if (familyGroup != null && familyGroup.startsWith('Family #')) {
        final numberStr = familyGroup.substring(8); // Remove 'Family #'
        final number = int.tryParse(numberStr);
        if (number != null && number > maxGroup) {
          maxGroup = number;
        }
      }
    }
    
    final nextGroup = maxGroup + 1;
    
    // Debug logging
    print('Debug: Household ID: $householdId');
    print('Debug: Max group found: $maxGroup');
    print('Debug: Next group number: $nextGroup');
    
    return nextGroup;
  }


  /// Check household data integrity
  Future<void> _checkHouseholdDataIntegrity(Database db) async {
    try {
      // Check if households table exists
      final tableInfo = await db.rawQuery("PRAGMA table_info(households)");
      if (tableInfo.isEmpty) {
        return;
      }
      
      // Check household count
      final householdCount = await db.rawQuery('SELECT COUNT(*) as count FROM households');
      final count = householdCount.first['count'] as int;
      
      if (count == 0) {
        // Check if residents exist (to determine if this is data loss vs fresh database)
        final residentCount = await db.rawQuery('SELECT COUNT(*) as count FROM residents');
        final residentCountValue = residentCount.first['count'] as int;
        
        if (residentCountValue > 0) {
          // Check if there are any orphaned family records
          final familyCount = await db.rawQuery('SELECT COUNT(*) as count FROM families');
          final familyCountValue = familyCount.first['count'] as int;
          
          if (familyCountValue > 0) {
            // Families exist but no households - this is a data integrity issue
            // But we don't auto-recover to prevent restoring intentionally deleted households
          }
        }
      }
      
    } catch (e) {
      // Silently handle errors
    }
  }

}
