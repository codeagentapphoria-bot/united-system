class FamilyMember {
  final int? id;
  final int familyId;
  final String familyMember;
  final String? relationshipToHead;
  final String syncStatus;
  final String? createdAt;
  final String? updatedAt;

  FamilyMember({
    this.id,
    required this.familyId,
    required this.familyMember,
    this.relationshipToHead,
    this.syncStatus = 'pending',
    this.createdAt,
    this.updatedAt,
  });

  // Create from JSON
  factory FamilyMember.fromJson(Map<String, dynamic> json) {
    return FamilyMember(
      id: json['id'],
      familyId: json['family_id'],
      familyMember: json['family_member'],
      relationshipToHead: json['relationship_to_head'],
      syncStatus: json['sync_status'] ?? 'pending',
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
    );
  }

  // Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_id': familyId,
      'family_member': familyMember,
      'relationship_to_head': relationshipToHead,
      'sync_status': syncStatus,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  // Convert to JSON for API
  Map<String, dynamic> toApiJson() {
    return {
      'id': id,
      'family_id': familyId,
      'family_member': familyMember,
      'relationship_to_head': relationshipToHead,
    };
  }

  // Create a copy with updated fields
  FamilyMember copyWith({
    int? id,
    int? familyId,
    String? familyMember,
    String? relationshipToHead,
    String? syncStatus,
    String? createdAt,
    String? updatedAt,
  }) {
    return FamilyMember(
      id: id ?? this.id,
      familyId: familyId ?? this.familyId,
      familyMember: familyMember ?? this.familyMember,
      relationshipToHead: relationshipToHead ?? this.relationshipToHead,
      syncStatus: syncStatus ?? this.syncStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  // Validation methods
  bool isValid() {
    return familyId > 0 && familyMember.isNotEmpty;
  }

  List<String> getValidationErrors() {
    List<String> errors = [];
    
    if (familyId <= 0) errors.add('Family ID is required');
    if (familyMember.isEmpty) errors.add('Family member is required');
    
    return errors;
  }

  @override
  String toString() {
    return 'FamilyMember(id: $id, member: $familyMember, relationship: $relationshipToHead, syncStatus: $syncStatus)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is FamilyMember && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
