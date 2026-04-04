class Resident {
  final String? id;
  final String? serverResidentId;
  final int? localId;
  final int barangayId;
  final String lastName;
  final String firstName;
  final String? middleName;
  final String? suffix;
  final String sex;
  final String civilStatus;
  final String birthdate;
  final String? birthplace;
  final String? contactNumber;
  final String? email;
  final String? occupation;
  final double? monthlyIncome;
  final String? employmentStatus;
  final String? educationAttainment;
  final String residentStatus;
  final String? picturePath;
  final bool indigenousPerson;
  final String syncStatus;
  final String? serverId;
  final String? createdAt;
  final String? updatedAt;

  Resident({
    this.id,
    this.serverResidentId,
    this.localId,
    required this.barangayId,
    required this.lastName,
    required this.firstName,
    this.middleName,
    this.suffix,
    required this.sex,
    required this.civilStatus,
    required this.birthdate,
    this.birthplace,
    this.contactNumber,
    this.email,
    this.occupation,
    this.monthlyIncome,
    this.employmentStatus,
    this.educationAttainment,
    this.residentStatus = 'active',
    this.picturePath,
    this.indigenousPerson = false,
    this.syncStatus = 'pending',
    this.serverId,
    this.createdAt,
    this.updatedAt,
  });

  // Create from JSON
  factory Resident.fromJson(Map<String, dynamic> json) {
    return Resident(
      id: json['id'],
      serverResidentId: json['server_resident_id'],
      localId: json['local_id'],
      barangayId: json['barangay_id'],
      lastName: json['last_name'],
      firstName: json['first_name'],
      middleName: json['middle_name'],
      suffix: json['suffix'],
      sex: json['sex'],
      civilStatus: json['civil_status'],
      birthdate: json['birthdate'],
      birthplace: json['birthplace'],
      contactNumber: json['contact_number'],
      email: json['email'],
      occupation: json['occupation'],
      monthlyIncome: json['monthly_income']?.toDouble(),
      employmentStatus: json['employment_status'],
      educationAttainment: json['education_attainment'],
      residentStatus: json['resident_status'] ?? 'active',
      picturePath: json['picture_path'],
      indigenousPerson: json['indigenous_person'] == 1 || json['indigenous_person'] == true || json['indigenous_person'] == '1',
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
      'server_resident_id': serverResidentId,
      'local_id': localId,
      'barangay_id': barangayId,
      'last_name': lastName,
      'first_name': firstName,
      'middle_name': middleName,
      'suffix': suffix,
      'sex': sex,
      'civil_status': civilStatus,
      'birthdate': birthdate,
      'birthplace': birthplace,
      'contact_number': contactNumber,
      'email': email,
      'occupation': occupation,
      'monthly_income': monthlyIncome,
      'employment_status': employmentStatus,
      'education_attainment': educationAttainment,
      'resident_status': residentStatus,
      'picture_path': picturePath,
      'indigenous_person': indigenousPerson ? 1 : 0,
      'sync_status': syncStatus,
      'server_id': serverId,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  // Convert to JSON for API (without local fields)
  Map<String, dynamic> toApiJson() {
    return {
      'id': serverResidentId ?? serverId ?? id,
      'barangay_id': barangayId,
      'last_name': lastName,
      'first_name': firstName,
      'middle_name': middleName,
      'suffix': suffix,
      'sex': sex,
      'civil_status': civilStatus,
      'birthdate': birthdate,
      'birthplace': birthplace,
      'contact_number': contactNumber,
      'email': email,
      'occupation': occupation,
      'monthly_income': monthlyIncome,
      'employment_status': employmentStatus,
      'education_attainment': educationAttainment,
      'resident_status': residentStatus,
      'picture_path': picturePath,
      'indigenous_person': indigenousPerson ? 1 : 0,
    };
  }

  // Create a copy with updated fields
  Resident copyWith({
    String? id,
    String? serverResidentId,
    int? localId,
    int? barangayId,
    String? lastName,
    String? firstName,
    String? middleName,
    String? suffix,
    String? sex,
    String? civilStatus,
    String? birthdate,
    String? birthplace,
    String? contactNumber,
    String? email,
    String? occupation,
    double? monthlyIncome,
    String? employmentStatus,
    String? educationAttainment,
    String? residentStatus,
    String? picturePath,
    bool? indigenousPerson,
    String? syncStatus,
    String? serverId,
    String? createdAt,
    String? updatedAt,
  }) {
    return Resident(
      id: id ?? this.id,
      serverResidentId: serverResidentId ?? this.serverResidentId,
      localId: localId ?? this.localId,
      barangayId: barangayId ?? this.barangayId,
      lastName: lastName ?? this.lastName,
      firstName: firstName ?? this.firstName,
      middleName: middleName ?? this.middleName,
      suffix: suffix ?? this.suffix,
      sex: sex ?? this.sex,
      civilStatus: civilStatus ?? this.civilStatus,
      birthdate: birthdate ?? this.birthdate,
      birthplace: birthplace ?? this.birthplace,
      contactNumber: contactNumber ?? this.contactNumber,
      email: email ?? this.email,
      occupation: occupation ?? this.occupation,
      monthlyIncome: monthlyIncome ?? this.monthlyIncome,
      employmentStatus: employmentStatus ?? this.employmentStatus,
      educationAttainment: educationAttainment ?? this.educationAttainment,
      residentStatus: residentStatus ?? this.residentStatus,
      picturePath: picturePath ?? this.picturePath,
      indigenousPerson: indigenousPerson ?? this.indigenousPerson,
      syncStatus: syncStatus ?? this.syncStatus,
      serverId: serverId ?? this.serverId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  // Validation methods
  bool isValid() {
    return lastName.isNotEmpty &&
           firstName.isNotEmpty &&
           _isValidSex(sex) &&
           _isValidCivilStatus(civilStatus) &&
           _isValidBirthdate(birthdate) &&
           (email == null || _isValidEmail(email!)) &&
           (contactNumber == null || _isValidContactNumber(contactNumber!));
  }

  List<String> getValidationErrors() {
    List<String> errors = [];
    
    if (lastName.isEmpty) errors.add('Last name is required');
    if (firstName.isEmpty) errors.add('First name is required');
    if (!_isValidSex(sex)) errors.add('Invalid sex value');
    if (!_isValidCivilStatus(civilStatus)) errors.add('Invalid civil status');
    if (!_isValidBirthdate(birthdate)) errors.add('Invalid birthdate');
    if (email != null && !_isValidEmail(email!)) errors.add('Invalid email format');
    if (contactNumber != null && !_isValidContactNumber(contactNumber!)) errors.add('Invalid contact number format');
    
    return errors;
  }

  bool _isValidSex(String sex) {
    return ['male', 'female'].contains(sex.toLowerCase());
  }

  bool _isValidCivilStatus(String status) {
    return ['single', 'married', 'widowed', 'separated', 'divorced', 'live_in'].contains(status.toLowerCase());
  }

  bool _isValidBirthdate(String birthdate) {
    try {
      DateTime.parse(birthdate);
      return true;
    } catch (e) {
      return false;
    }
  }

  bool _isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  bool _isValidContactNumber(String contactNumber) {
    return RegExp(r'^\+?[\d\s\-\(\)]+$').hasMatch(contactNumber);
  }

  // Get full name
  String get fullName {
    List<String> nameParts = [firstName];
    if (middleName != null && middleName!.isNotEmpty) {
      nameParts.add(middleName!);
    }
    nameParts.add(lastName);
    if (suffix != null && suffix!.isNotEmpty) {
      nameParts.add(suffix!);
    }
    return nameParts.join(' ');
  }

  // Get age
  int get age {
    try {
      DateTime birth = DateTime.parse(birthdate);
      DateTime now = DateTime.now();
      int age = now.year - birth.year;
      if (now.month < birth.month || (now.month == birth.month && now.day < birth.day)) {
        age--;
      }
      return age;
    } catch (e) {
      return 0;
    }
  }

  @override
  String toString() {
    return 'Resident(id: $id, name: $fullName, barangayId: $barangayId, syncStatus: $syncStatus)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Resident && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
