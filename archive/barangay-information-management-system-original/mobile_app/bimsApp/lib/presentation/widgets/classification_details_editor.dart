import 'package:flutter/material.dart';

class ClassificationDetailsEditor extends StatefulWidget {
  final List<Map<String, dynamic>> details;
  final Function(List<Map<String, dynamic>>) onChanged;

  const ClassificationDetailsEditor({
    super.key,
    required this.details,
    required this.onChanged,
  });

  @override
  State<ClassificationDetailsEditor> createState() => _ClassificationDetailsEditorState();
}

class _ClassificationDetailsEditorState extends State<ClassificationDetailsEditor> {
  late List<Map<String, dynamic>> _details;

  @override
  void initState() {
    super.initState();
    _details = List.from(widget.details);
  }

  void _addField() {
    setState(() {
      _details.add({
        'key': '',
        'label': '',
        'type': 'text',
        'options': [],
      });
    });
    widget.onChanged(_details);
  }

  void _removeField(int index) {
    setState(() {
      _details.removeAt(index);
    });
    widget.onChanged(_details);
  }

  void _updateField(int index, String field, dynamic value) {
    setState(() {
      _details[index][field] = value;
    });
    widget.onChanged(_details);
  }

  void _addOption(int fieldIndex) {
    setState(() {
      final options = List<Map<String, dynamic>>.from(_details[fieldIndex]['options'] ?? []);
      options.add({'value': '', 'label': ''});
      _details[fieldIndex]['options'] = options;
    });
    widget.onChanged(_details);
  }

  void _removeOption(int fieldIndex, int optionIndex) {
    setState(() {
      final options = List<Map<String, dynamic>>.from(_details[fieldIndex]['options']);
      options.removeAt(optionIndex);
      _details[fieldIndex]['options'] = options;
    });
    widget.onChanged(_details);
  }

  void _updateOption(int fieldIndex, int optionIndex, String field, String value) {
    setState(() {
      final options = List<Map<String, dynamic>>.from(_details[fieldIndex]['options']);
      options[optionIndex][field] = value;
      _details[fieldIndex]['options'] = options;
    });
    widget.onChanged(_details);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Expanded(
              child: Text(
                'Custom Form Fields',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            SizedBox(
              height: 32,
              child: OutlinedButton.icon(
                onPressed: _addField,
                icon: const Icon(Icons.add, size: 14),
                label: const Text('Add Field', style: TextStyle(fontSize: 12)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  minimumSize: const Size(0, 32),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        const Text(
          'Add custom fields that will appear when assigning this classification to residents',
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 16),
        
        if (_details.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid, width: 2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Column(
              children: [
                Text(
                  'No form fields added',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 14,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Add fields to customize the classification form',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _details.length,
            itemBuilder: (context, index) {
              final detail = _details[index];
              return _buildFieldCard(index, detail);
            },
          ),
      ],
    );
  }

  Widget _buildFieldCard(int index, Map<String, dynamic> detail) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Field ${index + 1}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                IconButton(
                  onPressed: () => _removeField(index),
                  icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Field Key
            TextFormField(
              initialValue: detail['key'],
              decoration: const InputDecoration(
                labelText: 'Field Key *',
                hintText: 'e.g., educationLevel',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              onChanged: (value) => _updateField(index, 'key', value),
            ),
            const SizedBox(height: 12),
            
            // Field Label
            TextFormField(
              initialValue: detail['label'],
              decoration: const InputDecoration(
                labelText: 'Field Label *',
                hintText: 'e.g., Education Level',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              onChanged: (value) => _updateField(index, 'label', value),
            ),
            const SizedBox(height: 12),
            
            // Field Type
            DropdownButtonFormField<String>(
              value: detail['type'] ?? 'text',
              decoration: const InputDecoration(
                labelText: 'Field Type *',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
              items: const [
                DropdownMenuItem(value: 'text', child: Text('Text Input')),
                DropdownMenuItem(value: 'select', child: Text('Dropdown')),
              ],
              onChanged: (value) {
                if (value != null) {
                  _updateField(index, 'type', value);
                  // Clear options when switching to text type
                  if (value == 'text') {
                    _updateField(index, 'options', []);
                  }
                }
              },
            ),
            
            // Options for Select type
            if (detail['type'] == 'select') ...[
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Dropdown Options',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => _addOption(index),
                    icon: const Icon(Icons.add, size: 14),
                    label: const Text('Add Option', style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: const Size(0, 32),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              ...() {
                final options = List<Map<String, dynamic>>.from(detail['options'] ?? []);
                if (options.isEmpty) {
                  return [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Column(
                        children: [
                          Text(
                            'No options added',
                            style: TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Add options for the dropdown',
                            style: TextStyle(color: Colors.grey, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ];
                }
                
                return options.asMap().entries.map((entry) {
                  final optionIndex = entry.key;
                  final option = entry.value;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            initialValue: option['value'],
                            decoration: const InputDecoration(
                              hintText: 'Value',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                            onChanged: (value) => _updateOption(index, optionIndex, 'value', value),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            initialValue: option['label'],
                            decoration: const InputDecoration(
                              hintText: 'Label',
                              border: OutlineInputBorder(),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            ),
                            onChanged: (value) => _updateOption(index, optionIndex, 'label', value),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          onPressed: () => _removeOption(index, optionIndex),
                          icon: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                  );
                }).toList();
              }(),
            ],
          ],
        ),
      ),
    );
  }
}

