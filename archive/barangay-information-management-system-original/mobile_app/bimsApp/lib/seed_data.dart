import 'dart:math';
import 'dart:convert';
import 'core/services/database_service.dart';
import 'core/services/offline_auth_manager.dart';
import 'data/models/resident.dart';
import 'data/models/household.dart';
import 'data/models/family.dart';
import 'data/models/family_member.dart';

class DataSeeder {
  static final DatabaseService _databaseService = DatabaseService();
  static final OfflineAuthManager _authManager = OfflineAuthManager();

  // Helper method to generate 500 sample residents
  static List<Resident> _generateSampleResidents(int barangayId) {
    final random = Random();
    final residents = <Resident>[];
    
    // Common Filipino names - Expanded list
    final lastNames = [
      'Dela Cruz', 'Santos', 'Reyes', 'Gonzales', 'Torres', 'Villanueva', 'Cruz', 'Mendoza',
      'Ramos', 'Garcia', 'Lopez', 'Martinez', 'Fernandez', 'Castro', 'Rivera', 'Morales',
      'Gutierrez', 'Ortiz', 'Chavez', 'Jimenez', 'Ruiz', 'Diaz', 'Herrera', 'Moreno',
      'Aguilar', 'Romero', 'Navarro', 'Vargas', 'Silva', 'Mendez', 'Guerrero', 'Flores',
      'Vega', 'Castillo', 'Pena', 'Rios', 'Delgado', 'Cabrera', 'Ortega', 'Molina',
      'Medina', 'Aguirre', 'Cortez', 'Bautista', 'Cruz', 'Domingo', 'Estrada', 'Fuentes',
      'Gomez', 'Hernandez', 'Ibarra', 'Javier', 'Kumar', 'Luna', 'Mercado', 'Nunez',
      'Ocampo', 'Perez', 'Quizon', 'Ramos', 'Salazar', 'Tolentino', 'Uy', 'Valdez',
      'Wilson', 'Yap', 'Zamora', 'Abad', 'Beltran', 'Cordero', 'Dela Rosa', 'Espinosa',
      'Ferrer', 'Gonzales', 'Herrera', 'Ibanez', 'Jose', 'Kalaw', 'Lopez', 'Mendoza',
      'Nicolas', 'Ortiz', 'Pascual', 'Quirino', 'Reyes', 'Salcedo', 'Toledo', 'Ubaldo',
      'Villanueva', 'Wong', 'Ybanez', 'Zarate', 'Abella', 'Bautista', 'Cruz', 'Dela Cruz',
      'Estrella', 'Ferrer', 'Garcia', 'Herrera', 'Ibarra', 'Javier', 'Kalaw', 'Luna',
      'Mendoza', 'Nicolas', 'Ocampo', 'Perez', 'Quizon', 'Ramos', 'Santos', 'Torres'
    ];
    
    final firstNames = [
      'Juan', 'Maria', 'Pedro', 'Ana', 'Miguel', 'Carmen', 'Roberto', 'Sofia', 'Carlos',
      'Isabella', 'Jose', 'Elena', 'Antonio', 'Rosa', 'Francisco', 'Teresa', 'Manuel',
      'Patricia', 'Rafael', 'Monica', 'Luis', 'Gabriela', 'Diego', 'Valentina', 'Sergio',
      'Camila', 'Andres', 'Natalia', 'Fernando', 'Alejandra', 'Ricardo', 'Daniela',
      'Alejandro', 'Valeria', 'Sebastian', 'Ximena', 'Nicolas', 'Regina', 'Emilio',
      'Paola', 'Gonzalo', 'Andrea', 'Rodrigo', 'Fernanda', 'Santiago', 'Valentina',
      'Matias', 'Isabella', 'Benjamin', 'Sofia', 'Samuel', 'Camila', 'David', 'Elena',
      'Jose', 'Maria', 'Antonio', 'Francisco', 'Manuel', 'Jesus', 'Miguel', 'Rafael',
      'Pedro', 'Angel', 'Alejandro', 'Carlos', 'Fernando', 'Roberto', 'Daniel', 'Luis',
      'Jorge', 'Alberto', 'Pablo', 'Sergio', 'Mario', 'Javier', 'Ricardo', 'Eduardo',
      'Ana', 'Carmen', 'Maria', 'Isabel', 'Dolores', 'Pilar', 'Teresa', 'Rosa', 'Francisca',
      'Josefa', 'Antonia', 'Lucia', 'Concepcion', 'Mercedes', 'Josefina', 'Elena', 'Maria',
      'Cristina', 'Victoria', 'Amparo', 'Milagros', 'Rosario', 'Soledad', 'Esperanza',
      'Dolores', 'Pilar', 'Teresa', 'Rosa', 'Francisca', 'Josefa', 'Antonia', 'Lucia'
    ];
    
    final middleNames = [
      'Santos', 'Garcia', 'Lopez', 'Martinez', 'Fernandez', 'Castro', 'Rivera', 'Morales',
      'Gutierrez', 'Ortiz', 'Chavez', 'Jimenez', 'Ruiz', 'Diaz', 'Herrera', 'Moreno',
      'Aguilar', 'Romero', 'Navarro', 'Vargas', 'Silva', 'Mendez', 'Guerrero', 'Ramos',
      'Flores', 'Vega', 'Castillo', 'Pena', 'Rios', 'Delgado', 'Cabrera', 'Ortega'
    ];
    
    // Birthplaces: 90% Borongan City, 10% random (shortened to fit DB constraints)
    final boronganPlaces = [
      'Borongan City', 'Borongan, E.Samar', 'Borongan City, E.Samar',
      'Borongan, Samar', 'Borongan City, Samar'
    ];
    
    final otherPlaces = [
      'Manila', 'Cebu City', 'Davao City', 'Quezon City', 'Makati City', 'Taguig City',
      'Pasig City', 'Marikina City', 'Las Pinas', 'Paranaque', 'Muntinlupa',
      'Baguio City', 'Iloilo City', 'Bacolod City', 'Cagayan de Oro', 'Zamboanga City',
      'Gen Santos', 'Butuan City', 'Iligan City', 'Dumaguete', 'Tacloban City',
      'Ormoc City', 'Calbayog', 'Catbalogan', 'Caloocan', 'Malabon',
      'Navotas', 'Valenzuela', 'San Juan', 'Mandaluyong', 'Pasay City'
    ];
    
    final occupations = [
      'Teacher', 'Nurse', 'Engineer', 'Doctor', 'Lawyer', 'Accountant', 'Police',
      'Firefighter', 'Farmer', 'Fisherman', 'Driver', 'Worker', 'Carpenter',
      'Electrician', 'Plumber', 'Mechanic', 'Barber', 'Beautician', 'Cook', 'Waiter',
      'Salesperson', 'Cashier', 'Clerk', 'Secretary', 'Manager', 'Supervisor', 'Tech',
      'Laborer', 'Guard', 'Janitor', 'Housekeeper', 'Vendor', 'Owner',
      'Student', 'Unemployed', 'Retired', 'Gov Employee', 'OFW', 'Seaman',
      'Architect', 'Dentist', 'Pharmacist', 'Veterinarian', 'Psychologist', 'Social Worker',
      'Journalist', 'Photographer', 'Artist', 'Musician', 'Dancer', 'Actor', 'Chef',
      'Baker', 'Tailor', 'Shoemaker', 'Jeweler', 'Painter', 'Sculptor', 'Writer', 'Editor',
      'Translator', 'Guide', 'Agent', 'Manager', 'Owner',
      'Vendor', 'Driver', 'Driver', 'Driver',
      'Driver', 'Driver', 'Driver', 'Captain', 'Pilot',
      'Attendant', 'Staff', 'Officer', 'Officer',
      'Teller', 'Manager', 'Agent', 'Agent', 'Broker',
      'Trader', 'Advisor', 'Consultant', 'Auditor', 'Bookkeeper',
      'Clerk', 'Receptionist', 'Assistant', 'Assistant',
      'Manager', 'Recruiter', 'Coordinator', 'Control',
      'Manager', 'Worker', 'Operator', 'Worker',
      'Worker', 'Clerk', 'Clerk', 'Clerk',
      'Coordinator', 'Manager', 'Officer', 'Agent',
      'Manager', 'Representative', 'Manager', 'Service',
      'Agent', 'Support', 'Support', 'Support', 'Admin',
      'Admin', 'Admin', 'Developer', 'Developer',
      'Developer', 'Designer', 'Designer', 'Designer',
      'Marketer', 'Specialist', 'Creator', 'Manager',
      'Manager', 'Manager', 'Manager', 'Manager',
      'Coordinator', 'Planner', 'Planner', 'Caterer', 'Florist',
      'Decorator', 'Technician', 'Technician', 'Editor',
      'Operator', 'Director', 'Producer', 'Writer', 'Artist',
      'Stylist', 'Designer', 'Model', 'Instructor', 'Trainer',
      'Instructor', 'Therapist', 'Therapist', 'Therapist',
      'Therapist', 'Nutritionist', 'Dietitian', 'Technologist', 'QA',
      'Scientist', 'Technician', 'Technologist', 'Radiologist',
      'Technician', 'Technician', 'Assistant', 'Assistant',
      'Researcher', 'Surveyor', 'Geologist', 'Meteorologist', 'Scientist',
      'Biologist', 'Biologist', 'Forester', 'Ranger', 'Warden',
      'Keeper', 'Trainer', 'Groomer', 'Sitter', 'Walker',
      'Sitter', 'Sitter', 'Nanny', 'Tutor', 'Teacher', 'Teacher',
      'Teacher', 'Teacher', 'Teacher', 'Teacher',
      'Freelancer', 'Consultant', 'Contractor', 'Contractor', 'Contractor',
      'Worker', 'Seller', 'Manager', 'Dropshipper', 'Marketer',
      'Influencer', 'Blogger', 'Vlogger', 'Podcaster', 'Streamer', 'Gamer', 'Developer',
      'Tester', 'Designer', 'Animator', 'Artist', 'Designer',
      'Designer', 'Designer', 'Composer', 'Producer', 'Engineer',
      'Engineer', 'Engineer', 'Designer', 'Designer', 'Designer',
      'Master', 'Manager', 'Assistant', 'Supervisor',
      'Supervisor', 'Manager', 'Director', 'Agent',
      'Agent', 'Agent', 'Lawyer', 'Lawyer',
      'Manager', 'Manager', 'Manager', 'Manager',
      'Promoter', 'Producer', 'Organizer', 'Organizer',
      'Organizer', 'Organizer', 'Curator', 'Curator',
      'Dealer', 'Dealer', 'Collector', 'Auctioneer', 'Appraiser', 'Valuer',
      'Adjuster', 'Adjuster', 'Assessor', 'Inspector',
      'Inspector', 'Inspector', 'Inspector', 'Inspector',
      'Inspector', 'Inspector', 'Officer', 'Affairs',
      'Relations', 'Affairs', 'Relations', 'Relations',
      'Manager', 'Relations', 'Secretary', 'Spokesperson',
      'Lobbyist', 'Consultant', 'Manager', 'Officer',
      'Worker', 'Counter', 'Observer', 'Observer',
      'Diplomat', 'Officer', 'Staff', 'Officer',
      'Relations', 'Representative', 'Attaché',
      'Attaché', 'Attaché', 'Attaché', 'Officer',
      'Intelligence', 'Analyst', 'Assessment', 'Management',
      'Management', 'Management', 'Response', 'Rescue',
      'Guard', 'Navy', 'Army', 'Force', 'Marines', 'Guard',
      'Officer', 'Police', 'Intelligence', 'Engineer',
      'Doctor', 'Nurse', 'Chaplain', 'Lawyer',
      'Judge', 'Prosecutor', 'Defender', 'Reporter',
      'Translator', 'Interpreter', 'Linguist', 'Analyst',
      'Strategist', 'Planner', 'Advisor', 'Consultant',
      'Historian', 'Archivist', 'Curator', 'Director',
      'Director', 'Affairs', 'Services', 'Benefits',
      'Counseling', 'Rehabilitation', 'Employment', 'Education',
      'Healthcare', 'Housing', 'Services', 'Advocacy',
      'Outreach', 'Support', 'Assistance', 'Aid',
      'Relief', 'Welfare', 'Protection', 'Rights',
      'Justice', 'Equality', 'Dignity', 'Respect',
      'Honor', 'Recognition', 'Appreciation', 'Gratitude',
      'Service', 'Sacrifice', 'Duty', 'Honor',
      'Pride', 'Legacy', 'Heritage', 'Tradition',
      'Culture', 'History', 'Memory', 'Remembrance',
      'Memorial', 'Monument', 'Tribute', 'Homage',
      'Salute', 'Ode', 'Elegy', 'Requiem',
      'Benediction', 'Blessing', 'Prayer', 'Hope',
      'Faith', 'Love', 'Peace', 'Freedom',
      'Liberty', 'Justice', 'Truth', 'Honor',
      'Courage', 'Bravery', 'Valor', 'Heroism',
      'Sacrifice', 'Service', 'Duty', 'Honor'
    ];
    
    final civilStatuses = ['single', 'married', 'widowed', 'separated', 'divorced'];
    final employmentStatuses = ['employed', 'unemployed', 'self-employed', 'student', 'retired', 'not_applicable'];
    final educationLevels = ['elementary', 'high_school', 'college', 'post_graduate'];
    
    // Create family groups with shared last names - 20 different families
    final familyLastNames = [
      'Dela Cruz', 'Santos', 'Reyes', 'Gonzales', 'Torres', 'Villanueva', 'Cruz', 'Mendoza',
      'Ramos', 'Garcia', 'Lopez', 'Martinez', 'Fernandez', 'Castro', 'Rivera', 'Morales',
      'Gutierrez', 'Ortiz', 'Chavez', 'Jimenez'
    ];
    
    // Track how many residents we've created for each family
    final familyCounts = <String, int>{};
    
    for (int i = 0; i < 50; i++) {
      final isBorongan = random.nextDouble() < 0.9; // 90% chance
      final birthplace = isBorongan 
          ? boronganPlaces[random.nextInt(boronganPlaces.length)]
          : otherPlaces[random.nextInt(otherPlaces.length)];
      
      // Select family surname - ensure we have 3-4 residents per family
      String lastName;
      if (i < 40) { // First 40 residents will be in families
        // Choose a family that needs more members (max 4 per family)
        final availableFamilies = familyLastNames.where((name) => 
          (familyCounts[name] ?? 0) < 4).toList();
        
        if (availableFamilies.isNotEmpty) {
          lastName = availableFamilies[random.nextInt(availableFamilies.length)];
        } else {
          // If all families have 4 members, pick randomly
          lastName = familyLastNames[random.nextInt(familyLastNames.length)];
        }
      } else {
        // Last 10 residents will have unique last names
        lastName = lastNames[random.nextInt(lastNames.length)];
      }
      
      // Update family count
      familyCounts[lastName] = (familyCounts[lastName] ?? 0) + 1;
      
      final firstName = firstNames[random.nextInt(firstNames.length)];
      final middleName = middleNames[random.nextInt(middleNames.length)];
      final sex = random.nextBool() ? 'male' : 'female';
      final civilStatus = civilStatuses[random.nextInt(civilStatuses.length)];
      final occupation = occupations[random.nextInt(occupations.length)];
      final employmentStatus = employmentStatuses[random.nextInt(employmentStatuses.length)];
      final educationAttainment = educationLevels[random.nextInt(educationLevels.length)];
      final residentStatus = 'active'; // All residents will be active
      
      // Generate birthdate (age between 18-80)
      final currentYear = DateTime.now().year;
      final birthYear = currentYear - 18 - random.nextInt(62);
      final birthMonth = random.nextInt(12) + 1;
      final birthDay = random.nextInt(28) + 1;
      final birthdate = '$birthYear-${birthMonth.toString().padLeft(2, '0')}-${birthDay.toString().padLeft(2, '0')}';
      
      // Generate contact number
      final contactNumber = '+639${random.nextInt(900000000) + 100000000}';
      
      // Generate email
      final email = '${firstName.toLowerCase()}.${lastName.toLowerCase().replaceAll(' ', '')}@email.com';
      
      // Generate monthly income based on occupation and employment status
      double monthlyIncome = 0.0;
      if (employmentStatus == 'employed') {
        monthlyIncome = 15000.0 + random.nextDouble() * 50000.0;
      } else if (employmentStatus == 'self-employed') {
        monthlyIncome = 10000.0 + random.nextDouble() * 40000.0;
      } else if (employmentStatus == 'retired') {
        monthlyIncome = 5000.0 + random.nextDouble() * 20000.0;
      }
      
      residents.add(Resident(
        barangayId: barangayId,
        lastName: lastName,
        firstName: firstName,
        middleName: middleName,
        sex: sex,
        civilStatus: civilStatus,
        birthdate: birthdate,
        birthplace: birthplace,
        contactNumber: contactNumber,
        email: email,
        occupation: occupation,
        monthlyIncome: monthlyIncome,
        employmentStatus: employmentStatus,
        educationAttainment: educationAttainment,
        residentStatus: residentStatus,
        indigenousPerson: random.nextDouble() < 0.15, // 15% chance of being indigenous
      ));
    }
    
    return residents;
  }

