import 'dart:convert';

class Classification {
  final int? id;
  final String localId;
  final String classificationType;
  final String? classificationDetails;
  final String? createdAt;
  final String? updatedAt;

  Classification({
    this.id,
    required this.localId,
    required this.classificationType,
    this.classificationDetails,
    this.createdAt,
    this.updatedAt,
  });

  factory Classification.fromJson(Map<String, dynamic> json) {
    return Classification(
      id: json['id'],
      localId: json['local_id'] ?? '',
      classificationType: json['classification_type'] ?? '',
      classificationDetails: json['classification_details'],
      createdAt: json['created_at'],
      updatedAt: json['updated_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'local_id': localId,
      'classification_type': classificationType,
      'classification_details': classificationDetails,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  Map<String, dynamic> toApiJson(String serverResidentId) {
    return {
      'residentId': serverResidentId,
      'classificationType': classificationType,
      'classificationDetails': _formatClassificationDetails(classificationDetails),
    };
  }

  /// Format classification details for API
  /// Handles special case where details field contains {"details": "hhhh | value 1"}
  /// and extracts only the value part for API submission
  String _formatClassificationDetails(String? details) {
    if (details == null || details.isEmpty) {
      return '';
    }

    try {
      // Check if it's JSON (dynamic fields) or plain text
      if (details.startsWith('{') || details.startsWith('[')) {
        // Parse JSON and extract values
        final dynamicFields = jsonDecode(details) as Map<String, dynamic>;
        if (dynamicFields.isEmpty) {
          return '';
        }
        
        // Special handling for {"details": "hhhh | value 1"} format
        if (dynamicFields.containsKey('details') && dynamicFields['details'] is String) {
          final detailsValue = dynamicFields['details'] as String;
          // Extract only the value part after " | "
          if (detailsValue.contains(' | ')) {
            final parts = detailsValue.split(' | ');
            if (parts.length > 1) {
              // Return only the value part (everything after the first " | ")
              return parts.sublist(1).join(' | ');
            }
          }
          // If no " | " found, return the whole details value
          return detailsValue;
        }
        
        // For other JSON formats, extract only the values (not the keys) and join with " | "
        final values = dynamicFields.values
            .where((value) => value != null && value.toString().isNotEmpty)
            .map((value) => value.toString())
            .toList();
            
        return values.join(' | ');
      } else {
        // Return plain text as is
        return details;
      }
    } catch (e) {
      // If JSON parsing fails, return the original string
      return details;
    }
  }
}
