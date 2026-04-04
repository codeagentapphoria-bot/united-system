import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_icons.dart';

enum ButtonVariant {
  primary,
  secondary,
  outline,
  ghost,
  destructive,
  accent,
  hero,
}

enum ButtonSize {
  small,
  medium,
  large,
  icon,
}

class AppButton extends StatelessWidget {
  final String? text;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final ButtonSize size;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;
  final EdgeInsetsGeometry? padding;
  final Widget? child;

  const AppButton({
    super.key,
    this.text,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.size = ButtonSize.medium,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = false,
    this.padding,
    this.child,
  }) : assert(text != null || child != null || icon != null);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: isFullWidth ? double.infinity : null,
      child: _buildButton(),
    );
  }

  Widget _buildButton() {
    switch (variant) {
      case ButtonVariant.primary:
        return ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getButtonStyle(),
          child: _buildButtonContent(),
        );
      case ButtonVariant.secondary:
        return ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getButtonStyle(),
          child: _buildButtonContent(),
        );
      case ButtonVariant.outline:
        return OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getOutlinedButtonStyle(),
          child: _buildButtonContent(),
        );
      case ButtonVariant.ghost:
        return TextButton(
          onPressed: isLoading ? null : onPressed,
          style: _getTextButtonStyle(),
          child: _buildButtonContent(),
        );
      case ButtonVariant.destructive:
        return ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getButtonStyle(),
          child: _buildButtonContent(),
        );
      case ButtonVariant.accent:
        return ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getButtonStyle(),
          child: _buildButtonContent(),
        );
      case ButtonVariant.hero:
        return ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: _getButtonStyle(),
          child: _buildButtonContent(),
        );
    }
  }

  ButtonStyle _getButtonStyle() {
    return ElevatedButton.styleFrom(
      backgroundColor: _getBackgroundColor(),
      foregroundColor: _getForegroundColor(),
      elevation: _getElevation(),
      shadowColor: _getShadowColor(),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(_getBorderRadius()),
      ),
      padding: padding ?? _getDefaultPadding(),
      minimumSize: _getMinimumSize(),
    );
  }

  ButtonStyle _getOutlinedButtonStyle() {
    return OutlinedButton.styleFrom(
      foregroundColor: _getForegroundColor(),
      side: BorderSide(color: _getBorderColor()),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(_getBorderRadius()),
      ),
      padding: padding ?? _getDefaultPadding(),
      minimumSize: _getMinimumSize(),
    );
  }

  ButtonStyle _getTextButtonStyle() {
    return TextButton.styleFrom(
      foregroundColor: _getForegroundColor(),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(_getBorderRadius()),
      ),
      padding: padding ?? _getDefaultPadding(),
      minimumSize: _getMinimumSize(),
    );
  }

  Color _getBackgroundColor() {
    switch (variant) {
      case ButtonVariant.primary:
        return AppColors.primary;
      case ButtonVariant.secondary:
        return AppColors.secondary;
      case ButtonVariant.outline:
      case ButtonVariant.ghost:
        return Colors.transparent;
      case ButtonVariant.destructive:
        return AppColors.destructive;
      case ButtonVariant.accent:
        return AppColors.accent;
      case ButtonVariant.hero:
        return AppColors.primary;
    }
  }

  Color _getForegroundColor() {
    switch (variant) {
      case ButtonVariant.primary:
      case ButtonVariant.destructive:
      case ButtonVariant.accent:
      case ButtonVariant.hero:
        return AppColors.primaryForeground;
      case ButtonVariant.secondary:
        return AppColors.secondaryForeground;
      case ButtonVariant.outline:
      case ButtonVariant.ghost:
        return AppColors.primary;
    }
  }

  Color _getBorderColor() {
    switch (variant) {
      case ButtonVariant.outline:
        return AppColors.border;
      default:
        return AppColors.primary;
    }
  }

  double _getElevation() {
    switch (variant) {
      case ButtonVariant.ghost:
      case ButtonVariant.outline:
        return 0;
      default:
        return 2;
    }
  }

  Color _getShadowColor() {
    return _getBackgroundColor().withValues(alpha: 0.3);
  }

  double _getBorderRadius() {
    switch (size) {
      case ButtonSize.small:
        return 6;
      case ButtonSize.medium:
        return 8;
      case ButtonSize.large:
        return 10;
      case ButtonSize.icon:
        return 8;
    }
  }

  EdgeInsetsGeometry _getDefaultPadding() {
    switch (size) {
      case ButtonSize.small:
        return const EdgeInsets.symmetric(horizontal: 16, vertical: 8);
      case ButtonSize.medium:
        return const EdgeInsets.symmetric(horizontal: 24, vertical: 12);
      case ButtonSize.large:
        return const EdgeInsets.symmetric(horizontal: 32, vertical: 16);
      case ButtonSize.icon:
        return const EdgeInsets.all(12);
    }
  }

  Size _getMinimumSize() {
    switch (size) {
      case ButtonSize.small:
        return const Size(80, 36);
      case ButtonSize.medium:
        return const Size(120, 44);
      case ButtonSize.large:
        return const Size(160, 52);
      case ButtonSize.icon:
        return const Size(44, 44);
    }
  }

  Widget _buildButtonContent() {
    if (isLoading) {
      return SizedBox(
        height: _getIconSize(),
        width: _getIconSize(),
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(_getForegroundColor()),
        ),
      );
    }

    if (size == ButtonSize.icon && icon != null) {
      return Icon(icon, size: _getIconSize());
    }

    if (child != null) {
      return child!;
    }

    List<Widget> children = [];
    
    if (icon != null) {
      children.add(Icon(icon, size: _getIconSize()));
      children.add(const SizedBox(width: 8));
    }
    
    if (text != null) {
      children.add(Text(
        text!,
        style: TextStyle(
          fontSize: _getFontSize(),
          fontWeight: FontWeight.w600,
        ),
      ));
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: children,
    );
  }

  double _getIconSize() {
    switch (size) {
      case ButtonSize.small:
        return 16;
      case ButtonSize.medium:
        return 18;
      case ButtonSize.large:
        return 20;
      case ButtonSize.icon:
        return 20;
    }
  }

  double _getFontSize() {
    switch (size) {
      case ButtonSize.small:
        return 14;
      case ButtonSize.medium:
        return 16;
      case ButtonSize.large:
        return 18;
      case ButtonSize.icon:
        return 16;
    }
  }
}