  static Future<void> seedSampleResidents() async {
    try {
      // Initialize database
      await _databaseService.initialize();
      
      // Get barangay ID from secure storage
      final barangayId = await _authManager.getBarangayId();
      if (barangayId == null) {
        print('❌ No barangay ID found in secure storage. Please login first.');
        return;
      }
      
      // Get barangay name for display
      final barangayName = await _authManager.getBarangayName();
      
      print('🌱 Starting to seed sample residents...');
      print('🏘️ Using Barangay ID: $barangayId');
      if (barangayName != null) {
        print('🏘️ Barangay Name: $barangayName');
      }

      // Generate 20 sample residents with 90% from Borongan City
      final sampleResidents = _generateSampleResidents(barangayId);

      // Add each resident to the database
      int successCount = 0;
      for (final resident in sampleResidents) {
        try {
          final createdResident = await _databaseService.residentRepository.create(resident);
          print('✅ Added: ${createdResident.fullName} (ID: ${createdResident.id})');
          successCount++;
        } catch (e) {
          print('❌ Failed to add ${resident.fullName}: $e');
        }
      }

      print('🎉 Seeding completed! Successfully added $successCount out of ${sampleResidents.length} residents.');
      print('🏘️ All residents added to Barangay ID: $barangayId${barangayName != null ? ' ($barangayName)' : ''}');

      // Get final database stats
      final stats = await _databaseService.getDatabaseStats();
      print('📊 Database Stats: $stats');

    } catch (e) {
      print('💥 Error during seeding: $e');
      rethrow;
    }
  }

