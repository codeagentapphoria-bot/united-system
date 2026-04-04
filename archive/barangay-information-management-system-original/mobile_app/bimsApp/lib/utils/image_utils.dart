import 'dart:io';
import 'package:image_cropper/image_cropper.dart';
import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class ImageUtils {
  /// Safely crop an image with proper error handling for the image_cropper plugin
  static Future<File?> cropImage({
    required File imageFile,
    required String title,
    CropAspectRatio? aspectRatio,
    bool lockAspectRatio = false,
  }) async {
    int retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        // Add a small delay to prevent race conditions
        await Future.delayed(Duration(milliseconds: 100 + (retryCount * 50)));
        
        final croppedFile = await ImageCropper().cropImage(
          sourcePath: imageFile.path,
          aspectRatio: aspectRatio,
          compressFormat: ImageCompressFormat.jpg,
          compressQuality: 85,
          uiSettings: [
            AndroidUiSettings(
              toolbarTitle: title,
              toolbarColor: AppColors.primary,
              toolbarWidgetColor: Colors.white,
              initAspectRatio: CropAspectRatioPreset.original,
              lockAspectRatio: lockAspectRatio,
              hideBottomControls: false,
              statusBarColor: AppColors.primaryDark, // Darker to distinguish from toolbar
              activeControlsWidgetColor: AppColors.primary,
              showCropGrid: true, // Show grid for better alignment
              dimmedLayerColor: Colors.black, // Make dimmed area more visible
              cropFrameStrokeWidth: 3, // Thicker crop frame
            ),
            IOSUiSettings(
              title: title,
              aspectRatioLockEnabled: lockAspectRatio,
              resetAspectRatioEnabled: true,
              hidesNavigationBar: false,
              minimumAspectRatio: 0.5,
            ),
          ],
        );

        return croppedFile != null ? File(croppedFile.path) : null;
      } catch (e) {
        // Handle the specific "Reply already submitted" error
        if (e.toString().contains('Reply already submitted')) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw Exception('Image cropping failed after multiple attempts. Please try again.');
          }
          // Continue to retry
          continue;
        } else {
          throw Exception('Error cropping image: $e');
        }
      }
    }
    
    return null;
  }

  /// Show error message for image cropping issues
  static void showCropError(BuildContext context, dynamic error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString()),
          backgroundColor: error.toString().contains('cancelled') 
              ? AppColors.warning 
              : AppColors.error,
        ),
      );
    }
  }
}
