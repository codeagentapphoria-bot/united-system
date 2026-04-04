import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../core/config/api_config.dart';

class ApiTestScreen extends StatefulWidget {
  const ApiTestScreen({Key? key}) : super(key: key);

  @override
  _ApiTestScreenState createState() => _ApiTestScreenState();
}

class _ApiTestScreenState extends State<ApiTestScreen> {
  String _testResults = 'Ready to test...';
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('API Test'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'API Endpoint Tests',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('Base URL: ${ApiConfig.baseUrl}'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _testHealthEndpoint,
                      child: const Text('Test Health Endpoint'),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _testGisEndpoint,
                      child: const Text('Test GIS Endpoint'),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: _isLoading ? null : _testBarangayDetails,
                      child: const Text('Test Barangay Details'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Test Results',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Expanded(
                        child: SingleChildScrollView(
                          child: Text(
                            _testResults,
                            style: const TextStyle(fontFamily: 'monospace'),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _testHealthEndpoint() async {
    setState(() {
      _isLoading = true;
      _testResults = 'Testing health endpoint...\n';
    });

    try {
      final response = await http.get(Uri.parse('${ApiConfig.baseUrl.replaceAll('/api', '')}/health'));
      setState(() {
        _testResults += 'Health Endpoint Test:\n';
        _testResults += 'Status: ${response.statusCode}\n';
        _testResults += 'Body: ${response.body}\n\n';
      });
    } catch (e) {
      setState(() {
        _testResults += 'Health Endpoint Error: $e\n\n';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _testGisEndpoint() async {
    setState(() {
      _isLoading = true;
      _testResults += 'Testing GIS endpoint...\n';
    });

    try {
      final url = '${ApiConfig.baseUrl}/gis/public/geojson/barangays/1';
      _testResults += 'URL: $url\n';
      
      final response = await http.get(Uri.parse(url));
      setState(() {
        _testResults += 'GIS Endpoint Test:\n';
        _testResults += 'Status: ${response.statusCode}\n';
        _testResults += 'Headers: ${response.headers}\n';
        _testResults += 'Body: ${response.body}\n\n';
      });
    } catch (e) {
      setState(() {
        _testResults += 'GIS Endpoint Error: $e\n\n';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _testBarangayDetails() async {
    setState(() {
      _isLoading = true;
      _testResults += 'Testing barangay details endpoint...\n';
    });

    try {
      final url = '${ApiConfig.baseUrl}/barangays/details';
      _testResults += 'URL: $url\n';
      
      final response = await http.get(Uri.parse(url));
      setState(() {
        _testResults += 'Barangay Details Test:\n';
        _testResults += 'Status: ${response.statusCode}\n';
        _testResults += 'Body: ${response.body}\n\n';
      });
    } catch (e) {
      setState(() {
        _testResults += 'Barangay Details Error: $e\n\n';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
}