  static Future<void> clearAllData() async {
    try {
      await _databaseService.initialize();
      await _databaseService.clearAllData();
      print('🗑️ All data cleared successfully!');
    } catch (e) {
      print('💥 Error clearing data: $e');
      rethrow;
    }
  }

  static Future<void> seedHouseholdsFromResidents() async {
    try {
      // Initialize database
      await _databaseService.initialize();
      
      // Get barangay ID from secure storage
      final barangayId = await _authManager.getBarangayId();
      if (barangayId == null) {
        print('❌ No barangay ID found in secure storage. Please login first.');
        return;
      }
      
      print('🏠 Starting to seed households from existing residents...');
      print('🏘️ Using Barangay ID: $barangayId');

      // Get all residents from the database
      final allResidents = await _databaseService.residentRepository.getAll();
      print('👥 Found ${allResidents.length} residents in database');

      if (allResidents.isEmpty) {
        print('⚠️ No residents found. Please seed residents first.');
        return;
      }

      // Group residents by last name
      final Map<String, List<Resident>> residentsByLastName = {};
      for (final resident in allResidents) {
        if (!residentsByLastName.containsKey(resident.lastName)) {
          residentsByLastName[resident.lastName] = [];
        }
        residentsByLastName[resident.lastName]!.add(resident);
      }

      print('👨‍👩‍👧‍👦 Found ${residentsByLastName.length} unique families');

      // Get available puroks for the barangay from database
      final db = await _databaseService.databaseHelper.database;
      final purokResults = await db.query(
        'puroks',
        where: 'barangay_id = ?',
        whereArgs: [barangayId],
        orderBy: 'name ASC',
      );
      
      print('🏘️ Found ${purokResults.length} puroks in barangay $barangayId');
      for (final purok in purokResults) {
        print('   - ${purok['name']} (ID: ${purok['id']})');
      }

      if (purokResults.isEmpty) {
        print('⚠️ No puroks found for barangay $barangayId. Please add puroks first.');
        return;
      }

      // Create households for families with 3 or more members
      int householdCount = 0;
      int familyCount = 0;
      final random = Random();

      for (final entry in residentsByLastName.entries) {
        final lastName = entry.key;
        final familyMembers = entry.value;

        // Only create households for families with 3 or more members
        if (familyMembers.length >= 3) {
          print('🏠 Creating household for family: $lastName (${familyMembers.length} members)');

          // Find the oldest member to be the house head (assuming they're the head of household)
          familyMembers.sort((a, b) => a.birthdate.compareTo(b.birthdate));
          final houseHead = familyMembers.first;

          // Randomly select a purok from available puroks
          final selectedPurok = purokResults[random.nextInt(purokResults.length)];
          print('🏘️ Selected purok: ${selectedPurok['name']} (ID: ${selectedPurok['id']})');

          // Generate coordinates within the barangay polygon
          final coordinates = await _generateCoordinatesWithinBarangay(barangayId, random);
          
          // Create household
          final household = Household(
            houseNumber: 'H-${householdCount + 1}',
            street: 'Sample Street ${householdCount + 1}',
            purokId: selectedPurok['id'] as int,
            barangayId: barangayId,
            houseHead: houseHead.id!,
            housingType: 'owned',
            structureType: 'concrete',
            electricity: random.nextBool(),
            waterSource: 'tap_water',
            toiletFacility: 'water_sealed',
            latitude: coordinates['latitude'],
            longitude: coordinates['longitude'],
            area: 50.0 + random.nextDouble() * 100.0,
          );

          try {
            final createdHousehold = await _databaseService.householdRepository.create(household);
            print('✅ Created household: ${createdHousehold.houseNumber} in Purok ${selectedPurok['name']} (ID: ${createdHousehold.id})');
            householdCount++;

            // Create primary family with all members
            final primaryFamily = Family(
              householdId: createdHousehold.id!,
              familyGroup: '1',
              familyHead: houseHead.id!,
            );

            final createdFamily = await _databaseService.householdRepository.createFamily(primaryFamily);
            print('👨‍👩‍👧‍👦 Created primary family (ID: ${createdFamily.id})');
            familyCount++;

            // Add all family members to the primary family
            for (final member in familyMembers) {
              String relationship = 'family_member';
              if (member.id == houseHead.id) {
                relationship = 'house_head';
              } else if (member.sex == 'male' && member.civilStatus == 'married') {
                relationship = 'spouse';
              } else if (member.sex == 'female' && member.civilStatus == 'married') {
                relationship = 'spouse';
              } else {
                // Determine relationship based on age difference
                final houseHeadAge = DateTime.now().year - int.parse(houseHead.birthdate.substring(0, 4));
                final memberAge = DateTime.now().year - int.parse(member.birthdate.substring(0, 4));
                final ageDifference = houseHeadAge - memberAge;
                
                if (ageDifference > 20) {
                  relationship = 'child';
                } else if (ageDifference < -15) {
                  relationship = 'parent';
                } else {
                  relationship = 'sibling';
                }
              }

              final familyMember = FamilyMember(
                familyId: createdFamily.id!,
                familyMember: member.id!,
                relationshipToHead: relationship,
              );

              await _databaseService.householdRepository.addFamilyMember(familyMember);
              print('  👤 Added ${member.fullName} as $relationship');
            }

            // Create second family if there are enough members (6+ members)
            if (familyMembers.length >= 6) {
              // Take the second oldest as the head of the second family
              final secondFamilyHead = familyMembers[1];
              final secondFamilyMembers = familyMembers.skip(3).toList(); // Skip first 3 members

              final secondFamily = Family(
                householdId: createdHousehold.id!,
                familyGroup: '2',
                familyHead: secondFamilyHead.id!,
              );

              final createdSecondFamily = await _databaseService.householdRepository.createFamily(secondFamily);
              print('👨‍👩‍👧‍👦 Created second family (ID: ${createdSecondFamily.id})');
              familyCount++;

              // Add members to second family
              for (final member in secondFamilyMembers) {
                String relationship = 'family_member';
                if (member.id == secondFamilyHead.id) {
                  relationship = 'family_head';
                } else {
                  relationship = 'family_member';
                }

                final familyMember = FamilyMember(
                  familyId: createdSecondFamily.id!,
                  familyMember: member.id!,
                  relationshipToHead: relationship,
                );

                await _databaseService.householdRepository.addFamilyMember(familyMember);
                print('  👤 Added ${member.fullName} to second family as $relationship');
              }
            }

          } catch (e) {
            print('❌ Failed to create household for family $lastName: $e');
          }
        } else {
          print('⏭️ Skipping family $lastName (only ${familyMembers.length} members, need 3+)');
        }
      }

      print('🎉 Household seeding completed!');
      print('🏠 Created $householdCount households');
      print('👨‍👩‍👧‍👦 Created $familyCount families');

      // Get final database stats
      final stats = await _databaseService.getDatabaseStats();
      print('📊 Database Stats: $stats');

    } catch (e) {
      print('💥 Error during household seeding: $e');
      rethrow;
    }
  }

