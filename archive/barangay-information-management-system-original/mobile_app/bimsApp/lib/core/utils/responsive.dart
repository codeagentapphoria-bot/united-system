import 'package:flutter/material.dart';

class ResponsiveBuilder extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget? desktop;

  const ResponsiveBuilder({
    super.key,
    required this.mobile,
    this.tablet,
    this.desktop,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 1200) {
          return desktop ?? tablet ?? mobile;
        } else if (constraints.maxWidth >= 800) {
          return tablet ?? mobile;
        } else {
          return mobile;
        }
      },
    );
  }
}

// Screen size utilities
class ScreenSize {
  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < 800;
  
  static bool isTablet(BuildContext context) =>
      MediaQuery.of(context).size.width >= 800 &&
      MediaQuery.of(context).size.width < 1200;
  
  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= 1200;
  
  static double getWidth(BuildContext context) =>
      MediaQuery.of(context).size.width;
  
  static double getHeight(BuildContext context) =>
      MediaQuery.of(context).size.height;
  
  static double getAspectRatio(BuildContext context) =>
      MediaQuery.of(context).size.width / MediaQuery.of(context).size.height;
  
  static bool isLandscape(BuildContext context) =>
      MediaQuery.of(context).orientation == Orientation.landscape;
  
  static bool isPortrait(BuildContext context) =>
      MediaQuery.of(context).orientation == Orientation.portrait;
}

// Responsive padding utilities
class ResponsivePadding {
  static EdgeInsetsGeometry get all {
    return const EdgeInsets.all(16);
  }
  
  static EdgeInsetsGeometry get horizontal {
    return const EdgeInsets.symmetric(horizontal: 16);
  }
  
  static EdgeInsetsGeometry get vertical {
    return const EdgeInsets.symmetric(vertical: 16);
  }
  
  static EdgeInsetsGeometry get small {
    return const EdgeInsets.all(8);
  }
  
  static EdgeInsetsGeometry get medium {
    return const EdgeInsets.all(16);
  }
  
  static EdgeInsetsGeometry get large {
    return const EdgeInsets.all(24);
  }
  
  static EdgeInsetsGeometry get extraLarge {
    return const EdgeInsets.all(32);
  }
  
  // Responsive padding based on screen size
  static EdgeInsetsGeometry responsive(BuildContext context, {
    EdgeInsetsGeometry? mobile,
    EdgeInsetsGeometry? tablet,
    EdgeInsetsGeometry? desktop,
  }) {
    if (ScreenSize.isDesktop(context)) {
      return desktop ?? tablet ?? mobile ?? all;
    } else if (ScreenSize.isTablet(context)) {
      return tablet ?? mobile ?? all;
    } else {
      return mobile ?? all;
    }
  }
}

// Responsive spacing utilities
class ResponsiveSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
  
  // Responsive spacing based on screen size
  static double responsive(BuildContext context, {
    double? mobile,
    double? tablet,
    double? desktop,
  }) {
    if (ScreenSize.isDesktop(context)) {
      return desktop ?? tablet ?? mobile ?? md;
    } else if (ScreenSize.isTablet(context)) {
      return tablet ?? mobile ?? md;
    } else {
      return mobile ?? md;
    }
  }
}

// Responsive font size utilities
class ResponsiveFontSize {
  static const double xs = 12.0;
  static const double sm = 14.0;
  static const double md = 16.0;
  static const double lg = 18.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double xxxl = 32.0;
  
  // Responsive font size based on screen size
  static double responsive(BuildContext context, {
    double? mobile,
    double? tablet,
    double? desktop,
  }) {
    if (ScreenSize.isDesktop(context)) {
      return desktop ?? tablet ?? mobile ?? md;
    } else if (ScreenSize.isTablet(context)) {
      return tablet ?? mobile ?? md;
    } else {
      return mobile ?? md;
    }
  }
}

// Responsive widget builder
class ResponsiveWidget extends StatelessWidget {
  final Widget Function(BuildContext context, bool isMobile, bool isTablet, bool isDesktop) builder;

  const ResponsiveWidget({
    super.key,
    required this.builder,
  });

  @override
  Widget build(BuildContext context) {
    return builder(
      context,
      ScreenSize.isMobile(context),
      ScreenSize.isTablet(context),
      ScreenSize.isDesktop(context),
    );
  }
}

// Responsive grid utilities
class ResponsiveGrid {
  static int getColumns(BuildContext context) {
    if (ScreenSize.isDesktop(context)) {
      return 4;
    } else if (ScreenSize.isTablet(context)) {
      return 3;
    } else {
      return 2;
    }
  }
  
  static double getChildAspectRatio(BuildContext context) {
    if (ScreenSize.isDesktop(context)) {
      return 1.2;
    } else if (ScreenSize.isTablet(context)) {
      return 1.0;
    } else {
      return 0.8;
    }
  }
  
  static double getCrossAxisSpacing(BuildContext context) {
    if (ScreenSize.isDesktop(context)) {
      return 24.0;
    } else if (ScreenSize.isTablet(context)) {
      return 16.0;
    } else {
      return 8.0;
    }
  }
  
  static double getMainAxisSpacing(BuildContext context) {
    if (ScreenSize.isDesktop(context)) {
      return 24.0;
    } else if (ScreenSize.isTablet(context)) {
      return 16.0;
    } else {
      return 12.0;
    }
  }
}

// Responsive breakpoint constants
class Breakpoints {
  static const double mobile = 800;
  static const double tablet = 1200;
  static const double desktop = 1200;
  
  static bool isMobile(double width) => width < mobile;
  static bool isTablet(double width) => width >= mobile && width < tablet;
  static bool isDesktop(double width) => width >= desktop;
}

// Responsive value provider
class ResponsiveValue<T> {
  final T mobile;
  final T? tablet;
  final T? desktop;

  const ResponsiveValue({
    required this.mobile,
    this.tablet,
    this.desktop,
  });

  T getValue(BuildContext context) {
    if (ScreenSize.isDesktop(context)) {
      return desktop ?? tablet ?? mobile;
    } else if (ScreenSize.isTablet(context)) {
      return tablet ?? mobile;
    } else {
      return mobile;
    }
  }
}
