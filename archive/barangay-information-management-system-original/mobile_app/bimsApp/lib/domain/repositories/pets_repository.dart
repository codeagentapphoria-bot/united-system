import '../../data/models/pet.dart';

abstract class PetsRepository {
  // CRUD operations
  Future<Pet> create(Pet pet);
  Future<Pet?> getById(int id);
  Future<List<Pet>> getAll({int? barangayId});
  Future<Pet> update(Pet pet);
  Future<void> delete(int id);
  
  // Owner-related operations
  Future<List<Pet>> getByOwner(String ownerId);
  Future<List<Pet>> getPetsByHousehold(String householdId);
  Future<void> deleteByOwner(String ownerId);
  
  // Search and filtering
  Future<List<Pet>> searchPets(String query, {int? barangayId});
  Future<List<Pet>> getBySpecies(String species);
  Future<List<Pet>> getByVaccinationStatus(bool isVaccinated);
  
  // Species and breed operations
  Future<List<String>> getAllSpecies();
  Future<List<String>> getBreedsBySpecies(String species);
  
  // Statistics
  Future<Map<String, int>> getStatistics();
  
  // Sync operations
  Future<bool> updateServerId(int localId, int serverId);
  Future<bool> updateSyncStatus(int id, String status);
  Future<List<Pet>> getPendingSync();
}