  static Future<void> showDatabaseStats() async {
    try {
      await _databaseService.initialize();
      final stats = await _databaseService.getDatabaseStats();
      print('📊 Database Stats: $stats');
    } catch (e) {
      print('💥 Error getting stats: $e');
      rethrow;
    }
  }

  /// Seeds 3 residents with the same last name (quick seeding for testing)
  static Future<void> seedThreeResidentsWithSameLastName() async {
    try {
      // Initialize database
      await _databaseService.initialize();
      
      // Get barangay ID from secure storage
      final barangayId = await _authManager.getBarangayId();
      if (barangayId == null) {
        print('❌ No barangay ID found in secure storage. Please login first.');
        throw Exception('No barangay ID found');
      }
      
      final random = Random();
      
      // Select a random last name
      final lastNames = [
        'Dela Cruz', 'Santos', 'Reyes', 'Gonzales', 'Torres', 'Villanueva', 'Cruz', 'Mendoza',
        'Ramos', 'Garcia', 'Lopez', 'Martinez', 'Fernandez', 'Castro', 'Rivera', 'Morales',
      ];
      final lastName = lastNames[random.nextInt(lastNames.length)];
      
      final firstNames = [
        'Juan', 'Maria', 'Pedro', 'Ana', 'Miguel', 'Carmen', 'Roberto', 'Sofia', 'Carlos',
        'Isabella', 'Jose', 'Elena', 'Antonio', 'Rosa', 'Francisco', 'Teresa', 'Manuel',
        'Patricia', 'Rafael', 'Monica', 'Luis', 'Gabriela', 'Diego', 'Valentina',
      ];
      
      final middleNames = [
        'Santos', 'Garcia', 'Lopez', 'Martinez', 'Fernandez', 'Castro', 'Rivera', 'Morales',
        'Gutierrez', 'Ortiz', 'Chavez', 'Jimenez', 'Ruiz', 'Diaz', 'Herrera', 'Moreno',
      ];
      
      final occupations = ['Teacher', 'Nurse', 'Engineer', 'Driver', 'Worker', 'Vendor', 'Student'];
      final civilStatuses = ['single', 'married', 'widowed'];
      final employmentStatuses = ['employed', 'unemployed', 'self-employed', 'student'];
      final educationLevels = ['elementary', 'high_school', 'college'];
      
      print('🌱 Seeding 3 residents with last name: $lastName');
      
      int successCount = 0;
      for (int i = 0; i < 3; i++) {
        final firstName = firstNames[random.nextInt(firstNames.length)];
        final middleName = middleNames[random.nextInt(middleNames.length)];
        final sex = random.nextBool() ? 'male' : 'female';
        final civilStatus = civilStatuses[random.nextInt(civilStatuses.length)];
        final occupation = occupations[random.nextInt(occupations.length)];
        final employmentStatus = employmentStatuses[random.nextInt(employmentStatuses.length)];
        final educationAttainment = educationLevels[random.nextInt(educationLevels.length)];
        
        // Generate birthdate (age between 18-70)
        final currentYear = DateTime.now().year;
        final birthYear = currentYear - 18 - random.nextInt(52);
        final birthMonth = random.nextInt(12) + 1;
        final birthDay = random.nextInt(28) + 1;
        final birthdate = '$birthYear-${birthMonth.toString().padLeft(2, '0')}-${birthDay.toString().padLeft(2, '0')}';
        
        // Generate monthly income
        double monthlyIncome = 0.0;
        if (employmentStatus == 'employed') {
          monthlyIncome = 15000.0 + random.nextDouble() * 35000.0;
        } else if (employmentStatus == 'self-employed') {
          monthlyIncome = 10000.0 + random.nextDouble() * 25000.0;
        }
        
        final resident = Resident(
          barangayId: barangayId,
          lastName: lastName,
          firstName: firstName,
          middleName: middleName,
          sex: sex,
          civilStatus: civilStatus,
          birthdate: birthdate,
          birthplace: 'Borongan City',
          contactNumber: '+639${random.nextInt(900000000) + 100000000}',
          email: '${firstName.toLowerCase()}.${lastName.toLowerCase().replaceAll(' ', '')}@email.com',
          occupation: occupation,
          monthlyIncome: monthlyIncome,
          employmentStatus: employmentStatus,
          educationAttainment: educationAttainment,
          residentStatus: 'active',
          indigenousPerson: random.nextDouble() < 0.15,
        );
        
        try {
          final createdResident = await _databaseService.residentRepository.create(resident);
          print('✅ Added: ${createdResident.fullName}');
          successCount++;
        } catch (e) {
          print('❌ Failed to add ${resident.fullName}: $e');
        }
      }
      
      print('🎉 Successfully added $successCount out of 3 residents with last name: $lastName');
      
    } catch (e) {
      print('💥 Error seeding residents: $e');
      rethrow;
    }
  }

