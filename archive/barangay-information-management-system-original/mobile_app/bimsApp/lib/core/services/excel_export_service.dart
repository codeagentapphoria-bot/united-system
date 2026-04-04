import 'dart:io';
import 'package:syncfusion_flutter_xlsio/xlsio.dart' as xlsio;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/database_service.dart';
import '../services/offline_auth_manager.dart';

/// Helper to format text for Excel (capitalize, remove underscores)
class ExcelFormatter {
  /// Capitalize first letter of each word and replace underscores with spaces
  static String formatText(String? text) {
    if (text == null || text.isEmpty) return '';
    
    // Replace underscores with spaces
    String formatted = text.replaceAll('_', ' ');
    
    // Capitalize first letter of each word
    return formatted.split(' ').map((word) {
      if (word.isEmpty) return word;
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }
  
  /// Format Yes/No values
  static String formatBoolean(bool value) {
    return value ? 'Yes' : 'No';
  }
}

class ExcelExportService {
  final DatabaseService _databaseService = DatabaseService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();

  /// Export residents and households data to Excel files following the template format
  /// Returns a map with 'excelPath' and optional 'dbBackupPath'
  Future<Map<String, String?>> exportDataToExcel() async {
    try {
      // Request storage permissions for Android (optional - will use app storage if denied)
      bool hasExternalStoragePermission = false;
      
      if (Platform.isAndroid) {
        // For Android 13+ (API 33+), try to request permissions but don't fail if denied
        try {
          final permissions = await [
            Permission.manageExternalStorage,
            Permission.storage,
          ].request();
          
          hasExternalStoragePermission = 
            permissions[Permission.manageExternalStorage]!.isGranted || 
            permissions[Permission.storage]!.isGranted;
          
          if (hasExternalStoragePermission) {
            print('✅ External storage permission granted');
          } else {
            print('⚠️ External storage permission denied - will use app-specific storage');
          }
        } catch (e) {
          print('⚠️ Permission request failed: $e - will use app-specific storage');
        }
      }

      // Initialize database
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      // Get logged-in user's barangayId from secure storage
      print('📊 EXCEL EXPORT - Getting barangayId from secure storage...');
      final barangayId = await _offlineAuth.getBarangayId();
      
      if (barangayId == null) {
        throw Exception('User not logged in or barangayId not found');
      }

      print('✅ EXCEL EXPORT - User barangayId: $barangayId');
      print('🔍 EXCEL EXPORT - Filtering ALL data by barangayId: $barangayId');

      // Get residents and households ONLY for this barangayId
      final residents = await _databaseService.residentRepository.getAll(barangayId: barangayId);
      final households = await _databaseService.householdRepository.getAll(barangayId: barangayId);
      
      // Get pets filtered by owner's barangay ID
      final pets = await _getPetsByBarangayId(barangayId);

      print('✅ EXCEL EXPORT - Filtered results:');
      print('   - Residents: ${residents.length} (barangayId: $barangayId)');
      print('   - Households: ${households.length} (barangayId: $barangayId)');
      print('   - Pets: ${pets.length} (filtered by owner\'s barangayId: $barangayId)');
      
      // Log first few resident IDs and their barangayIds to verify filtering
      if (residents.isNotEmpty) {
        print('   - Sample resident: ${residents.first.fullName} (barangayId: ${residents.first.barangayId})');
      }
      if (households.isNotEmpty) {
        print('   - Sample household: ${households.first.houseHead} (barangayId: ${households.first.barangayId})');
      }

      // Get purok names and barangay name for this barangay
      final purokMap = await _getPurokNames(barangayId);
      final barangayName = await _getBarangayName(barangayId);

      // Create Excel workbook with multiple sheets using Syncfusion
      final xlsio.Workbook workbook = xlsio.Workbook();

      // Remove default sheet and create custom sheets
      workbook.worksheets.clear();
      
      // Create residents sheet
      await _createResidentsSheet(workbook, residents);
      
      // Create households sheet
      await _createHouseholdsSheet(workbook, households, purokMap, barangayName);
      
      // Create pets sheet
      await _createPetsSheet(workbook, pets);

      // Get directory for saving files
      Directory? directory;
      
      if (Platform.isAndroid) {
        // If we have external storage permission, try public directories
        if (hasExternalStoragePermission) {
          print('📁 Trying public directories (permission granted)...');
          
          // Try to use public Downloads directory first
          try {
            directory = await getDownloadsDirectory();
            if (directory != null) {
              directory = Directory('${directory.path}/RBI_Exports');
              print('✅ Using Downloads directory: ${directory.path}');
            }
          } catch (e) {
            print('⚠️ Downloads directory failed: $e');
          }
          
          // Fallback to external storage root
          if (directory == null) {
            try {
              final externalDir = await getExternalStorageDirectory();
              if (externalDir != null) {
                final externalRoot = Directory(externalDir.path.split('/Android')[0]);
                directory = Directory('${externalRoot.path}/RBI_Exports');
                print('✅ Using external storage root: ${directory.path}');
              }
            } catch (e) {
              print('⚠️ External storage root failed: $e');
            }
          }
        }
        
        // Use app-specific storage (no permission needed)
        if (directory == null) {
          print('📁 Using app-specific storage (no permission needed)...');
          directory = await getApplicationDocumentsDirectory();
          directory = Directory('${directory.path}/RBI_Exports');
          print('✅ Using app documents directory: ${directory.path}');
        }
      } else {
        // For other platforms, use downloads directory
        directory = await getDownloadsDirectory();
        if (directory != null) {
          directory = Directory('${directory.path}/RBI_Exports');
        } else {
          directory = await getApplicationDocumentsDirectory();
          directory = Directory('${directory.path}/RBI_Exports');
        }
      }

      // Directory should always be set by now due to fallbacks

      // Create the export directory if it doesn't exist
      if (!await directory.exists()) {
        await directory.create(recursive: true);
      }

      // Generate filename with barangay name and timestamp
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final sanitizedBarangayName = barangayName.replaceAll(' ', '_').replaceAll(RegExp(r'[^\w\-]'), '');
      final filename = 'RBI_${sanitizedBarangayName}_$timestamp.xlsx';
      final filePath = '${directory.path}/$filename';

      // Save Excel file using Syncfusion
      final List<int> bytes = workbook.saveAsStream();
      workbook.dispose();
      
      final file = File(filePath);
      await file.writeAsBytes(bytes);

      // Backup the entire database file
      final dbBackupPath = await _backupDatabase(directory.path, barangayName, timestamp);

      // Try to also copy to a more accessible location (only if we have permission)
      if (hasExternalStoragePermission) {
        try {
          await _copyToAccessibleLocation(filePath, bytes);
          
          // Also copy the database backup to accessible location
          if (dbBackupPath != null) {
            final dbBackupFile = File(dbBackupPath);
            if (await dbBackupFile.exists()) {
              final dbBytes = await dbBackupFile.readAsBytes();
              final externalDir = await getExternalStorageDirectory();
              if (externalDir != null) {
                final externalRoot = Directory(externalDir.path.split('/Android')[0]);
                final accessibleDir = Directory('${externalRoot.path}/RBI_Exports');
                
                if (!await accessibleDir.exists()) {
                  await accessibleDir.create(recursive: true);
                }
                
                final dbFileName = dbBackupPath.split('/').last;
                final accessibleDbFile = File('${accessibleDir.path}/$dbFileName');
                await accessibleDbFile.writeAsBytes(dbBytes);
                
                print('✅ Database backup also copied to accessible location: ${accessibleDbFile.path}');
              }
            }
          }
        } catch (e) {
          print('⚠️ Could not copy to accessible location: $e');
          // Continue with original file path
        }
      }

      print('✅ Excel file with embedded images saved successfully to: $filePath');
      print('📊 Database backup path: ${dbBackupPath ?? "NOT CREATED"}');
      
      // List all files in the export directory for verification
      try {
        print('\n📁 Files in export directory:');
        final exportDir = Directory(directory.path);
        final files = await exportDir.list().toList();
        for (var file in files) {
          if (file is File) {
            final fileName = file.path.split('/').last;
            final fileSize = await file.length();
            final fileSizeMB = (fileSize / (1024 * 1024)).toStringAsFixed(2);
            print('   - $fileName ($fileSizeMB MB)');
          }
        }
      } catch (listError) {
        print('   ⚠️ Could not list directory: $listError');
      }
      
      return {
        'excelPath': filePath,
        'dbBackupPath': dbBackupPath,
      };
    } catch (e) {
      print('Error exporting residents to Excel: $e');
      rethrow;
    }
  }

  /// Get the full path for user reference
  String getFullFilePath(String filePath) {
    return filePath;
  }

  /// Get a user-friendly location description
  String getLocationDescription(String filePath) {
    if (Platform.isAndroid) {
      if (filePath.contains('/Downloads/')) {
        return 'Downloads/RBI_Exports folder';
      } else if (filePath.contains('/storage/emulated/0/')) {
        return 'Internal Storage/RBI_Exports folder';
      } else if (filePath.contains('/Android/data/')) {
        return 'Android/Data/[App]/RBI_Exports folder';
      } else {
        return 'App Documents/RBI_Exports folder';
      }
    } else {
      return 'Downloads/RBI_Exports folder';
    }
  }


  /// Get file size in human readable format
  String getFileSize(String filePath) {
    final file = File(filePath);
    if (!file.existsSync()) return 'Unknown';
    
    final bytes = file.lengthSync();
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  /// Check if file exists
  bool fileExists(String filePath) {
    return File(filePath).existsSync();
  }

  /// Delete exported file
  Future<bool> deleteExportedFile(String filePath) async {
    try {
      final file = File(filePath);
      if (file.existsSync()) {
        await file.delete();
        return true;
      }
      return false;
    } catch (e) {
      print('Error deleting file: $e');
      return false;
    }
  }

  /// Try to copy file to a more accessible location
  Future<void> _copyToAccessibleLocation(String originalPath, List<int> bytes) async {
    if (!Platform.isAndroid) return;

    try {
      // Try to copy to external storage root
      final externalDir = await getExternalStorageDirectory();
      if (externalDir != null) {
        final externalRoot = Directory(externalDir.path.split('/Android')[0]);
        final accessibleDir = Directory('${externalRoot.path}/RBI_Exports');
        
        if (!await accessibleDir.exists()) {
          await accessibleDir.create(recursive: true);
        }
        
        final fileName = originalPath.split('/').last;
        final accessibleFile = File('${accessibleDir.path}/$fileName');
        await accessibleFile.writeAsBytes(bytes);
        
        print('File also copied to accessible location: ${accessibleFile.path}');
      }
    } catch (e) {
      print('Failed to copy to accessible location: $e');
      // Don't throw, just log the error
    }
  }

  /// Create residents sheet in Excel using Syncfusion
  Future<void> _createResidentsSheet(xlsio.Workbook workbook, List residents) async {
    final xlsio.Worksheet sheet = workbook.worksheets.add();
    sheet.name = 'Residents';

    // Add headers (all resident fields)
    final headers = [
      'Photo',
      'Resident ID',
      'First Name',
      'Last Name',
      'Middle Name',
      'Suffix',
      'Birth Date',
      'Birth Place',
      'Gender',
      'Civil Status',
      'Employment Status',
      'Occupation',
      'Monthly Income',
      'Educational Attainment',
      'Contact Number',
      'Email',
      'Resident Status',
      'Indigenous Person',
      'Created At',
      'Updated At'
    ];

    // Add header row
    for (int i = 0; i < headers.length; i++) {
      sheet.getRangeByIndex(1, i + 1).setText(headers[i]);
      sheet.getRangeByIndex(1, i + 1).cellStyle.bold = true;
    }

    // Set column width for photo column (in pixels)
    sheet.setColumnWidthInPixels(1, 100);

    // Add resident data
    for (int i = 0; i < residents.length; i++) {
      final resident = residents[i];
      final rowIndex = i + 2; // Start from row 2 (1 is header)

      // Set row height for better image display (in pixels)
      sheet.setRowHeightInPixels(rowIndex, 100);

      // Insert image if available
      if (resident.picturePath != null && resident.picturePath!.isNotEmpty) {
        try {
          final imageFile = File(resident.picturePath!);
          if (await imageFile.exists()) {
            final imageBytes = await imageFile.readAsBytes();
            
            // Insert image into Excel cell
            final xlsio.Picture picture = sheet.pictures.addStream(rowIndex, 1, imageBytes);
            
            // Fit image to cell
            picture.height = 90;
            picture.width = 90;
          } else {
            sheet.getRangeByIndex(rowIndex, 1).setText('No image');
          }
        } catch (e) {
          print('⚠️ Failed to insert image for resident ${resident.id}: $e');
          sheet.getRangeByIndex(rowIndex, 1).setText('Error loading image');
        }
      } else {
        sheet.getRangeByIndex(rowIndex, 1).setText('No image');
      }

      // Map resident data to columns (formatted for readability)
      int colIdx = 2;
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(resident.id ?? '');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.firstName));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.lastName));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.middleName));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.suffix));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(resident.birthdate);
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.birthplace));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.sex));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.civilStatus));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.employmentStatus));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.occupation));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(resident.monthlyIncome?.toString() ?? '');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.educationAttainment));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(resident.contactNumber ?? '');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(resident.email ?? '');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(resident.residentStatus));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(resident.indigenousPerson ? 'Yes' : 'No');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(resident.createdAt ?? '');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(resident.updatedAt ?? '');
    }
  }

  /// Create households sheet in Excel with family details using Syncfusion
  Future<void> _createHouseholdsSheet(xlsio.Workbook workbook, List households, Map<int, String> purokMap, String barangayName) async {
    final xlsio.Worksheet sheet = workbook.worksheets.add();
    sheet.name = 'Households';

    // First, determine max number of families across all households
    int maxFamilies = 0;
    for (final household in households) {
      final families = await _getHouseholdFamilies(household.id);
      if (families.length > maxFamilies) {
        maxFamilies = families.length;
      }
    }
    print('📊 Max families in any household: $maxFamilies');

    // Build headers dynamically based on max families (with all fields)
    final headers = [
      'Photo',
      'Household ID',
      'House Head Name',
      'Purok Name',
      'Barangay Name',
      'House Number',
      'Street',
      'Housing Type',
      'Structure Type',
      'Electricity',
      'Water Source',
      'Toilet Facility',
      'Latitude',
      'Longitude',
      'Area',
      'Created At',
      'Updated At',
    ];
    
    // Add family columns
    for (int i = 1; i <= maxFamilies; i++) {
      headers.add('Family $i Head');
      headers.add('Family $i Members');
    }

    // Add header row
    for (int i = 0; i < headers.length; i++) {
      sheet.getRangeByIndex(1, i + 1).setText(headers[i]);
      sheet.getRangeByIndex(1, i + 1).cellStyle.bold = true;
    }

    // Set column width for photo column
    sheet.setColumnWidthInPixels(1, 100);

    // Add household data
    for (int i = 0; i < households.length; i++) {
      final household = households[i];
      final rowIndex = i + 2; // Start from row 2 (1 is header)

      // Set row height for better image display
      sheet.setRowHeightInPixels(rowIndex, 100);

      // Get families for this household
      final families = await _getHouseholdFamilies(household.id);

      // Insert household image if available
      int colIndex = 1;
      if (household.householdImagePath != null && household.householdImagePath!.isNotEmpty) {
        try {
          final imageFile = File(household.householdImagePath!);
          if (await imageFile.exists()) {
            final imageBytes = await imageFile.readAsBytes();
            
            // Insert image into Excel cell
            final xlsio.Picture picture = sheet.pictures.addStream(rowIndex, colIndex, imageBytes);
            
            // Fit image to cell
            picture.height = 90;
            picture.width = 90;
          } else {
            sheet.getRangeByIndex(rowIndex, colIndex).setText('No image');
          }
        } catch (e) {
          print('⚠️ Failed to insert image for household ${household.id}: $e');
          sheet.getRangeByIndex(rowIndex, colIndex).setText('Error loading image');
        }
      } else {
        sheet.getRangeByIndex(rowIndex, colIndex).setText('No image');
      }
      colIndex++;

      // Get household head full name from resident ID
      String houseHeadFullName = 'Unknown';
      try {
        final db = await _databaseService.databaseHelper.database;
        final headResult = await db.query(
          'residents',
          where: 'id = ?',
          whereArgs: [household.houseHead],
          columns: ['first_name', 'last_name', 'middle_name', 'suffix'],
        );
        
        if (headResult.isNotEmpty) {
          final head = headResult.first;
          final firstName = head['first_name'] as String;
          final lastName = head['last_name'] as String;
          final middleName = head['middle_name'] as String?;
          final suffix = head['suffix'] as String?;
          
          // Build full name
          String fullName = firstName;
          if (middleName != null && middleName.isNotEmpty) {
            fullName += ' $middleName';
          }
          fullName += ' $lastName';
          if (suffix != null && suffix.isNotEmpty) {
            fullName += ' $suffix';
          }
          
          houseHeadFullName = ExcelFormatter.formatText(fullName);
        }
      } catch (e) {
        print('⚠️ Error getting household head name: $e');
      }

      // Map household data to columns
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(household.id?.toString() ?? '');
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(houseHeadFullName);
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(purokMap[household.purokId] ?? 'Purok ${household.purokId}');
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(barangayName);
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(household.houseNumber ?? '');
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(ExcelFormatter.formatText(household.street));
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(ExcelFormatter.formatText(household.housingType));
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(ExcelFormatter.formatText(household.structureType));
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(ExcelFormatter.formatBoolean(household.electricity));
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(ExcelFormatter.formatText(household.waterSource));
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(ExcelFormatter.formatText(household.toiletFacility));
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(household.latitude?.toString() ?? '');
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(household.longitude?.toString() ?? '');
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(household.area?.toString() ?? '');
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(household.createdAt ?? '');
      sheet.getRangeByIndex(rowIndex, colIndex++).setText(household.updatedAt ?? '');
      
      // Add family data (formatted)
      for (int familyIndex = 0; familyIndex < maxFamilies; familyIndex++) {
        if (familyIndex < families.length) {
          final family = families[familyIndex];
          sheet.getRangeByIndex(rowIndex, colIndex++).setText(ExcelFormatter.formatText(family['head']));
          sheet.getRangeByIndex(rowIndex, colIndex++).setText(ExcelFormatter.formatText(family['members']));
        } else {
          sheet.getRangeByIndex(rowIndex, colIndex++).setText('');
          sheet.getRangeByIndex(rowIndex, colIndex++).setText('');
        }
      }
    }
  }

  /// Create pets sheet in Excel with all pet details
  Future<void> _createPetsSheet(xlsio.Workbook workbook, List pets) async {
    final xlsio.Worksheet sheet = workbook.worksheets.add();
    sheet.name = 'Pets';

    // Add headers (all pet fields)
    final headers = [
      'Photo',
      'Pet ID',
      'Pet Name',
      'Owner Name',
      'Species',
      'Breed',
      'Gender',
      'Birth Date',
      'Color',
      'Description',
      'Vaccinated',
      'Vaccination Date',
      'Created At',
      'Updated At',
    ];

    // Add header row
    for (int i = 0; i < headers.length; i++) {
      sheet.getRangeByIndex(1, i + 1).setText(headers[i]);
      sheet.getRangeByIndex(1, i + 1).cellStyle.bold = true;
    }

    // Set column width for photo column
    sheet.setColumnWidthInPixels(1, 100);

    // Add pet data
    for (int i = 0; i < pets.length; i++) {
      final pet = pets[i];
      final rowIndex = i + 2; // Start from row 2 (1 is header)

      // Set row height for better image display
      sheet.setRowHeightInPixels(rowIndex, 100);

      // Insert pet image if available
      if (pet.picturePath != null && pet.picturePath!.isNotEmpty) {
        try {
          final imageFile = File(pet.picturePath!);
          if (await imageFile.exists()) {
            final imageBytes = await imageFile.readAsBytes();
            
            // Insert image into Excel cell
            final xlsio.Picture picture = sheet.pictures.addStream(rowIndex, 1, imageBytes);
            
            // Fit image to cell
            picture.height = 90;
            picture.width = 90;
          } else {
            sheet.getRangeByIndex(rowIndex, 1).setText('No image');
          }
        } catch (e) {
          print('⚠️ Failed to insert image for pet ${pet.id}: $e');
          sheet.getRangeByIndex(rowIndex, 1).setText('Error loading image');
        }
      } else {
        sheet.getRangeByIndex(rowIndex, 1).setText('No image');
      }

      // Get owner full name from owner ID
      String ownerFullName = 'Unknown Owner';
      try {
        final db = await _databaseService.databaseHelper.database;
        final ownerResult = await db.query(
          'residents',
          where: 'id = ?',
          whereArgs: [pet.ownerId],
          columns: ['first_name', 'last_name', 'middle_name', 'suffix'],
        );
        
        if (ownerResult.isNotEmpty) {
          final owner = ownerResult.first;
          final firstName = owner['first_name'] as String;
          final lastName = owner['last_name'] as String;
          final middleName = owner['middle_name'] as String?;
          final suffix = owner['suffix'] as String?;
          
          // Build full name
          String fullName = firstName;
          if (middleName != null && middleName.isNotEmpty) {
            fullName += ' $middleName';
          }
          fullName += ' $lastName';
          if (suffix != null && suffix.isNotEmpty) {
            fullName += ' $suffix';
          }
          
          ownerFullName = ExcelFormatter.formatText(fullName);
        }
      } catch (e) {
        print('⚠️ Error getting pet owner name: $e');
      }

      // Map pet data to columns (formatted for readability)
      int colIdx = 2;
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(pet.id?.toString() ?? '');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(pet.petName));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ownerFullName);
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(pet.species));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(pet.breed));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(pet.sex));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(pet.birthdate);
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(ExcelFormatter.formatText(pet.color));
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(pet.description ?? '');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(pet.isVaccinated ? 'Yes' : 'No');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(pet.vaccinationDate ?? '');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(pet.createdAt ?? '');
      sheet.getRangeByIndex(rowIndex, colIdx++).setText(pet.updatedAt ?? '');
    }
  }

  /// Get purok names from database filtered by barangayId
  Future<Map<int, String>> _getPurokNames(int barangayId) async {
    try {
      final db = await _databaseService.databaseHelper.database;
      final results = await db.query(
        'puroks',
        columns: ['id', 'name'],
        where: 'barangay_id = ?',
        whereArgs: [barangayId],
      );
      
      final Map<int, String> purokMap = {};
      for (final row in results) {
        purokMap[row['id'] as int] = row['name'] as String;
      }
      print('📊 EXCEL EXPORT - Found ${purokMap.length} puroks for barangay $barangayId');
      return purokMap;
    } catch (e) {
      print('Error getting purok names: $e');
      return {};
    }
  }

  /// Get barangay name from database
  Future<String> _getBarangayName(int barangayId) async {
    try {
      final db = await _databaseService.databaseHelper.database;
      final results = await db.query(
        'barangays',
        columns: ['name'],
        where: 'id = ?',
        whereArgs: [barangayId],
      );
      
      if (results.isNotEmpty) {
        final barangayName = results.first['name'] as String;
        print('📊 EXCEL EXPORT - Barangay name: $barangayName');
        return barangayName;
      }
      
      return 'Unknown Barangay';
    } catch (e) {
      print('Error getting barangay name: $e');
      return 'Unknown Barangay';
    }
  }

  /// Backup the entire database file
  Future<String?> _backupDatabase(String exportPath, String barangayName, int timestamp) async {
    try {
      print('💾 Starting database backup...');
      print('   Export path: $exportPath');
      
      // Get the database instance
      final db = await _databaseService.databaseHelper.database;
      final dbPath = db.path;
      
      print('   Database path: $dbPath');
      
      if (dbPath.isEmpty) {
        print('⚠️ Database path is empty, skipping backup');
        return null;
      }
      
      // Create backup filename
      final sanitizedBarangayName = barangayName.replaceAll(' ', '_').replaceAll(RegExp(r'[^\w\-]'), '');
      final backupFileName = 'RBI_${sanitizedBarangayName}_database_backup_$timestamp.db';
      final backupPath = '$exportPath/$backupFileName';
      
      print('   Backup will be saved to: $backupPath');
      
      // Ensure all data is committed (WAL mode checkpoint)
      try {
        await db.execute('PRAGMA wal_checkpoint(TRUNCATE)');
        print('   ✅ WAL checkpoint completed');
      } catch (walError) {
        print('   ⚠️ WAL checkpoint failed (database might not be in WAL mode): $walError');
      }
      
      // Wait a moment for any pending writes
      await Future.delayed(const Duration(milliseconds: 200));
      
      // Copy the main database file
      final dbFile = File(dbPath);
      print('   Database file exists: ${await dbFile.exists()}');
      
      if (await dbFile.exists()) {
        print('   Copying database file...');
        await dbFile.copy(backupPath);
        
        // Verify the backup was created
        final backupFile = File(backupPath);
        if (await backupFile.exists()) {
          final fileSize = await backupFile.length();
          final fileSizeMB = (fileSize / (1024 * 1024)).toStringAsFixed(2);
          print('✅ Database backup saved successfully!');
          print('   Backup path: $backupPath');
          print('   Backup size: $fileSizeMB MB');
          
          // Also copy WAL and SHM files if they exist (for complete backup)
          try {
            final walFile = File('$dbPath-wal');
            if (await walFile.exists()) {
              await walFile.copy('$backupPath-wal');
              print('   ✅ WAL file copied');
            }
            
            final shmFile = File('$dbPath-shm');
            if (await shmFile.exists()) {
              await shmFile.copy('$backupPath-shm');
              print('   ✅ SHM file copied');
            }
          } catch (walShmError) {
            print('   ⚠️ WAL/SHM files not copied: $walShmError');
          }
          
          return backupPath;
        } else {
          print('⚠️ Backup file was not created at: $backupPath');
          return null;
        }
        
      } else {
        print('⚠️ Database file does not exist at: $dbPath');
        return null;
      }
      
    } catch (e) {
      print('❌ Error backing up database: $e');
      print('   Error type: ${e.runtimeType}');
      print('   Error details: ${e.toString()}');
      // Don't throw - allow export to continue even if backup fails
      return null;
    }
  }

  /// Get pets filtered by owner's barangay ID
  Future<List> _getPetsByBarangayId(int barangayId) async {
    try {
      final db = await _databaseService.databaseHelper.database;
      
      // Get all resident IDs from this barangay
      final residentIds = await db.query(
        'residents',
        columns: ['id'],
        where: 'barangay_id = ?',
        whereArgs: [barangayId],
      );
      
      final barangayResidentIds = residentIds.map((r) => r['id'] as String).toSet();
      
      // Get all pets and filter by owner's barangay
      final allPets = await _databaseService.petsRepository.getAll();
      final filteredPets = allPets.where((pet) => barangayResidentIds.contains(pet.ownerId)).toList();
      
      print('📊 EXCEL EXPORT - Found ${filteredPets.length} pets for barangay $barangayId (owned by residents in this barangay)');
      return filteredPets;
    } catch (e) {
      print('Error getting pets by barangay: $e');
      return [];
    }
  }

  /// Get all families for a household with their heads and members
  Future<List<Map<String, String>>> _getHouseholdFamilies(int? householdId) async {
    if (householdId == null) return [];
    
    try {
      final db = await _databaseService.databaseHelper.database;
      
      // Get all families for this household
      final familiesData = await db.query(
        'families',
        where: 'household_id = ?',
        whereArgs: [householdId],
        orderBy: 'id ASC',
      );
      
      final List<Map<String, String>> familiesList = [];
      
      for (final familyData in familiesData) {
        final familyId = familyData['id'] as int;
        final familyHeadId = familyData['family_head'] as String;
        
        // Get family head name
        final headResult = await db.query(
          'residents',
          where: 'id = ?',
          whereArgs: [familyHeadId],
          columns: ['first_name', 'last_name', 'middle_name'],
        );
        
        String familyHead = 'Unknown';
        if (headResult.isNotEmpty) {
          final head = headResult.first;
          final firstName = head['first_name'] as String;
          final lastName = head['last_name'] as String;
          final middleName = head['middle_name'] as String?;
          familyHead = middleName != null && middleName.isNotEmpty 
              ? '$firstName $middleName $lastName' 
              : '$firstName $lastName';
        }
        
        // Get family members (excluding the family head)
        final membersData = await db.query(
          'family_members',
          where: 'family_id = ?',
          whereArgs: [familyId],
        );
        
        final List<String> memberNames = [];
        for (final memberData in membersData) {
          final memberId = memberData['family_member'] as String;
          
          // Skip the family head
          if (memberId == familyHeadId) continue;
          
          final memberResult = await db.query(
            'residents',
            where: 'id = ?',
            whereArgs: [memberId],
            columns: ['first_name', 'last_name', 'middle_name'],
          );
          
          if (memberResult.isNotEmpty) {
            final member = memberResult.first;
            final firstName = member['first_name'] as String;
            final lastName = member['last_name'] as String;
            final middleName = member['middle_name'] as String?;
            final fullName = middleName != null && middleName.isNotEmpty 
                ? '$firstName $middleName $lastName' 
                : '$firstName $lastName';
            memberNames.add(fullName);
          }
        }
        
        familiesList.add({
          'head': familyHead,
          'members': memberNames.join(', '),
        });
      }
      
      return familiesList;
    } catch (e) {
      print('Error getting household families: $e');
      return [];
    }
  }
}
