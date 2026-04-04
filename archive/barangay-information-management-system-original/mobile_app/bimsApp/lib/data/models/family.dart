class Family {
  final int? id;
  final int householdId;
  final String familyGroup;
  final String familyHead;
  final String syncStatus;
  final String? createdAt;
  final String? updatedAt;

  Family({
    this.id,
    required this.householdId,
    required this.familyGroup,
    required this.familyHead,
    this.syncStatus = 'pending',
    this.createdAt,
    this.updatedAt,
  });

  // Create from JSON
  factory Family.fromJson(Map<String, dynamic> json) {
    return Family(
      id: json['id'],
      householdId: json['household_id'],
      familyGroup: json['family_group'],
      familyHead: json['family_head'],
      syncStatus: json['sync_status'] ?? 'pending',
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
    );
  }

  // Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'household_id': householdId,
      'family_group': familyGroup,
      'family_head': familyHead,
      'sync_status': syncStatus,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  // Convert to JSON for API
  Map<String, dynamic> toApiJson() {
    return {
      'id': id,
      'household_id': householdId,
      'family_group': familyGroup,
      'family_head': familyHead,
    };
  }

  // Create a copy with updated fields
  Family copyWith({
    int? id,
    int? householdId,
    String? familyGroup,
    String? familyHead,
    String? syncStatus,
    String? createdAt,
    String? updatedAt,
  }) {
    return Family(
      id: id ?? this.id,
      householdId: householdId ?? this.householdId,
      familyGroup: familyGroup ?? this.familyGroup,
      familyHead: familyHead ?? this.familyHead,
      syncStatus: syncStatus ?? this.syncStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  // Validation methods
  bool isValid() {
    return householdId > 0 &&
           familyGroup.isNotEmpty &&
           familyHead.isNotEmpty;
  }

  List<String> getValidationErrors() {
    List<String> errors = [];
    
    if (householdId <= 0) errors.add('Household ID is required');
    if (familyGroup.isEmpty) errors.add('Family group is required');
    if (familyHead.isEmpty) errors.add('Family head is required');
    
    return errors;
  }

  @override
  String toString() {
    return 'Family(id: $id, group: $familyGroup, head: $familyHead, syncStatus: $syncStatus)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Family && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