  /// Generate random coordinates within the barangay polygon
  /// Returns a map with 'latitude' and 'longitude' keys
  static Future<Map<String, double>> _generateCoordinatesWithinBarangay(int barangayId, Random random) async {
    try {
      // Get barangay polygon data from database
      final db = await _databaseService.databaseHelper.database;
      final result = await db.query(
        'barangay_polygons',
        where: 'barangay_id = ?',
        whereArgs: [barangayId.toString()],
      );

      if (result.isEmpty) {
        print('⚠️ No polygon data found for barangay $barangayId, using fallback coordinates');
        // Fallback to Borongan City area if no polygon data
        return {
          'latitude': 11.6080 + (random.nextDouble() - 0.5) * 0.01,
          'longitude': 125.4360 + (random.nextDouble() - 0.5) * 0.01,
        };
      }

      // Parse GeoJSON data
      final geojsonData = json.decode(result.first['geojson_data'] as String);
      print('🗺️ Loaded polygon data for barangay $barangayId');

      // Extract coordinates from GeoJSON
      List<List<double>> polygonCoordinates = [];
      
      if (geojsonData['type'] == 'FeatureCollection') {
        // Handle FeatureCollection
        final features = geojsonData['features'] as List;
        if (features.isNotEmpty) {
          final geometry = features.first['geometry'];
          if (geometry['type'] == 'Polygon') {
            // Get the first ring (exterior ring) of the polygon
            polygonCoordinates = (geometry['coordinates'][0] as List)
                .map((coord) => [coord[1] as double, coord[0] as double]) // [lat, lng]
                .toList();
          } else if (geometry['type'] == 'MultiPolygon') {
            // Get the first polygon from MultiPolygon
            polygonCoordinates = (geometry['coordinates'][0][0] as List)
                .map((coord) => [coord[1] as double, coord[0] as double]) // [lat, lng]
                .toList();
          }
        }
      } else if (geojsonData['type'] == 'Feature') {
        // Handle single Feature
        final geometry = geojsonData['geometry'];
        if (geometry['type'] == 'Polygon') {
          polygonCoordinates = (geometry['coordinates'][0] as List)
              .map((coord) => [coord[1] as double, coord[0] as double]) // [lat, lng]
              .toList();
        }
      }

      if (polygonCoordinates.isEmpty) {
        print('⚠️ Could not extract coordinates from polygon data, using fallback');
        return {
          'latitude': 11.6080 + (random.nextDouble() - 0.5) * 0.01,
          'longitude': 125.4360 + (random.nextDouble() - 0.5) * 0.01,
        };
      }

      // Calculate bounding box of the polygon
      double minLat = polygonCoordinates.first[0];
      double maxLat = polygonCoordinates.first[0];
      double minLng = polygonCoordinates.first[1];
      double maxLng = polygonCoordinates.first[1];

      for (final coord in polygonCoordinates) {
        minLat = min(minLat, coord[0]);
        maxLat = max(maxLat, coord[0]);
        minLng = min(minLng, coord[1]);
        maxLng = max(maxLng, coord[1]);
      }

      print('🗺️ Polygon bounds: Lat($minLat to $maxLat), Lng($minLng to $maxLng)');

      // Generate random point within polygon using point-in-polygon algorithm
      int maxAttempts = 100; // Prevent infinite loop
      int attempts = 0;
      
      while (attempts < maxAttempts) {
        // Generate random point within bounding box
        double latitude = minLat + (maxLat - minLat) * random.nextDouble();
        double longitude = minLng + (maxLng - minLng) * random.nextDouble();
        
        // Check if point is inside polygon
        if (_isPointInPolygon(latitude, longitude, polygonCoordinates)) {
          print('🗺️ Generated coordinates within polygon: Lat($latitude), Lng($longitude)');
          return {
            'latitude': latitude,
            'longitude': longitude,
          };
        }
        
        attempts++;
      }
      
      // If we can't find a point inside after max attempts, use center of polygon
      print('⚠️ Could not find random point inside polygon after $maxAttempts attempts, using polygon center');
      return _getPolygonCenter(polygonCoordinates);

    } catch (e) {
      print('❌ Error generating coordinates within polygon: $e');
      // Fallback to Borongan City area
      return {
        'latitude': 11.6080 + (random.nextDouble() - 0.5) * 0.01,
        'longitude': 125.4360 + (random.nextDouble() - 0.5) * 0.01,
      };
    }
  }

