import 'package:flutter/material.dart';
import 'dart:io';

class ImageAvatarWidget extends StatelessWidget {
  final String? imagePath;
  final String name;
  final double size;
  final Color? backgroundColor;
  final Color? textColor;
  final IconData? fallbackIcon;

  const ImageAvatarWidget({
    super.key,
    this.imagePath,
    required this.name,
    this.size = 50.0,
    this.backgroundColor,
    this.textColor,
    this.fallbackIcon,
  });

  @override
  Widget build(BuildContext context) {
    // If image path exists and file exists, show image
    if (imagePath != null && imagePath!.isNotEmpty) {
      return FutureBuilder<bool>(
        future: _checkImageExists(),
        builder: (context, snapshot) {
          if (snapshot.hasData && snapshot.data == true) {
            return Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(size / 2),
                border: Border.all(
                  color: Colors.grey.withOpacity(0.3),
                  width: 1,
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(size / 2),
                child: Image.file(
                  File(imagePath!),
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return _buildLetterAvatar();
                  },
                ),
              ),
            );
          } else {
            return _buildLetterAvatar();
          }
        },
      );
    } else {
      return _buildLetterAvatar();
    }
  }

  Future<bool> _checkImageExists() async {
    try {
      if (imagePath == null || imagePath!.isEmpty) return false;
      final file = File(imagePath!);
      return await file.exists();
    } catch (e) {
      return false;
    }
  }

  Widget _buildLetterAvatar() {
    // Get initials from name
    final initials = _getInitials(name);
    
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: backgroundColor ?? _getColorFromName(name),
        borderRadius: BorderRadius.circular(size / 2),
        border: Border.all(
          color: Colors.grey.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Center(
        child: fallbackIcon != null
            ? Icon(
                fallbackIcon,
                size: size * 0.5,
                color: textColor ?? Colors.white,
              )
            : Text(
                initials,
                style: TextStyle(
                  color: textColor ?? Colors.white,
                  fontSize: size * 0.4,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
    );
  }

  String _getInitials(String name) {
    if (name.isEmpty) return '?';
    
    final words = name.trim().split(' ');
    if (words.length == 1) {
      return words[0].substring(0, 1).toUpperCase();
    } else {
      return (words[0].substring(0, 1) + words[1].substring(0, 1)).toUpperCase();
    }
  }

  Color _getColorFromName(String name) {
    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.teal,
      Colors.indigo,
      Colors.pink,
      Colors.amber,
      Colors.cyan,
      Colors.lime,
    ];
    
    final hash = name.hashCode;
    return colors[hash.abs() % colors.length];
  }
}

// Specialized widgets for different types
class ResidentAvatarWidget extends StatelessWidget {
  final String? imagePath;
  final String name;
  final double size;

  const ResidentAvatarWidget({
    super.key,
    this.imagePath,
    required this.name,
    this.size = 50.0,
  });

  @override
  Widget build(BuildContext context) {
    return ImageAvatarWidget(
      imagePath: imagePath,
      name: name,
      size: size,
      fallbackIcon: Icons.person,
    );
  }
}

class HouseholdAvatarWidget extends StatelessWidget {
  final String? imagePath;
  final String name;
  final double size;

  const HouseholdAvatarWidget({
    super.key,
    this.imagePath,
    required this.name,
    this.size = 50.0,
  });

  @override
  Widget build(BuildContext context) {
    return ImageAvatarWidget(
      imagePath: imagePath,
      name: name,
      size: size,
      fallbackIcon: Icons.home,
    );
  }
}

class PetAvatarWidget extends StatelessWidget {
  final String? imagePath;
  final String name;
  final double size;

  const PetAvatarWidget({
    super.key,
    this.imagePath,
    required this.name,
    this.size = 50.0,
  });

  @override
  Widget build(BuildContext context) {
    return ImageAvatarWidget(
      imagePath: imagePath,
      name: name,
      size: size,
      fallbackIcon: Icons.pets,
    );
  }
}
