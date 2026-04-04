import '../../data/models/resident.dart';

abstract class ResidentRepository {
  // CRUD operations
  Future<Resident> create(Resident resident);
  Future<Resident?> getById(String id);
  Future<Resident?> getByLocalId(int localId);
  Future<List<Resident>> getAll({int? barangayId});
  Future<List<Resident>> getByBarangay(int barangayId);
  Future<Resident> update(Resident resident);
  Future<bool> delete(String id);
  
  // Search and filtering
  Future<List<Resident>> searchByName(String query, {int? barangayId});
  Future<List<Resident>> getByStatus(String status);
  Future<List<Resident>> getByClassification(String classificationType);
  Future<List<Resident>> getPaginated({
    int limit = 20,
    int offset = 0,
    String? searchQuery,
    String? statusFilter,
    String? syncStatusFilter,
    int? barangayId,
  });
  
  // Sync operations
  Future<List<Resident>> getPendingSync();
  Future<bool> updateSyncStatus(String id, String status);
  Future<bool> updateServerId(String localId, String serverId);
  Future<bool> updateServerResidentId(String localId, String serverResidentId);
  
  // Statistics
  Future<int> getCount();
  Future<int> getCountByBarangay(int barangayId);
  Future<int> getCountByStatus(String status);
}
