import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../config/api_config.dart';
import 'excel_export_service.dart';
import 'offline_auth_manager.dart';

class EmailService {
  final ExcelExportService _excelExportService = ExcelExportService();
  final OfflineAuthManager _offlineAuth = OfflineAuthManager();

  /// Format date in human-readable format: YYYY/MM/DD HH:MM:SS
  String _formatDate(DateTime date) {
    return DateFormat('yyyy/MM/dd HH:mm:ss').format(date);
  }

  /// Convert file to base64 for email attachment
  String _fileToBase64(String filePath) {
    final bytes = File(filePath).readAsBytesSync();
    return base64Encode(bytes);
  }

  /// Export data to Excel and send via email automatically (background using SendGrid)
  Future<bool> exportAndSendEmail({
    String? recipientEmail,
    String? subject,
    String? message,
  }) async {
    try {
      print('\n🔷🔷🔷 EMAIL SERVICE - exportAndSendEmail() STARTED 🔷🔷🔷');

      // Step 1: Export data to Excel
      print('📊 Step 1: Exporting data to Excel...');
      final result = await _excelExportService.exportDataToExcel();
      final filePath = result['excelPath'];
      final dbBackupPath = result['dbBackupPath'];
      
      if (filePath == null) {
        print('❌ Export failed: filePath is null');
        throw Exception('Failed to export data to Excel');
      }

      print('✅ Excel file created successfully');
      print('   File path: $filePath');
      print('   File size: ${_excelExportService.getFileSize(filePath)}');
      
      if (dbBackupPath != null) {
        print('✅ Database backup created');
        print('   Backup path: $dbBackupPath');
        print('   Backup size: ${_excelExportService.getFileSize(dbBackupPath)}');
      } else {
        print('⚠️ Database backup was not created');
      }

      // Step 2: Get user information
      print('👤 Step 2: Getting user information...');
      final userData = await _offlineAuth.getCurrentUser();
      final barangayName = userData?.barangayName ?? 'Unknown Barangay';
      final municipalityName = userData?.municipalityName ?? 'Unknown Municipality';
      print('✅ User info retrieved:');
      print('   Barangay: $barangayName');
      print('   Municipality: $municipalityName');

      // Step 3: Prepare email content
      final fileName = filePath.split('/').last;
      final finalRecipient = recipientEmail ?? ApiConfig.recipientEmail;
      final currentDate = _formatDate(DateTime.now());
      
      final finalSubject = subject ?? 'RBI Data Export - $barangayName, $municipalityName';
      final finalMessage = message ?? 
          'Barangay: $barangayName\n'
          'Municipality: $municipalityName\n'
          'File: $fileName\n'
          'Date: $currentDate';
      
      print('📦 Step 3: Preparing email...');
      print('   Recipient: $finalRecipient');
      print('   Subject: $finalSubject');
      print('   Attachment: $fileName');
      print('   Date: $currentDate');

      // Step 4: Convert Excel file to base64
      print('🔄 Step 4: Converting file to base64...');
      final fileBase64 = _fileToBase64(filePath);
      print('✅ File converted to base64 (${fileBase64.length} characters)');

      // Step 5: Send email via SendGrid API
      print('📤 Step 5: Sending email via SendGrid API...');
      print('   API URL: ${ApiConfig.sendGridApiUrl}');
      print('   Sender: ${ApiConfig.senderEmail}');
      
      // Prepare SendGrid API request
      final requestBody = {
        'personalizations': [
          {
            'to': [
              {'email': finalRecipient}
            ],
            'subject': finalSubject
          }
        ],
        'from': {
          'email': ApiConfig.senderEmail,
          'name': ApiConfig.senderName
        },
        'content': [
          {
            'type': 'text/plain',
            'value': finalMessage
          }
        ],
        'attachments': [
          {
            'content': fileBase64,
            'filename': fileName,
            'type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'disposition': 'attachment'
          }
        ]
      };

      // Send HTTP request to SendGrid
      print('📧 Sending HTTP POST request to SendGrid...');
      final response = await http.post(
        Uri.parse(ApiConfig.sendGridApiUrl),
        headers: {
          'Authorization': 'Bearer ${ApiConfig.sendGridApiKey}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(requestBody),
      );

      print('📥 SendGrid Response:');
      print('   Status Code: ${response.statusCode}');
      print('   Response Body: ${response.body}');
      print('   Response Headers: ${response.headers}');

      if (response.statusCode == 200 || response.statusCode == 202) {
        print('✅✅✅ EMAIL SENT SUCCESSFULLY IN BACKGROUND! ✅✅✅');
        print('📧 Email delivered to: $finalRecipient');
        print('🔷🔷🔷 EMAIL SERVICE - exportAndSendEmail() COMPLETED 🔷🔷🔷\n');
        return true;
      } else {
        print('❌ SendGrid API failed with status: ${response.statusCode}');
        print('   Error: ${response.body}');
        print('🔷🔷🔷 EMAIL SERVICE - exportAndSendEmail() FAILED 🔷🔷🔷\n');
        return false;
      }
    } catch (e, stackTrace) {
      print('\n❌❌❌ EXCEPTION IN EMAIL SERVICE ❌❌❌');
      print('Error Type: ${e.runtimeType}');
      print('Error Message: $e');
      print('Stack Trace:');
      print(stackTrace);
      print('❌❌❌ END EXCEPTION ❌❌❌');
      print('🔷🔷🔷 EMAIL SERVICE - exportAndSendEmail() FAILED WITH EXCEPTION 🔷🔷🔷\n');
      return false;
    }
  }

}

