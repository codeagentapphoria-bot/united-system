import 'package:flutter/material.dart';
import 'package:flutter_tabler_icons/flutter_tabler_icons.dart';
import 'app_colors.dart';

class AppIcons {
  // Icon Sizes (following Material Design guidelines)
  static const double xs = 12.0;   // Extra small - Labels, badges
  static const double sm = 16.0;   // Small - Buttons, inline
  static const double md = 20.0;   // Medium - Navigation, cards
  static const double lg = 24.0;   // Large - Headers, prominent
  static const double xl = 32.0;   // Extra large - Hero sections
  static const double xxl = 48.0;  // 2X large - Large displays
  
  // Icon Colors (matching design system)
  static Color get primary => AppColors.primary;
  static Color get secondary => AppColors.mutedForeground;
  static Color get accent => AppColors.accent;
  static Color get success => AppColors.success;
  static Color get warning => AppColors.warning;
  static Color get error => AppColors.destructive;
  static Color get info => AppColors.info;
  static Color get muted => AppColors.mutedForeground;
  
  // Icon Categories (matching web application)
  // Navigation & Structure
  static const IconData home = TablerIcons.home;
  static const IconData users = TablerIcons.users;
  static const IconData building = TablerIcons.building;
  static const IconData mapPin = TablerIcons.map_pin;
  static const IconData fileText = TablerIcons.file_text;
  static const IconData package = TablerIcons.package;
  static const IconData settings = TablerIcons.settings;
  
  // Actions & Operations
  static const IconData plus = TablerIcons.plus;
  static const IconData edit = TablerIcons.edit;
  static const IconData delete = TablerIcons.trash;
  static const IconData view = TablerIcons.eye;
  static const IconData search = TablerIcons.search;
  static const IconData filter = TablerIcons.filter;
  static const IconData download = TablerIcons.download;
  static const IconData upload = TablerIcons.upload;
  
  // Status & Feedback
  static const IconData checkCircle = TablerIcons.check;
  static const IconData alertCircle = TablerIcons.alert_circle;
  static const IconData close = TablerIcons.x;
  static const IconData clock = TablerIcons.clock;
  static const IconData activity = TablerIcons.activity;
  static const IconData refresh = TablerIcons.refresh;
  
  // Data & Analytics
  static const IconData barChart = TablerIcons.chart_bar;
  static const IconData pieChart = TablerIcons.chart_pie;
  static const IconData trendingUp = TablerIcons.trending_up;
  static const IconData statistics = TablerIcons.chart_line;
  
  // Communication
  static const IconData message = TablerIcons.message;
  static const IconData mail = TablerIcons.mail;
  static const IconData phone = TablerIcons.phone;
  static const IconData globe = TablerIcons.world;
  
  // BIMS Specific Icons
  static const IconData barangay = TablerIcons.building_community;
  static const IconData municipality = TablerIcons.building_bank;
  static const IconData resident = TablerIcons.user;
  static const IconData household = TablerIcons.home_2;
  static const IconData pet = TablerIcons.paw;
  static const IconData qrCode = TablerIcons.qrcode;
  static const IconData camera = TablerIcons.camera;
  static const IconData map = TablerIcons.map;
  
  // Additional Modern Icons
  static const IconData notification = TablerIcons.bell;
  static const IconData menu = TablerIcons.menu_2;
  static const IconData arrowBack = TablerIcons.arrow_left;
  static const IconData arrowForward = TablerIcons.arrow_right;
  static const IconData arrowUp = TablerIcons.arrow_up;
  static const IconData arrowDown = TablerIcons.arrow_down;
  static const IconData calendar = TablerIcons.calendar;
  static const IconData time = TablerIcons.clock;
  static const IconData location = TablerIcons.map_pin;
  static const IconData star = TablerIcons.star;
  static const IconData heart = TablerIcons.heart;
  static const IconData share = TablerIcons.share;
  static const IconData bookmark = TablerIcons.bookmark;
  static const IconData lock = TablerIcons.lock;
  static const IconData unlock = TablerIcons.lock_open;
  static const IconData visibility = TablerIcons.eye;
  static const IconData visibilityOff = TablerIcons.eye_off;
  static const IconData check = TablerIcons.check;
  static const IconData addCircle = TablerIcons.circle_plus;
  static const IconData removeCircle = TablerIcons.circle_minus;
  static const IconData help = TablerIcons.help;
  static const IconData exit = TablerIcons.logout;
  static const IconData sync = TablerIcons.refresh;
  static const IconData wifi = TablerIcons.wifi;
  static const IconData battery = TablerIcons.battery;
  static const IconData signal = TablerIcons.wifi;
}

// Icon Widget Factory for consistent icon creation
class IconFactory {
  static Widget createIcon({
    required IconData icon,
    double size = AppIcons.md,
    Color? color,
    String? semanticLabel,
  }) {
    return Icon(
      icon,
      size: size,
      color: color,
      semanticLabel: semanticLabel,
    );
  }
  
  static Widget createIconWithLabel({
    required IconData icon,
    required String label,
    double size = AppIcons.md,
    Color? color,
    bool isVertical = false,
    TextStyle? labelStyle,
  }) {
    if (isVertical) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: size, color: color),
          const SizedBox(height: 4),
          Text(
            label,
            style: labelStyle ?? TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    } else {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: size, color: color),
          const SizedBox(width: 8),
          Text(
            label,
            style: labelStyle ?? TextStyle(
              fontSize: 14,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    }
  }
  
  static Widget createCircularIcon({
    required IconData icon,
    double size = AppIcons.md,
    Color? backgroundColor,
    Color? iconColor,
    double padding = 8.0,
  }) {
    return Container(
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: backgroundColor ?? AppColors.primary.withValues(alpha: 0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(
        icon,
        size: size,
        color: iconColor ?? AppColors.primary,
      ),
    );
  }
}

// Status Icon Widget for consistent status representation
class StatusIcon extends StatelessWidget {
  final String status;
  final double size;
  final bool showLabel;
  final TextStyle? labelStyle;

  const StatusIcon({
    super.key,
    required this.status,
    this.size = AppIcons.md,
    this.showLabel = false,
    this.labelStyle,
  });

  @override
  Widget build(BuildContext context) {
    IconData iconData;
    Color color;
    String label;

    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'approved':
        iconData = AppIcons.checkCircle;
        color = AppColors.success;
        label = 'Completed';
        break;
      case 'pending':
      case 'in_progress':
      case 'processing':
        iconData = AppIcons.clock;
        color = AppColors.warning;
        label = 'Pending';
        break;
      case 'error':
      case 'failed':
      case 'rejected':
        iconData = AppIcons.alertCircle;
        color = AppColors.destructive;
        label = 'Error';
        break;
      case 'info':
      case 'information':
        iconData = Icons.info_outline_rounded;
        color = AppColors.info;
        label = 'Info';
        break;
      default:
        iconData = Icons.info_outline_rounded;
        color = AppColors.mutedForeground;
        label = 'Info';
    }

    if (showLabel) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(iconData, size: size, color: color),
          const SizedBox(width: 8),
          Text(
            label,
            style: labelStyle ?? TextStyle(
              color: color,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    }

    return Icon(iconData, size: size, color: color);
  }
}
