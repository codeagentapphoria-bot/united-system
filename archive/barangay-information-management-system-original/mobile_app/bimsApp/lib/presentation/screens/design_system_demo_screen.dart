import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_icons.dart';
import '../widgets/common/app_button.dart';
import '../widgets/common/app_card.dart';
import '../widgets/common/modern_icon_showcase.dart';
import '../widgets/common/modern_icon_button.dart';
import '../../../core/utils/responsive.dart';

class DesignSystemDemoScreen extends StatelessWidget {
  const DesignSystemDemoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('BIMS Design System'),
        backgroundColor: AppColors.card,
        foregroundColor: AppColors.foreground,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Color Palette Section
            _buildSectionTitle('Color Palette'),
            const SizedBox(height: 16),
            _buildColorPalette(),
            const SizedBox(height: 32),
            
            // Button Variants Section
            _buildSectionTitle('Button Variants'),
            const SizedBox(height: 16),
            _buildButtonVariants(),
            const SizedBox(height: 32),
            
            // Card Components Section
            _buildSectionTitle('Card Components'),
            const SizedBox(height: 16),
            _buildCardComponents(),
            const SizedBox(height: 32),
            
            // Icon System Section
            _buildSectionTitle('Icon System'),
            const SizedBox(height: 16),
            _buildIconSystem(),
            const SizedBox(height: 32),
            
            // Modern Icon Showcase Section
            _buildSectionTitle('Modern Icon Showcase'),
            const SizedBox(height: 16),
            const ModernIconShowcase(),
            const SizedBox(height: 32),
            
            // Modern Icon Buttons Section
            _buildSectionTitle('Modern Icon Buttons'),
            const SizedBox(height: 16),
            _buildModernIconButtons(),
            const SizedBox(height: 32),
            
            // Typography Section
            _buildSectionTitle('Typography'),
            const SizedBox(height: 16),
            _buildTypography(context),
            const SizedBox(height: 32),
            
