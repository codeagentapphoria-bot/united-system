import '../../data/models/household.dart';
import '../../data/models/family.dart';
import '../../data/models/family_member.dart';

abstract class HouseholdRepository {
  // CRUD operations
  Future<Household> create(Household household);
  Future<Household?> getById(int id);
  Future<Household?> getByLocalId(int localId);
  Future<List<Household>> getAll({int? barangayId});
  Future<List<Household>> getByBarangay(int barangayId);
  Future<List<Household>> getByPurok(int purokId);
  Future<Household> update(Household household);
  Future<bool> delete(int id);
  
  // Search and filtering
  Future<List<Household>> searchByAddress(String query, {int? barangayId});
  Future<List<Household>> getByHousingType(String housingType);
  Future<List<Household>> getByElectricity(bool hasElectricity);
  
  // Family operations
  Future<Family> createFamily(Family family);
  Future<Family> updateFamily(int familyId, String newFamilyHead, List<String> familyMemberIds);
  Future<List<Family>> getFamiliesByHousehold(int householdId);
  Future<FamilyMember> addFamilyMember(FamilyMember member);
  Future<List<FamilyMember>> getFamilyMembers(int familyId);
  Future<bool> removeFamilyMember(int memberId);
  Future<bool> removeFamily(int familyId);
  
  // Sync operations
  Future<List<Household>> getPendingSync();
  Future<bool> updateSyncStatus(int id, String status);
  Future<bool> updateServerId(int localId, int serverId);
  
  // Statistics
  Future<int> getCount();
  Future<int> getCountByBarangay(int barangayId);
  Future<int> getCountByPurok(int purokId);
  Future<double> getAverageIncomeByBarangay(int barangayId);
  
  // Resident household check
  Future<Map<String, dynamic>?> checkResidentHousehold(String residentId);
  
  // Family group management
  Future<int> getNextFamilyGroupNumber(int householdId);
  Future<Household> createHouseholdWithFamily(Household household, List<String> familyMemberIds);
  Future<Family> createAdditionalFamily(int householdId, String familyHeadId, List<String> familyMemberIds);
}
