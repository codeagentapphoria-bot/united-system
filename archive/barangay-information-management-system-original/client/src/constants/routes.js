// Public Routes
export const PUBLIC_ROUTES = {
  HOME: '/',
  REQUEST: '/request',
  TRACK: '/track',
  MAP: '/map',
  OFFICIALS: '/officials',
  CONTACT: '/contact',
  PET_QR_SCANNER: '/pet-scanner',
};

// Admin Routes
export const ADMIN_ROUTES = {
  LOGIN: '/admin/login',
  FORGOT_PASSWORD: '/admin/forgot-password',
  RESET_PASSWORD: '/admin/reset-password',
  SETUP_ACCOUNT: '/admin/setup-account',
  
  // Municipality Routes
  MUNICIPALITY: {
    DASHBOARD: '/admin/municipality/dashboard',
    RESIDENTS: '/admin/municipality/residents',
    HOUSEHOLDS: '/admin/municipality/households',
    PETS: '/admin/municipality/pets',
    BARANGAYS: '/admin/municipality/barangays',
    ACCOUNTS: '/admin/municipality/accounts',
    SETTINGS: '/admin/municipality/settings',
    GEOMAP: '/admin/municipality/geomap',
    SETUP: '/admin/municipality/setup',
    SYSTEM_MANAGEMENT: '/admin/municipality/system-management',
    GUIDE: '/admin/municipality/guide',
  },
  
  // Barangay Routes
  BARANGAY: {
    DASHBOARD: '/admin/barangay/dashboard',
    RESIDENTS: '/admin/barangay/residents',
    HOUSEHOLDS: '/admin/barangay/households',
    PETS: '/admin/barangay/pets',
    PUROKS: '/admin/barangay/puroks',
    ARCHIVES: '/admin/barangay/archives',
    INVENTORY: '/admin/barangay/inventory',
    REQUESTS: '/admin/barangay/requests',
    OFFICIALS: '/admin/barangay/officials',
    ACCOUNTS: '/admin/barangay/accounts',
    SETTINGS: '/admin/barangay/settings',
    GEOMAP: '/admin/barangay/geomap',
    SETUP: '/admin/barangay/setup',
    GUIDE: '/admin/barangay/guide',
  },
};

// Auth Routes (without /admin prefix)
export const AUTH_ROUTES = {
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  SETUP_ACCOUNT: '/setup-account',
};

// Helper function to get role-specific routes
export const getRoleRoutes = (role) => {
  return role === 'municipality' ? ADMIN_ROUTES.MUNICIPALITY : ADMIN_ROUTES.BARANGAY;
};

// Helper function to check if route is admin route
export const isAdminRoute = (pathname) => {
  return pathname.startsWith('/admin');
};

// Helper function to check if route is auth route
export const isAuthRoute = (pathname) => {
  return Object.values(AUTH_ROUTES).includes(pathname);
};

// Helper function to check if route is public route
export const isPublicRoute = (pathname) => {
  return Object.values(PUBLIC_ROUTES).includes(pathname);
};
