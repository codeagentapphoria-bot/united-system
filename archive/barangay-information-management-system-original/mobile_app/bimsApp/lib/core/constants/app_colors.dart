import 'package:flutter/material.dart';

class AppColors {
  // Primary Colors (HSL converted from web design system)
  static const Color primary = Color(0xFF3B82F6);           // hsl(220 90% 56%)
  static const Color primaryHover = Color(0xFF1D4ED8);     // hsl(220 90% 46%)
  static const Color primaryForeground = Color(0xFFFFFFFF); // White
  
  // Secondary Colors
  static const Color secondary = Color(0xFFE5E7EB);         // hsl(210 20% 92%)
  static const Color secondaryForeground = Color(0xFF374151); // hsl(220 15% 25%)
  
  // Accent Colors
  static const Color accent = Color(0xFFF59E0B);            // hsl(35 85% 55%)
  static const Color accentForeground = Color(0xFFFFFFFF);  // White
  
  // Semantic Colors
  static const Color success = Color(0xFF22C55E);           // hsl(140 70% 45%)
  static const Color successForeground = Color(0xFFFFFFFF); // White
  static const Color warning = Color(0xFFF59E0B);           // hsl(45 90% 55%)
  static const Color warningForeground = Color(0xFFFFFFFF); // White
  static const Color destructive = Color(0xFFEF4444);       // hsl(0 85% 60%)
  static const Color destructiveForeground = Color(0xFFFFFFFF); // White
  static const Color info = Color(0xFF0284C7);              // hsl(200 100% 35%)
  
  // Background & Surface Colors
  static const Color background = Color(0xFFF8FAFC);        // hsl(220 20% 97%)
  static const Color foreground = Color(0xFF1E293B);        // hsl(220 15% 15%)
  static const Color card = Color(0xFFFFFFFF);              // Pure white
  static const Color cardForeground = Color(0xFF1E293B);    // Dark text
  
  // Muted Colors
  static const Color muted = Color(0xFFF1F5F9);             // hsl(210 20% 95%)
  static const Color mutedForeground = Color(0xFF64748B);   // hsl(220 10% 50%)
  
  // Border & Input Colors
  static const Color border = Color(0xFFE2E8F0);            // hsl(220 15% 88%)
  static const Color input = Color(0xFFE2E8F0);             // Input field borders
  static const Color ring = Color(0xFF3B82F6);              // Focus ring (same as primary)
  
  // Sidebar Colors
  static const Color sidebarBackground = Color(0xFFFAFAFA); // hsl(0 0% 98%)
  static const Color sidebarForeground = Color(0xFF404040); // hsl(240 5.3% 26.1%)
  static const Color sidebarPrimary = Color(0xFF171717);    // hsl(240 5.9% 10%)
  static const Color sidebarPrimaryForeground = Color(0xFFFAFAFA); // hsl(0 0% 98%)
  static const Color sidebarAccent = Color(0xFFF5F5F5);    // hsl(240 4.8% 95.9%)
  static const Color sidebarAccentForeground = Color(0xFF171717); // hsl(240 5.9% 10%)
  static const Color sidebarBorder = Color(0xFFE8E8E8);    // hsl(220 13% 91%)
  static const Color sidebarRing = Color(0xFF3B82F6);      // hsl(217.2 91.2% 59.8%)
  
  // Chart Colors (for data visualization)
  static const Color chartPrimary = Color(0xFF3B82F6);     // Blue
  static const Color chartSecondary = Color(0xFF10B981);   // Green
  static const Color chartAccent = Color(0xFF8B5CF6);      // Purple
  static const Color chartWarning = Color(0xFFF59E0B);     // Orange
  static const Color chartDanger = Color(0xFFEF4444);      // Red
  static const Color chartSuccess = Color(0xFF22C55E);     // Green
  static const Color chartInfo = Color(0xFF06B6D4);        // Cyan
  
  // Legacy Colors (keeping for backward compatibility)
  static const Color primaryDark = Color(0xFF1D4ED8);      // Same as primaryHover
  static const Color primaryLight = Color(0xFF60A5FA);     // Lighter primary
  static const Color secondaryDark = Color(0xFF9CA3AF);    // Darker secondary
  static const Color secondaryLight = Color(0xFFF3F4F6);   // Lighter secondary
  static const Color accentDark = Color(0xFFD97706);        // Darker accent
  static const Color accentLight = Color(0xFFFCD34D);      // Lighter accent
  
  // Status Colors (updated to match design system)
  static const Color error = destructive;                   // Alias for destructive
  static const Color surface = card;                        // Alias for card
  
  // Neutral Colors (updated to match design system)
  static const Color textPrimary = foreground;              // Alias for foreground
  static const Color textSecondary = mutedForeground;       // Alias for mutedForeground
  static const Color divider = border;                      // Alias for border
  
  // Custom Colors for BIMS (updated to match design system)
  static const Color barangayGreen = success;               // Use success color
  static const Color municipalityBlue = primary;            // Use primary color
  static const Color residentOrange = accent;               // Use accent color
  static const Color householdPurple = chartAccent;         // Use chart accent color
}
