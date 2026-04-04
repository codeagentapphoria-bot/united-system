class Pet {
  final int? id;
  final String ownerId;
  final String petName;
  final String species;
  final String breed;
  final String sex;
  final String birthdate;
  final String color;
  final String? picturePath;
  final String? description;
  final bool isVaccinated;
  final String? vaccinationDate;
  final String syncStatus;
  final int? serverId;
  final String? createdAt;
  final String? updatedAt;

  Pet({
    this.id,
    required this.ownerId,
    required this.petName,
    required this.species,
    required this.breed,
    required this.sex,
    required this.birthdate,
    required this.color,
    this.picturePath,
    this.description,
    this.isVaccinated = false,
    this.vaccinationDate,
    this.syncStatus = 'pending',
    this.serverId,
    this.createdAt,
    this.updatedAt,
  });

  // Get pet age in years
  int get age {
    try {
      final birth = DateTime.parse(birthdate);
      final now = DateTime.now();
      int age = now.year - birth.year;
      if (now.month < birth.month || (now.month == birth.month && now.day < birth.day)) {
        age--;
      }
      return age;
    } catch (e) {
      return 0;
    }
  }

  // Get formatted age string
  String get ageString {
    final years = age;
    if (years == 0) {
      return 'Less than 1 year';
    } else if (years == 1) {
      return '1 year old';
    } else {
      return '$years years old';
    }
  }

  // Get vaccination status string
  String get vaccinationStatus {
    if (isVaccinated && vaccinationDate != null) {
      return 'Vaccinated (${vaccinationDate})';
    } else if (isVaccinated) {
      return 'Vaccinated';
    } else {
      return 'Not vaccinated';
    }
  }

  // Convert to Map for database storage
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'owner_id': ownerId,
      'pet_name': petName,
      'species': species,
      'breed': breed,
      'sex': sex,
      'birthdate': birthdate,
      'color': color,
      'picture_path': picturePath,
      'description': description,
      'is_vaccinated': isVaccinated ? 1 : 0,
      'vaccination_date': vaccinationDate,
      'sync_status': syncStatus,
      'server_id': serverId,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  // Create from Map (database result)
  factory Pet.fromMap(Map<String, dynamic> map) {
    return Pet(
      id: map['id'],
      ownerId: map['owner_id'],
      petName: map['pet_name'],
      species: map['species'],
      breed: map['breed'],
      sex: map['sex'],
      birthdate: map['birthdate'],
      color: map['color'],
      picturePath: map['picture_path'],
      description: map['description'],
      isVaccinated: (map['is_vaccinated'] ?? 0) == 1,
      vaccinationDate: map['vaccination_date'],
      syncStatus: map['sync_status'] ?? 'pending',
      serverId: map['server_id'],
      createdAt: map['created_at'],
      updatedAt: map['updated_at'],
    );
  }

  // Create a copy with updated fields
  Pet copyWith({
    int? id,
    String? ownerId,
    String? petName,
    String? species,
    String? breed,
    String? sex,
    String? birthdate,
    String? color,
    String? picturePath,
    String? description,
    bool? isVaccinated,
    String? vaccinationDate,
    String? syncStatus,
    int? serverId,
    String? createdAt,
    String? updatedAt,
  }) {
    return Pet(
      id: id ?? this.id,
      ownerId: ownerId ?? this.ownerId,
      petName: petName ?? this.petName,
      species: species ?? this.species,
      breed: breed ?? this.breed,
      sex: sex ?? this.sex,
      birthdate: birthdate ?? this.birthdate,
      color: color ?? this.color,
      picturePath: picturePath ?? this.picturePath,
      description: description ?? this.description,
      isVaccinated: isVaccinated ?? this.isVaccinated,
      vaccinationDate: vaccinationDate ?? this.vaccinationDate,
      syncStatus: syncStatus ?? this.syncStatus,
      serverId: serverId ?? this.serverId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'Pet(id: $id, ownerId: $ownerId, petName: $petName, species: $species, breed: $breed, sex: $sex, birthdate: $birthdate, color: $color, isVaccinated: $isVaccinated)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Pet && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
