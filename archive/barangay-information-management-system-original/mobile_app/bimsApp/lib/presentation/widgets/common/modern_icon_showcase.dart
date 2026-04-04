import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_icons.dart';

class ModernIconShowcase extends StatelessWidget {
  const ModernIconShowcase({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Modern Icon System',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.foreground,
          ),
        ),
        const SizedBox(height: 16),
        
        // Navigation Icons
        _buildIconSection('Navigation', [
          {'icon': AppIcons.home, 'label': 'Home', 'color': AppColors.primary},
          {'icon': AppIcons.users, 'label': 'Users', 'color': AppColors.secondary},
          {'icon': AppIcons.building, 'label': 'Building', 'color': AppColors.accent},
          {'icon': AppIcons.mapPin, 'label': 'Location', 'color': AppColors.success},
          {'icon': AppIcons.menu, 'label': 'Menu', 'color': AppColors.warning},
          {'icon': AppIcons.settings, 'label': 'Settings', 'color': AppColors.destructive},
        ]),
        
        const SizedBox(height: 24),
        
        // Action Icons
        _buildIconSection('Actions', [
          {'icon': AppIcons.plus, 'label': 'Add', 'color': AppColors.primary},
          {'icon': AppIcons.edit, 'label': 'Edit', 'color': AppColors.secondary},
          {'icon': AppIcons.delete, 'label': 'Delete', 'color': AppColors.destructive},
          {'icon': AppIcons.search, 'label': 'Search', 'color': AppColors.accent},
          {'icon': AppIcons.filter, 'label': 'Filter', 'color': AppColors.success},
          {'icon': AppIcons.download, 'label': 'Download', 'color': AppColors.warning},
        ]),
        
        const SizedBox(height: 24),
        
        // Status Icons
        _buildIconSection('Status', [
          {'icon': AppIcons.checkCircle, 'label': 'Success', 'color': AppColors.success},
          {'icon': AppIcons.clock, 'label': 'Pending', 'color': AppColors.warning},
          {'icon': AppIcons.alertCircle, 'label': 'Warning', 'color': AppColors.warning},
          {'icon': AppIcons.close, 'label': 'Close', 'color': AppColors.destructive},
          {'icon': AppIcons.refresh, 'label': 'Refresh', 'color': AppColors.primary},
          {'icon': AppIcons.activity, 'label': 'Activity', 'color': AppColors.accent},
        ]),
        
        const SizedBox(height: 24),
        
        // Communication Icons
        _buildIconSection('Communication', [
          {'icon': AppIcons.message, 'label': 'Message', 'color': AppColors.primary},
          {'icon': AppIcons.mail, 'label': 'Email', 'color': AppColors.secondary},
          {'icon': AppIcons.phone, 'label': 'Phone', 'color': AppColors.accent},
          {'icon': AppIcons.notification, 'label': 'Notification', 'color': AppColors.warning},
          {'icon': AppIcons.share, 'label': 'Share', 'color': AppColors.success},
          {'icon': AppIcons.bookmark, 'label': 'Bookmark', 'color': AppColors.info},
        ]),
        
        const SizedBox(height: 24),
        
        // Utility Icons
        _buildIconSection('Utilities', [
          {'icon': AppIcons.calendar, 'label': 'Calendar', 'color': AppColors.primary},
          {'icon': AppIcons.time, 'label': 'Time', 'color': AppColors.secondary},
          {'icon': AppIcons.location, 'label': 'GPS', 'color': AppColors.accent},
          {'icon': AppIcons.wifi, 'label': 'WiFi', 'color': AppColors.success},
          {'icon': AppIcons.battery, 'label': 'Battery', 'color': AppColors.warning},
          {'icon': AppIcons.sync, 'label': 'Sync', 'color': AppColors.info},
        ]),
      ],
    );
  }

  Widget _buildIconSection(String title, List<Map<String, dynamic>> icons) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.foreground,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 20,
          runSpacing: 16,
          children: icons.map((iconData) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: (iconData['color'] as Color).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: (iconData['color'] as Color).withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    iconData['icon'] as IconData,
                    size: 24,
                    color: iconData['color'] as Color,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  iconData['label'] as String,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.mutedForeground,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ],
    );
  }
}



