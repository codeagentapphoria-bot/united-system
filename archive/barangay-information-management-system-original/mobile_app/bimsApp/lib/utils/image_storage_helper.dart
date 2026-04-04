import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;

class ImageStorageHelper {
  /// Save resident image with proper filename: {residentID}.jpg
  static Future<String?> saveResidentImage(File imageFile, String residentId) async {
    try {
      // Get app documents directory
      final Directory appDocDir = await getApplicationDocumentsDirectory();
      final Directory residentsDir = Directory('${appDocDir.path}/residents_images');
      
      // Create directory if it doesn't exist
      if (!await residentsDir.exists()) {
        await residentsDir.create(recursive: true);
      }
      
      // Get file extension
      final String extension = path.extension(imageFile.path);
      
      // Create new filename with resident ID
      final String newFileName = '$residentId$extension';
      final String newPath = '${residentsDir.path}/$newFileName';
      
      // Copy file to new location with new name
      final File newFile = await imageFile.copy(newPath);
      
      print('✅ Resident image saved: $newPath');
      return newFile.path;
    } catch (e) {
      print('❌ Error saving resident image: $e');
      return null;
    }
  }
  
  /// Save household image with proper filename: {householdID}_{househeadID}.jpg
  static Future<String?> saveHouseholdImage(File imageFile, int householdId, String househeadId) async {
    try {
      // Get app documents directory
      final Directory appDocDir = await getApplicationDocumentsDirectory();
      final Directory householdsDir = Directory('${appDocDir.path}/households_images');
      
      // Create directory if it doesn't exist
      if (!await householdsDir.exists()) {
        await householdsDir.create(recursive: true);
      }
      
      // Get file extension
      final String extension = path.extension(imageFile.path);
      
      // Create new filename with household ID and househead ID
      final String newFileName = '${householdId}_$househeadId$extension';
      final String newPath = '${householdsDir.path}/$newFileName';
      
      // Copy file to new location with new name
      final File newFile = await imageFile.copy(newPath);
      
      print('✅ Household image saved: $newPath');
      return newFile.path;
    } catch (e) {
      print('❌ Error saving household image: $e');
      return null;
    }
  }
  
  /// Delete resident image
  static Future<bool> deleteResidentImage(String residentId) async {
    try {
      final Directory appDocDir = await getApplicationDocumentsDirectory();
      final Directory residentsDir = Directory('${appDocDir.path}/residents_images');
      
      // Try to find and delete the image with any extension
      final List<String> extensions = ['.jpg', '.jpeg', '.png'];
      
      for (String ext in extensions) {
        final File imageFile = File('${residentsDir.path}/$residentId$ext');
        if (await imageFile.exists()) {
          await imageFile.delete();
          print('✅ Resident image deleted: $residentId$ext');
          return true;
        }
      }
      
      return false;
    } catch (e) {
      print('❌ Error deleting resident image: $e');
      return false;
    }
  }
  
  /// Delete household image
  static Future<bool> deleteHouseholdImage(int householdId, String househeadId) async {
    try {
      final Directory appDocDir = await getApplicationDocumentsDirectory();
      final Directory householdsDir = Directory('${appDocDir.path}/households_images');
      
      // Try to find and delete the image with any extension
      final List<String> extensions = ['.jpg', '.jpeg', '.png'];
      
      for (String ext in extensions) {
        final File imageFile = File('${householdsDir.path}/${householdId}_$househeadId$ext');
        if (await imageFile.exists()) {
          await imageFile.delete();
          print('✅ Household image deleted: ${householdId}_$househeadId$ext');
          return true;
        }
      }
      
      return false;
    } catch (e) {
      print('❌ Error deleting household image: $e');
      return false;
    }
  }
  
  /// Save pet image with proper filename: {ownerID}.jpg
  static Future<String?> savePetImage(File imageFile, String ownerId) async {
    try {
      // Get app documents directory
      final Directory appDocDir = await getApplicationDocumentsDirectory();
      final Directory petsDir = Directory('${appDocDir.path}/pets_images');
      
      // Create directory if it doesn't exist
      if (!await petsDir.exists()) {
        await petsDir.create(recursive: true);
      }
      
      // Get file extension
      final String extension = path.extension(imageFile.path);
      
      // Create new filename with owner ID
      final String newFileName = '$ownerId$extension';
      final String newPath = '${petsDir.path}/$newFileName';
      
      // Copy file to new location with new name
      final File newFile = await imageFile.copy(newPath);
      
      print('✅ Pet image saved: $newPath');
      return newFile.path;
    } catch (e) {
      print('❌ Error saving pet image: $e');
      return null;
    }
  }
  
  /// Delete pet image
  static Future<bool> deletePetImage(String ownerId) async {
    try {
      final Directory appDocDir = await getApplicationDocumentsDirectory();
      final Directory petsDir = Directory('${appDocDir.path}/pets_images');
      
      // Try to find and delete the image with any extension
      final List<String> extensions = ['.jpg', '.jpeg', '.png'];
      
      for (String ext in extensions) {
        final File imageFile = File('${petsDir.path}/$ownerId$ext');
        if (await imageFile.exists()) {
          await imageFile.delete();
          print('✅ Pet image deleted: $ownerId$ext');
          return true;
        }
      }
      
      return false;
    } catch (e) {
      print('❌ Error deleting pet image: $e');
      return false;
    }
  }
}

