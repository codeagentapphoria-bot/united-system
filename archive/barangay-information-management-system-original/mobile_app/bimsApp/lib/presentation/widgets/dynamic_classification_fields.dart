import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_icons.dart';

class DynamicClassificationFields extends StatefulWidget {
  final List<Map<String, dynamic>> details;
  final Map<String, dynamic>? initialValues;
  final Function(Map<String, dynamic>) onValuesChanged;

  const DynamicClassificationFields({
    super.key,
    required this.details,
    this.initialValues,
    required this.onValuesChanged,
  });

  @override
  State<DynamicClassificationFields> createState() => _DynamicClassificationFieldsState();
}

class _DynamicClassificationFieldsState extends State<DynamicClassificationFields> {
  final Map<String, dynamic> _fieldValues = {};
  final Map<String, TextEditingController> _textControllers = {};
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _initializeFields();
  }

  void _initializeFields() {
    try {
      // Initialize with existing values if provided
      if (widget.initialValues != null) {
        _fieldValues.addAll(widget.initialValues!);
      }
      
      // Initialize text controllers for text fields with existing values
      for (final detail in widget.details) {
        final key = detail['key']?.toString();
        final type = detail['type']?.toString() ?? 'text';
        
        if (key != null && type == 'text') {
          final value = _fieldValues[key]?.toString() ?? '';
          _textControllers[key] = TextEditingController(text: value);
        }
      }
    } catch (e) {
      debugPrint('Error initializing dynamic fields: $e');
    }
  }

  @override
  void didUpdateWidget(DynamicClassificationFields oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Only reinitialize if details changed
    if (oldWidget.details != widget.details) {
      // Dispose old controllers
      for (final controller in _textControllers.values) {
        controller.dispose();
      }
      _textControllers.clear();
      _fieldValues.clear();
      _initializeFields();
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    // Dispose all text controllers
    for (final controller in _textControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _updateFieldValue(String key, dynamic value) {
    setState(() {
      _fieldValues[key] = value;
    });
    
    // Cancel previous timer
    _debounceTimer?.cancel();
    
    // Debounce the callback to prevent excessive updates
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      if (mounted) {
        widget.onValuesChanged(Map<String, dynamic>.from(_fieldValues));
      }
    });
  }

  Widget _buildTextField(Map<String, dynamic> field) {
    try {
      final key = field['key']?.toString() ?? 'field_${DateTime.now().millisecondsSinceEpoch}';
      final label = field['label']?.toString() ?? 'Text Field';

      // Ensure controller exists (should be created in initState)
      if (!_textControllers.containsKey(key)) {
        final currentValue = _fieldValues[key]?.toString() ?? '';
        _textControllers[key] = TextEditingController(text: currentValue);
      }

      return Padding(
        padding: const EdgeInsets.only(bottom: 16.0),
        child: TextFormField(
          key: ValueKey('text_$key'),
          controller: _textControllers[key],
          decoration: InputDecoration(
            labelText: label,
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(AppIcons.edit),
          ),
          onChanged: (value) => _updateFieldValue(key, value),
        ),
      );
    } catch (e) {
      debugPrint('Error building text field: $e');
      return const SizedBox.shrink();
    }
  }

  Widget _buildDropdownField(Map<String, dynamic> field) {
    try {
      final key = field['key']?.toString() ?? 'field_${DateTime.now().millisecondsSinceEpoch}';
      final label = field['label']?.toString() ?? 'Dropdown Field';
      final options = field['options'] as List<dynamic>? ?? [];
      final currentValue = _fieldValues[key];

      return Padding(
        padding: const EdgeInsets.only(bottom: 16.0),
        child: DropdownButtonFormField<String>(
          key: ValueKey('dropdown_$key'),
          value: currentValue,
          decoration: InputDecoration(
            labelText: label,
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.arrow_drop_down),
          ),
          items: [
            const DropdownMenuItem<String>(
              value: null,
              child: Text('Select an option...'),
            ),
            ...options.map((option) {
              // Handle both string and map options
              if (option is String) {
                return DropdownMenuItem<String>(
                  value: option,
                  child: Text(option),
                );
              } else if (option is Map<String, dynamic>) {
                return DropdownMenuItem<String>(
                  value: option['value'] as String,
                  child: Text(option['label'] as String),
                );
              } else {
                // Fallback for unexpected types
                return DropdownMenuItem<String>(
                  value: option.toString(),
                  child: Text(option.toString()),
                );
              }
            }),
          ],
          onChanged: (value) => _updateFieldValue(key, value),
        ),
      );
    } catch (e) {
      debugPrint('Error building dropdown field: $e');
      return const SizedBox.shrink();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.details.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.primary.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              const Icon(AppIcons.edit, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Additional Information Required',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Dynamic fields
        ...widget.details.map((field) {
          try {
            final type = field['type']?.toString() ?? 'text';
            
            switch (type) {
              case 'text':
                return _buildTextField(field);
              case 'select':
                return _buildDropdownField(field);
              default:
                debugPrint('Unknown field type: $type');
                return const SizedBox.shrink();
            }
          } catch (e) {
            debugPrint('Error building field: $e');
            return const SizedBox.shrink();
          }
        }).toList(),
      ],
    );
  }
}