  /// Ray casting algorithm to check if a point is inside a polygon
  /// Returns true if the point is inside the polygon, false otherwise
  static bool _isPointInPolygon(double latitude, double longitude, List<List<double>> polygon) {
    int intersections = 0;
    int n = polygon.length;
    
    for (int i = 0; i < n; i++) {
      double lat1 = polygon[i][0];
      double lng1 = polygon[i][1];
      double lat2 = polygon[(i + 1) % n][0];
      double lng2 = polygon[(i + 1) % n][1];
      
      // Check if ray intersects with this edge
      if (((lat1 > latitude) != (lat2 > latitude)) &&
          (longitude < (lng2 - lng1) * (latitude - lat1) / (lat2 - lat1) + lng1)) {
        intersections++;
      }
    }
    
    return (intersections % 2) == 1;
  }

  /// Calculate the center (centroid) of a polygon
  /// Returns a map with 'latitude' and 'longitude' keys
  static Map<String, double> _getPolygonCenter(List<List<double>> polygon) {
    double totalLat = 0.0;
    double totalLng = 0.0;
    
    for (final coord in polygon) {
      totalLat += coord[0];
      totalLng += coord[1];
    }
    
    double centerLat = totalLat / polygon.length;
    double centerLng = totalLng / polygon.length;
    
    print('🗺️ Using polygon center: Lat($centerLat), Lng($centerLng)');
    
    return {
      'latitude': centerLat,
      'longitude': centerLng,
    };
  }
}