            // Responsive Design Section
            _buildSectionTitle('Responsive Design'),
            const SizedBox(height: 16),
            _buildResponsiveDesign(context),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: AppColors.foreground,
      ),
    );
  }

  Widget _buildColorPalette() {
    return Column(
      children: [
        // Primary Colors
        _buildColorRow('Primary', AppColors.primary, 'hsl(220 90% 56%)'),
        _buildColorRow('Primary Hover', AppColors.primaryHover, 'hsl(220 90% 46%)'),
        _buildColorRow('Primary Foreground', AppColors.primaryForeground, 'White'),
        
        const SizedBox(height: 16),
        
        // Secondary Colors
        _buildColorRow('Secondary', AppColors.secondary, 'hsl(210 20% 92%)'),
        _buildColorRow('Secondary Foreground', AppColors.secondaryForeground, 'hsl(220 15% 25%)'),
        
        const SizedBox(height: 16),
        
        // Accent Colors
        _buildColorRow('Accent', AppColors.accent, 'hsl(35 85% 55%)'),
        _buildColorRow('Accent Foreground', AppColors.accentForeground, 'White'),
        
        const SizedBox(height: 16),
        
        // Semantic Colors
        _buildColorRow('Success', AppColors.success, 'hsl(140 70% 45%)'),
        _buildColorRow('Warning', AppColors.warning, 'hsl(45 90% 55%)'),
        _buildColorRow('Destructive', AppColors.destructive, 'hsl(0 85% 60%)'),
        _buildColorRow('Info', AppColors.info, 'hsl(200 100% 35%)'),
        
        const SizedBox(height: 16),
        
        // Background Colors
        _buildColorRow('Background', AppColors.background, 'hsl(220 20% 97%)'),
        _buildColorRow('Foreground', AppColors.foreground, 'hsl(220 15% 15%)'),
        _buildColorRow('Card', AppColors.card, 'Pure White'),
        _buildColorRow('Muted', AppColors.muted, 'hsl(210 20% 95%)'),
        _buildColorRow('Muted Foreground', AppColors.mutedForeground, 'hsl(220 10% 50%)'),
      ],
    );
  }

  Widget _buildColorRow(String name, Color color, String hsl) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 40,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.border),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
                Text(
                  hsl,
                  style: TextStyle(
                    color: AppColors.mutedForeground,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButtonVariants() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Primary Buttons
        const Text('Primary Buttons', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            AppButton(text: 'Primary', variant: ButtonVariant.primary),
            AppButton(text: 'Secondary', variant: ButtonVariant.secondary),
            AppButton(text: 'Accent', variant: ButtonVariant.accent),
            AppButton(text: 'Destructive', variant: ButtonVariant.destructive),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Outline and Ghost Buttons
        const Text('Outline & Ghost Buttons', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            AppButton(text: 'Outline', variant: ButtonVariant.outline),
            AppButton(text: 'Ghost', variant: ButtonVariant.ghost),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Button Sizes
        const Text('Button Sizes', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            AppButton(text: 'Small', size: ButtonSize.small),
            AppButton(text: 'Medium', size: ButtonSize.medium),
            AppButton(text: 'Large', size: ButtonSize.large),
            AppButton(icon: AppIcons.plus, size: ButtonSize.icon),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Loading State
        const Text('Loading State', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        AppButton(
          text: 'Loading...',
          isLoading: true,
          variant: ButtonVariant.primary,
        ),
      ],
    );
  }

  Widget _buildCardComponents() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Basic Card
        const Text('Basic Card', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        AppCard(
          child: const Padding(
            padding: EdgeInsets.all(16),
            child: Text('This is a basic card component with default styling.'),
          ),
        ),
        
        const SizedBox(height: 16),
        
        // Card with Header
        const Text('Card with Header', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        AppCardWithHeader(
          title: 'Card Title',
          subtitle: 'This is a subtitle for the card',
          actions: [
            IconButton(
              icon: const Icon(Icons.edit),
              onPressed: () {},
            ),
            IconButton(
              icon: const Icon(Icons.delete),
              onPressed: () {},
            ),
          ],
          child: const Text('This card has a header with title, subtitle, and action buttons.'),
        ),
        
        const SizedBox(height: 16),
        
        // Info Card
        const Text('Info Card', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        AppInfoCard(
          title: 'Information',
          subtitle: 'This is an informational card with an icon',
          icon: Icons.info,
          iconColor: AppColors.info,
        ),
        
        const SizedBox(height: 16),
        
        // Status Card
        const Text('Status Card', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        AppStatusCard(
          title: 'Request Status',
          status: 'completed',
          child: const Text('Your request has been processed successfully.'),
        ),
      ],
    );
  }

  Widget _buildIconSystem() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Icon Sizes
        const Text('Icon Sizes', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 16,
          runSpacing: 8,
          children: [
            Icon(Icons.home, size: AppIcons.xs, color: AppColors.primary),
            Icon(Icons.home, size: AppIcons.sm, color: AppColors.primary),
            Icon(Icons.home, size: AppIcons.md, color: AppColors.primary),
            Icon(Icons.home, size: AppIcons.lg, color: AppColors.primary),
            Icon(Icons.home, size: AppIcons.xl, color: AppColors.primary),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Icon Categories
        const Text('Icon Categories', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 16,
          runSpacing: 8,
          children: [
            Icon(AppIcons.home, size: AppIcons.md, color: AppColors.primary),
            Icon(AppIcons.users, size: AppIcons.md, color: AppColors.secondary),
            Icon(AppIcons.building, size: AppIcons.md, color: AppColors.accent),
            Icon(AppIcons.mapPin, size: AppIcons.md, color: AppColors.success),
            Icon(AppIcons.fileText, size: AppIcons.md, color: AppColors.warning),
            Icon(AppIcons.package, size: AppIcons.md, color: AppColors.destructive),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Modern Icons
        const Text('Modern Icons', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 16,
          runSpacing: 8,
          children: [
            Icon(AppIcons.notification, size: AppIcons.md, color: AppColors.primary),
            Icon(AppIcons.menu, size: AppIcons.md, color: AppColors.secondary),
            Icon(AppIcons.arrowBack, size: AppIcons.md, color: AppColors.accent),
            Icon(AppIcons.calendar, size: AppIcons.md, color: AppColors.success),
            Icon(AppIcons.star, size: AppIcons.md, color: AppColors.warning),
            Icon(AppIcons.heart, size: AppIcons.md, color: AppColors.destructive),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Status Icons
        const Text('Status Icons', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 16,
          runSpacing: 8,
          children: [
            Icon(AppIcons.checkCircle, size: AppIcons.md, color: AppColors.success),
            Icon(AppIcons.clock, size: AppIcons.md, color: AppColors.warning),
            Icon(AppIcons.alertCircle, size: AppIcons.md, color: AppColors.destructive),
            Icon(Icons.info, size: AppIcons.md, color: AppColors.info),
          ],
        ),
      ],
    );
  }

  Widget _buildTypography(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Display Large - 32px Bold',
          style: Theme.of(context).textTheme.displayLarge,
        ),
        const SizedBox(height: 8),
        Text(
          'Display Medium - 28px Bold',
          style: Theme.of(context).textTheme.displayMedium,
        ),
        const SizedBox(height: 8),
        Text(
          'Display Small - 24px Semi-Bold',
          style: Theme.of(context).textTheme.displaySmall,
        ),
        const SizedBox(height: 8),
        Text(
          'Headline Large - 22px Semi-Bold',
          style: Theme.of(context).textTheme.headlineLarge,
        ),
        const SizedBox(height: 8),
        Text(
          'Headline Medium - 20px Semi-Bold',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 8),
        Text(
          'Title Large - 16px Semi-Bold',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 8),
        Text(
          'Body Large - 16px Regular',
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        const SizedBox(height: 8),
        Text(
          'Body Medium - 14px Regular',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 8),
        Text(
          'Body Small - 12px Regular Muted',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _buildModernIconButtons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Filled Icon Buttons
        const Text('Filled Icon Buttons', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 16,
          runSpacing: 8,
          children: [
            ModernIconButton(
              icon: AppIcons.home,
              backgroundColor: AppColors.primary,
              iconColor: AppColors.primaryForeground,
            ),
            ModernIconButton(
              icon: AppIcons.users,
              backgroundColor: AppColors.success,
              iconColor: AppColors.primaryForeground,
            ),
            ModernIconButton(
              icon: AppIcons.building,
              backgroundColor: AppColors.accent,
              iconColor: AppColors.primaryForeground,
            ),
            ModernIconButton(
              icon: AppIcons.settings,
              backgroundColor: AppColors.destructive,
              iconColor: AppColors.primaryForeground,
            ),
          ],
        ),
        
        const SizedBox(height: 24),
        
        // Outlined Icon Buttons
        const Text('Outlined Icon Buttons', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 16,
          runSpacing: 8,
          children: [
            ModernIconButton(
              icon: AppIcons.home,
              isOutlined: true,
              iconColor: AppColors.primary,
              borderColor: AppColors.primary,
            ),
            ModernIconButton(
              icon: AppIcons.users,
              isOutlined: true,
              iconColor: AppColors.success,
              borderColor: AppColors.success,
            ),
            ModernIconButton(
              icon: AppIcons.building,
              isOutlined: true,
              iconColor: AppColors.accent,
              borderColor: AppColors.accent,
            ),
            ModernIconButton(
              icon: AppIcons.settings,
              isOutlined: true,
              iconColor: AppColors.destructive,
              borderColor: AppColors.destructive,
            ),
          ],
        ),
        
        const SizedBox(height: 24),
        
        // Icon Buttons with Labels
        const Text('Icon Buttons with Labels', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            ModernIconButtonWithLabel(
              icon: AppIcons.home,
              label: 'Home',
              iconColor: AppColors.primary,
            ),
            ModernIconButtonWithLabel(
              icon: AppIcons.users,
              label: 'Users',
              iconColor: AppColors.success,
            ),
            ModernIconButtonWithLabel(
              icon: AppIcons.building,
              label: 'Building',
              iconColor: AppColors.accent,
            ),
            ModernIconButtonWithLabel(
              icon: AppIcons.settings,
              label: 'Settings',
              iconColor: AppColors.destructive,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildResponsiveDesign(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Screen Size Info
        Text(
          'Screen Size: ${ScreenSize.getWidth(context).toStringAsFixed(0)} x ${ScreenSize.getHeight(context).toStringAsFixed(0)}',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        
        // Responsive Indicators
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (ScreenSize.isMobile(context))
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Mobile',
                  style: TextStyle(
                    color: AppColors.success,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            if (ScreenSize.isTablet(context))
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Tablet',
                  style: TextStyle(
                    color: AppColors.warning,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            if (ScreenSize.isDesktop(context))
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Desktop',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Responsive Grid
        const Text('Responsive Grid', style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: ResponsiveGrid.getColumns(context),
            crossAxisSpacing: ResponsiveGrid.getCrossAxisSpacing(context),
            mainAxisSpacing: ResponsiveGrid.getMainAxisSpacing(context),
            childAspectRatio: ResponsiveGrid.getChildAspectRatio(context),
          ),
          itemCount: 6,
          itemBuilder: (context, index) {
            return AppCard(
              child: Container(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      AppIcons.home,
                      size: AppIcons.lg,
                      color: AppColors.primary,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Item ${index + 1}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
