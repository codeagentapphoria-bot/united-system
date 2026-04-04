import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_icons.dart';

class ModernIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final double size;
  final Color? backgroundColor;
  final Color? iconColor;
  final Color? borderColor;
  final double borderRadius;
  final EdgeInsetsGeometry? padding;
  final String? tooltip;
  final bool isOutlined;
  final bool isElevated;

  const ModernIconButton({
    super.key,
    required this.icon,
    this.onPressed,
    this.size = AppIcons.lg,
    this.backgroundColor,
    this.iconColor,
    this.borderColor,
    this.borderRadius = 12,
    this.padding,
    this.tooltip,
    this.isOutlined = false,
    this.isElevated = true,
  });

  @override
  Widget build(BuildContext context) {
    Widget button = Container(
      decoration: BoxDecoration(
        color: _getBackgroundColor(),
        borderRadius: BorderRadius.circular(borderRadius),
        border: _getBorder(),
        boxShadow: _getBoxShadow(),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(borderRadius),
          child: Padding(
            padding: padding ?? EdgeInsets.all(size * 0.3),
            child: Icon(
              icon,
              size: size,
              color: _getIconColor(),
            ),
          ),
        ),
      ),
    );

    if (tooltip != null) {
      button = Tooltip(
        message: tooltip!,
        child: button,
      );
    }

    return button;
  }

  Color _getBackgroundColor() {
    if (isOutlined) {
      return Colors.transparent;
    }
    return backgroundColor ?? AppColors.primary;
  }

  Color _getIconColor() {
    if (isOutlined) {
      return iconColor ?? AppColors.primary;
    }
    return iconColor ?? AppColors.primaryForeground;
  }

  Border? _getBorder() {
    if (isOutlined) {
      return Border.all(
        color: borderColor ?? AppColors.primary,
        width: 1.5,
      );
    }
    return null;
  }

  List<BoxShadow>? _getBoxShadow() {
    if (!isElevated) return null;
    
    if (isOutlined) {
      return [
        BoxShadow(
          color: (borderColor ?? AppColors.primary).withValues(alpha: 0.1),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];
    }
    
    return [
      BoxShadow(
        color: (backgroundColor ?? AppColors.primary).withValues(alpha: 0.3),
        blurRadius: 12,
        offset: const Offset(0, 4),
      ),
    ];
  }
}

// Modern Icon Button with Label
class ModernIconButtonWithLabel extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback? onPressed;
  final double iconSize;
  final Color? backgroundColor;
  final Color? iconColor;
  final Color? labelColor;
  final bool isVertical;
  final double spacing;

  const ModernIconButtonWithLabel({
    super.key,
    required this.icon,
    required this.label,
    this.onPressed,
    this.iconSize = AppIcons.md,
    this.backgroundColor,
    this.iconColor,
    this.labelColor,
    this.isVertical = false,
    this.spacing = 8,
  });

  @override
  Widget build(BuildContext context) {
    if (isVertical) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ModernIconButton(
            icon: icon,
            onPressed: onPressed,
            size: iconSize,
            backgroundColor: backgroundColor,
            iconColor: iconColor,
            padding: EdgeInsets.all(iconSize * 0.4),
          ),
          SizedBox(height: spacing),
          Text(
            label,
            style: TextStyle(
              color: labelColor ?? iconColor ?? AppColors.primary,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    } else {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ModernIconButton(
            icon: icon,
            onPressed: onPressed,
            size: iconSize,
            backgroundColor: backgroundColor,
            iconColor: iconColor,
            padding: EdgeInsets.all(iconSize * 0.4),
          ),
          SizedBox(width: spacing),
          Text(
            label,
            style: TextStyle(
              color: labelColor ?? iconColor ?? AppColors.primary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    }
  }
}

// Modern Icon Button Group
class ModernIconButtonGroup extends StatelessWidget {
  final List<ModernIconButton> buttons;
  final Axis direction;
  final double spacing;
  final MainAxisAlignment mainAxisAlignment;
  final CrossAxisAlignment crossAxisAlignment;

  const ModernIconButtonGroup({
    super.key,
    required this.buttons,
    this.direction = Axis.horizontal,
    this.spacing = 12,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.crossAxisAlignment = CrossAxisAlignment.start,
  });

  @override
  Widget build(BuildContext context) {
    if (direction == Axis.horizontal) {
      return Row(
        mainAxisAlignment: mainAxisAlignment,
        crossAxisAlignment: crossAxisAlignment,
        children: _buildChildren(),
      );
    } else {
      return Column(
        mainAxisAlignment: mainAxisAlignment,
        crossAxisAlignment: crossAxisAlignment,
        children: _buildChildren(),
      );
    }
  }

  List<Widget> _buildChildren() {
    List<Widget> children = [];
    for (int i = 0; i < buttons.length; i++) {
      children.add(buttons[i]);
      if (i < buttons.length - 1) {
        children.add(SizedBox(
          width: direction == Axis.horizontal ? spacing : 0,
          height: direction == Axis.vertical ? spacing : 0,
        ));
      }
    }
    return children;
  }
}
