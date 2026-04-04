import 'package:flutter/material.dart';

class ToastHelper {
  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.green[600],
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.red[600],
        duration: const Duration(seconds: 5),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  static void showWarning(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.warning, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.orange[600],
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  static void showInfo(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.info, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: Colors.blue[600],
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  static void showSyncError(BuildContext context, String operation, String error) {
    String userFriendlyMessage = _getUserFriendlyErrorMessage(operation, error);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.sync_problem, color: Colors.white),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Sync Failed: $operation',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(userFriendlyMessage),
          ],
        ),
        backgroundColor: Colors.red[600],
        duration: const Duration(seconds: 6),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        action: SnackBarAction(
          label: 'Retry',
          textColor: Colors.white,
          onPressed: () {
            // This will be handled by the calling screen
          },
        ),
      ),
    );
  }

  static String _getUserFriendlyErrorMessage(String operation, String error) {
    // Network-related errors
    if (error.toLowerCase().contains('network') || 
        error.toLowerCase().contains('connection') ||
        error.toLowerCase().contains('timeout')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    // Server errors
    if (error.toLowerCase().contains('server') || 
        error.toLowerCase().contains('500') ||
        error.toLowerCase().contains('502') ||
        error.toLowerCase().contains('503')) {
      return 'Server is temporarily unavailable. Please try again later.';
    }
    
    // Authentication errors
    if (error.toLowerCase().contains('unauthorized') || 
        error.toLowerCase().contains('401') ||
        error.toLowerCase().contains('token')) {
      return 'Authentication failed. Please log in again.';
    }
    
    // Data validation errors
    if (error.toLowerCase().contains('validation') || 
        error.toLowerCase().contains('invalid') ||
        error.toLowerCase().contains('required')) {
      return 'Data validation failed. Please check your data and try again.';
    }
    
    // Database errors
    if (error.toLowerCase().contains('database') || 
        error.toLowerCase().contains('sql') ||
        error.toLowerCase().contains('constraint')) {
      return 'Database error occurred. Please contact support if this persists.';
    }
    
    // File/image errors
    if (error.toLowerCase().contains('file') || 
        error.toLowerCase().contains('image') ||
        error.toLowerCase().contains('upload')) {
      return 'File upload failed. Please check your image files and try again.';
    }
    
    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
  }

  static void showSyncProgress(BuildContext context, String operation, int current, int total) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text('$operation: $current/$total'),
            ),
          ],
        ),
        backgroundColor: Colors.blue[600],
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}
