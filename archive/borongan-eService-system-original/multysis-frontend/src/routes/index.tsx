import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { BlockPortalUsers } from '../components/common/BlockPortalUsers';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

// Lazy load all pages for code splitting
// Admin Pages
const AdminAddresses = lazy(() => import('../pages/admin/AdminAddresses').then(m => ({ default: m.AdminAddresses })));
const AdminAppointments = lazy(() => import('../pages/admin/AdminAppointments').then(m => ({ default: m.AdminAppointments })));
const AdminCitizens = lazy(() => import('../pages/admin/AdminCitizens').then(m => ({ default: m.AdminCitizens })));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminFAQs = lazy(() => import('../pages/admin/AdminFAQs').then(m => ({ default: m.AdminFAQs })));
const AdminGovernmentPrograms = lazy(() => import('../pages/admin/AdminGovernmentPrograms').then(m => ({ default: m.AdminGovernmentPrograms })));
const AdminLogin = lazy(() => import('../pages/admin/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminPermissionsManagement = lazy(() => import('../pages/admin/AdminPermissionsManagement').then(m => ({ default: m.AdminPermissionsManagement })));
const AdminRoleManagement = lazy(() => import('../pages/admin/AdminRoleManagement').then(m => ({ default: m.AdminRoleManagement })));
const AdminSmartCityServices = lazy(() => import('../pages/admin/AdminSmartCityServices').then(m => ({ default: m.AdminSmartCityServices })));
const AdminSubscribers = lazy(() => import('../pages/admin/AdminSubscribers').then(m => ({ default: m.AdminSubscribers })));
const AdminUserManagement = lazy(() => import('../pages/admin/AdminUserManagement').then(m => ({ default: m.AdminUserManagement })));
const ServicePage = lazy(() => import('../pages/admin/ServicePage').then(m => ({ default: m.ServicePage })));
const SocialAmelioration = lazy(() => import('../pages/admin/SocialAmelioration').then(m => ({ default: m.SocialAmelioration })));
const EGovReports = lazy(() => import('../pages/admin/EGovReports').then(m => ({ default: m.EGovReports })));
const TaxProfiles = lazy(() => import('../pages/admin/TaxProfiles').then(m => ({ default: m.TaxProfiles })));
const AdminRegistrationWorkflow = lazy(() => import('../pages/admin/AdminRegistrationWorkflow').then(m => ({ default: m.AdminRegistrationWorkflow })));

// Dev Pages
const DevLogin = lazy(() => import('../pages/dev/DevLogin').then(m => ({ default: m.DevLogin })));
const DevDashboard = lazy(() => import('../pages/dev/DevDashboard').then(m => ({ default: m.DevDashboard })));

// Portal Pages
const PortalSignup = lazy(() => import('../pages/portal/PortalSignup').then(m => ({ default: m.PortalSignup })));
const CitizenRegister = lazy(() => import('../pages/portal/CitizenRegister').then(m => ({ default: m.CitizenRegister })));
const RegistrationStatusPage = lazy(() => import('../pages/portal/RegistrationStatus').then(m => ({ default: m.RegistrationStatusPage })));
const PortalHome = lazy(() => import('../pages/portal/PortalHome').then(m => ({ default: m.PortalHome })));
const PortalEGovernment = lazy(() => import('../pages/portal/PortalEGovernment').then(m => ({ default: m.PortalEGovernment })));
const PortalEBills = lazy(() => import('../pages/portal/PortalEBills').then(m => ({ default: m.PortalEBills })));
const PortalEServices = lazy(() => import('../pages/portal/PortalEServices').then(m => ({ default: m.PortalEServices })));
const PortalENews = lazy(() => import('../pages/portal/PortalENews').then(m => ({ default: m.PortalENews })));
const PortalFAQs = lazy(() => import('../pages/portal/PortalFAQs').then(m => ({ default: m.PortalFAQs })));
const PortalProfile = lazy(() => import('../pages/portal/PortalProfile').then(m => ({ default: m.PortalProfile })));

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

// Wrapper component for Suspense
const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingFallback />}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/portal" replace />,
  },
  // Admin Routes
  {
    path: '/admin',
    children: [
      {
        index: true,
        element: <Navigate to="/admin/login" replace />,
      },
      {
        path: 'login',
        element: (
          <BlockPortalUsers>
            <LazyWrapper>
              <AdminLogin />
            </LazyWrapper>
          </BlockPortalUsers>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminDashboard />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'citizens',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminCitizens />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'registration-workflow',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminRegistrationWorkflow />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'subscribers',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminSubscribers />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'access-control/role-management',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminRoleManagement />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'access-control/permissions',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminPermissionsManagement />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'access-control/user-management',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminUserManagement />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'general-settings/smart-city-services',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminSmartCityServices />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'general-settings/government-program',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminGovernmentPrograms />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'general-settings/address',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminAddresses />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'general-settings/appointment',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminAppointments />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'general-settings/faq',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <AdminFAQs />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'general-settings/tax-profiles',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <TaxProfiles />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'e-government/social-amelioration',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <SocialAmelioration />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'e-government/reports',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <EGovReports />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'e-government/:serviceCode',
        element: (
          <ProtectedRoute requiredRole="admin">
            <LazyWrapper>
              <ServicePage />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Dev Routes
  {
    path: '/dev',
    children: [
      {
        index: true,
        element: <Navigate to="/dev/login" replace />,
      },
      {
        path: 'login',
        element: (
          <LazyWrapper>
            <DevLogin />
          </LazyWrapper>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredRole="developer">
            <LazyWrapper>
              <DevDashboard />
            </LazyWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
  // Portal Routes
  {
    path: '/portal',
    children: [
      {
        index: true,
        element: (
          <LazyWrapper>
            <PortalHome />
          </LazyWrapper>
        ),
      },
      {
        path: 'login',
        element: <Navigate to="/portal" replace />,
      },
      {
        path: 'signup',
        element: (
          <LazyWrapper>
            <PortalSignup />
          </LazyWrapper>
        ),
      },
      {
        path: 'register',
        element: (
          <LazyWrapper>
            <CitizenRegister />
          </LazyWrapper>
        ),
      },
      {
        path: 'register/status',
        element: (
          <LazyWrapper>
            <RegistrationStatusPage />
          </LazyWrapper>
        ),
      },
      {
        path: 'e-government',
        element: (
          <LazyWrapper>
            <PortalEGovernment />
          </LazyWrapper>
        ),
      },
      {
        path: 'e-bills',
        element: (
          <LazyWrapper>
            <PortalEBills />
          </LazyWrapper>
        ),
      },
      {
        path: 'e-services',
        element: (
          <LazyWrapper>
            <PortalEServices />
          </LazyWrapper>
        ),
      },
      {
        path: 'e-news',
        element: (
          <LazyWrapper>
            <PortalENews />
          </LazyWrapper>
        ),
      },
      {
        path: 'faqs',
        element: (
          <LazyWrapper>
            <PortalFAQs />
          </LazyWrapper>
        ),
      },
      {
        path: 'profile',
        element: (
          <LazyWrapper>
            <PortalProfile />
          </LazyWrapper>
        ),
      },
    ],
  },
  // Catch all - redirect to portal home
  {
    path: '*',
    element: <Navigate to="/portal" replace />,
  },
]);

