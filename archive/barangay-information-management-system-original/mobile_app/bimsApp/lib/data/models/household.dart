class Household {
  final int? id;
  final int? localId;
  final String? houseNumber;
  final String? street;
  final int purokId;
  final int barangayId;
  final String houseHead;
  final String? housingType;
  final String? structureType;
  final bool electricity;
  final String? waterSource;
  final String? toiletFacility;
  final double? latitude;
  final double? longitude;
  final double? area;
  final String? householdImagePath;
  final String syncStatus;
  final int? serverId;
  final String? createdAt;
  final String? updatedAt;

  Household({
    this.id,
    this.localId,
    this.houseNumber,
    this.street,
    required this.purokId,
    required this.barangayId,
    required this.houseHead,
    this.housingType,
    this.structureType,
    this.electricity = false,
    this.waterSource,
    this.toiletFacility,
    this.latitude,
    this.longitude,
    this.area,
    this.householdImagePath,
    this.syncStatus = 'pending',
    this.serverId,
    this.createdAt,
    this.updatedAt,
  });

  // Create from JSON
  factory Household.fromJson(Map<String, dynamic> json) {
    return Household(
      id: json['id'],
      localId: json['local_id'],
      houseNumber: json['house_number'],
      street: json['street'],
      purokId: json['purok_id'],
      barangayId: json['barangay_id'],
      houseHead: json['house_head'],
      housingType: json['housing_type'],
      structureType: json['structure_type'],
      electricity: json['electricity'] == 1,
      waterSource: json['water_source'],
      toiletFacility: json['toilet_facility'],
      latitude: json['latitude']?.toDouble(),
      longitude: json['longitude']?.toDouble(),
      area: json['area']?.toDouble(),
      householdImagePath: json['household_image_path'],
      syncStatus: json['sync_status'] ?? 'pending',
      serverId: json['server_id'],
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
    );
  }

  // Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'local_id': localId,
      'house_number': houseNumber,
      'street': street,
      'purok_id': purokId,
      'barangay_id': barangayId,
      'house_head': houseHead,
      'housing_type': housingType,
      'structure_type': structureType,
      'electricity': electricity ? 1 : 0,
      'water_source': waterSource,
      'toilet_facility': toiletFacility,
      'latitude': latitude,
      'longitude': longitude,
      'area': area,
      'household_image_path': householdImagePath,
      'sync_status': syncStatus,
      'server_id': serverId,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  // Convert to JSON for API (without local fields)
  Map<String, dynamic> toApiJson() {
    return {
      'id': serverId ?? id,
      'house_number': houseNumber,
      'street': street,
      'purok_id': purokId,
      'barangay_id': barangayId,
      'house_head': houseHead,
      'housing_type': housingType,
      'structure_type': structureType,
      'electricity': electricity,
      'water_source': waterSource,
      'toilet_facility': toiletFacility,
      'latitude': latitude,
      'longitude': longitude,
      'area': area,
      'household_image_path': householdImagePath,
    };
  }

  // Create a copy with updated fields
  Household copyWith({
    int? id,
    int? localId,
    String? houseNumber,
    String? street,
    int? purokId,
    int? barangayId,
    String? houseHead,
    String? housingType,
    String? structureType,
    bool? electricity,
    String? waterSource,
    String? toiletFacility,
    double? latitude,
    double? longitude,
    double? area,
    String? householdImagePath,
    String? syncStatus,
    int? serverId,
    String? createdAt,
    String? updatedAt,
  }) {
    return Household(
      id: id ?? this.id,
      localId: localId ?? this.localId,
      houseNumber: houseNumber ?? this.houseNumber,
      street: street ?? this.street,
      purokId: purokId ?? this.purokId,
      barangayId: barangayId ?? this.barangayId,
      houseHead: houseHead ?? this.houseHead,
      housingType: housingType ?? this.housingType,
      structureType: structureType ?? this.structureType,
      electricity: electricity ?? this.electricity,
      waterSource: waterSource ?? this.waterSource,
      toiletFacility: toiletFacility ?? this.toiletFacility,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      area: area ?? this.area,
      householdImagePath: householdImagePath ?? this.householdImagePath,
      syncStatus: syncStatus ?? this.syncStatus,
      serverId: serverId ?? this.serverId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  // Validation methods
  bool isValid() {
    return houseHead.isNotEmpty &&
           purokId > 0 &&
           barangayId > 0 &&
           _isValidCoordinates();
  }

  List<String> getValidationErrors() {
    List<String> errors = [];
    
    if (houseHead.isEmpty) errors.add('House head is required');
    if (purokId <= 0) errors.add('Purok is required');
    if (barangayId <= 0) errors.add('Barangay is required');
    if (!_isValidCoordinates()) errors.add('Invalid coordinates');
    
    return errors;
  }

  bool _isValidCoordinates() {
    if (latitude == null && longitude == null) return true; // Optional
    if (latitude != null && longitude != null) {
      return latitude! >= -90 && latitude! <= 90 &&
             longitude! >= -180 && longitude! <= 180;
    }
    return false; // One coordinate missing
  }

  // Get full address
  String get fullAddress {
    List<String> addressParts = [];
    
    if (houseNumber != null && houseNumber!.isNotEmpty) {
      addressParts.add('House #$houseNumber');
    }
    
    if (street != null && street!.isNotEmpty) {
      addressParts.add(street!);
    }
    
    // Note: Purok and Barangay names would need to be fetched from database
    addressParts.add('Purok $purokId');
    addressParts.add('Barangay $barangayId');
    
    return addressParts.join(', ');
  }

  // Check if location is set
  bool get hasLocation => latitude != null && longitude != null;

  @override
  String toString() {
    return 'Household(id: $id, address: $fullAddress, syncStatus: $syncStatus)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Household && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
