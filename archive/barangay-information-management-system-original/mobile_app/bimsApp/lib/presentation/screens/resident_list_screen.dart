import 'package:flutter/material.dart';
import '../../data/models/resident.dart';
import '../../core/services/database_service.dart';
import '../../widgets/image_avatar_widget.dart';
import 'add_resident_screen.dart';
import 'resident_json_view_screen.dart';

class ResidentListScreen extends StatefulWidget {
  const ResidentListScreen({super.key});

  @override
  State<ResidentListScreen> createState() => _ResidentListScreenState();
}

class _ResidentListScreenState extends State<ResidentListScreen> {
  final DatabaseService _databaseService = DatabaseService();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  
  List<Resident> _residents = [];
  bool _isLoading = false;
  bool _hasMoreData = true;
  int _currentOffset = 0;
  final int _pageSize = 20;
  String? _statusFilter;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadResidents();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMoreResidents();
    }
  }

  Future<void> _loadResidents({bool refresh = false}) async {
    if (_isLoading) return;
    
    setState(() {
      _isLoading = true;
      if (refresh) {
        _residents.clear();
        _currentOffset = 0;
        _hasMoreData = true;
      }
    });

    try {
      if (!_databaseService.isInitialized) {
        await _databaseService.initialize();
      }

      final newResidents = await _databaseService.residentRepository.getPaginated(
        limit: _pageSize,
        offset: _currentOffset,
        searchQuery: _searchQuery.isNotEmpty ? _searchQuery : null,
        statusFilter: _statusFilter,
      );

      setState(() {
        if (refresh) {
          _residents = newResidents;
        } else {
          _residents.addAll(newResidents);
        }
        _currentOffset += _pageSize;
        _hasMoreData = newResidents.length == _pageSize;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showErrorSnackBar('Error loading residents: $e');
    }
  }

  Future<void> _loadMoreResidents() async {
    if (!_hasMoreData || _isLoading) return;
    await _loadResidents();
  }

  Future<void> _refreshResidents() async {
    await _loadResidents(refresh: true);
  }

  void _onSearchChanged(String query) {
    setState(() {
      _searchQuery = query;
    });
    _loadResidents(refresh: true);
  }

  void _onStatusFilterChanged(String? status) {
    setState(() {
      _statusFilter = status;
    });
    _loadResidents(refresh: true);
  }

  Future<void> _deleteResident(Resident resident) async {
    final confirmed = await _showDeleteConfirmation(resident);
    if (!confirmed) return;

    try {
      final success = await _databaseService.residentRepository.delete(resident.id ?? '');
      if (success) {
        setState(() {
          _residents.removeWhere((r) => r.id == resident.id);
        });
        _showSuccessSnackBar('Resident deleted successfully');
      } else {
        _showErrorSnackBar('Failed to delete resident');
      }
    } catch (e) {
      _showErrorSnackBar('Error deleting resident: $e');
    }
  }

  Future<void> _updateResident(Resident resident) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AddResidentScreen(
          residentToEdit: resident,
        ),
      ),
    );

    if (result == true) {
      _refreshResidents();
    }
  }

  void _viewResidentJson(Resident resident) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ResidentJsonViewScreen(
          resident: resident,
        ),
      ),
    );
  }

  Future<bool> _showDeleteConfirmation(Resident resident) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Resident'),
        content: Text('Are you sure you want to delete ${resident.fullName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    ) ?? false;
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Residents'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshResidents,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search and Filter Section
          Container(
            padding: const EdgeInsets.all(16.0),
            color: Colors.grey[100],
            child: Column(
              children: [
                // Search Bar
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search residents...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              _onSearchChanged('');
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8.0),
                    ),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  onChanged: _onSearchChanged,
                ),
                const SizedBox(height: 12),
                // Status Filter
                Row(
                  children: [
                    const Text('Filter by status: '),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _statusFilter,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        items: const [
                          DropdownMenuItem(value: null, child: Text('All')),
                          DropdownMenuItem(value: 'active', child: Text('Active')),
                          DropdownMenuItem(value: 'temporarily_away', child: Text('Temporarily Away')),
                          DropdownMenuItem(value: 'deceased', child: Text('Deceased')),
                          DropdownMenuItem(value: 'moved_out', child: Text('Moved Out')),
                        ],
                        onChanged: _onStatusFilterChanged,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Residents List
          Expanded(
            child: _residents.isEmpty && !_isLoading
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.people_outline, size: 64, color: Colors.grey),
                        SizedBox(height: 16),
                        Text(
                          'No residents found',
                          style: TextStyle(fontSize: 18, color: Colors.grey),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Add your first resident using the + button',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _refreshResidents,
                    child: ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(16.0),
                      itemCount: _residents.length + (_hasMoreData ? 1 : 0),
                      itemBuilder: (context, index) {
                        if (index == _residents.length) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16.0),
                              child: CircularProgressIndicator(),
                            ),
                          );
                        }

                        final resident = _residents[index];
                        return _buildResidentCard(resident);
                      },
                    ),
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const AddResidentScreen(),
            ),
          );
          if (result == true) {
            _refreshResidents();
          }
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildResidentCard(Resident resident) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12.0),
      elevation: 2,
      child: InkWell(
        onTap: () => _viewResidentJson(resident),
        borderRadius: BorderRadius.circular(8.0),
        child: ListTile(
          contentPadding: const EdgeInsets.all(16.0),
          leading: ResidentAvatarWidget(
            imagePath: resident.picturePath,
            name: resident.fullName,
            size: 48,
          ),
          title: Text(
            resident.fullName,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text('${resident.sex} • ${resident.civilStatus}'),
              Text('Status: ${_formatStatus(resident.residentStatus)}'),
            ],
          ),
          trailing: PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'edit':
                  _updateResident(resident);
                  break;
                case 'delete':
                  _deleteResident(resident);
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit, color: Colors.blue),
                    SizedBox(width: 8),
                    Text('Edit'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Delete'),
                  ],
                ),
              ),
            ],
          ),
          isThreeLine: true,
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'active':
        return Colors.green;
      case 'temporarily_away':
        return Colors.orange;
      case 'deceased':
        return Colors.red;
      case 'moved_out':
        return Colors.grey;
      default:
        return Colors.blue;
    }
  }

  String _formatStatus(String status) {
    switch (status) {
      case 'active':
        return 'Active';
      case 'temporarily_away':
        return 'Temporarily Away';
      case 'deceased':
        return 'Deceased';
      case 'moved_out':
        return 'Moved Out';
      default:
        return status;
    }
  }
}
