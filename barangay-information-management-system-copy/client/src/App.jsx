import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { BarangayProvider, useBarangay } from "@/contexts/BarangayContext";
import { RequestProvider } from "@/contexts/RequestContext";
import { BarangaySelection } from "@/components/common/BarangaySelection";
import useAuth from "@/hooks/useAuth";
import useRoles from "@/hooks/useRoles";
import { AuthProvider } from "@/contexts/AuthContext";
import { 
  PUBLIC_ROUTES, 
  ADMIN_ROUTES, 
  AUTH_ROUTES, 
  isAdminRoute, 
  isAuthRoute 
} from "@/constants/routes";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useCacheRefresh } from "@/hooks/useCacheRefresh";

// Admin Components
import NotFound from "@/pages/admin/client/NotFound";
import { LoginForm } from "@/pages/auth/LoginForm";
import { ForgotPasswordForm } from "@/pages/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/pages/auth/ResetPasswordForm";
import MunicipalityLayout from "@/components/layouts/MunicipalityLayout";
import BarangayLayout from "@/components/layouts/BarangayLayout";
import RoleRoute from "@/components/layouts/RoleRoute";
import PermissionRoute from "@/components/layouts/PermissionRoute";
import SetupAccount from "@/pages/admin/client/SetupAccount";
import SetupPage from "@/pages/admin/shared/SetupPage";
import SetupRouter from "@/components/layouts/SetupRouter";

// Public Components
import PublicIndex from "@/pages/public/Index";
import PublicCertificates from "@/pages/public/Certificates";
import PublicTrackRequest from "@/pages/public/TrackRequest";
import PublicContact from "@/pages/public/Contact";
import PublicMap from "@/pages/public/Map";
import PublicOfficials from "@/pages/public/Officials";
import PublicNotFound from "@/pages/public/NotFound";
import PetQRScanner from "@/pages/public/PetQRScanner";
import DeveloperPortal from "@/pages/public/DeveloperPortal";

// Lazy load admin pages
const Dashboard = React.lazy(() =>
  import("@/pages/admin/shared/DashboardPage")
);
const ResidentsPage = React.lazy(() =>
  import("@/pages/admin/shared/ResidentsPage")
);
const HouseholdsPage = React.lazy(() =>
  import("@/pages/admin/shared/HouseholdsPage")
);
const PetsPage = React.lazy(() => import("@/pages/admin/shared/PetsPage"));
const ArchivesPage = React.lazy(() =>
  import("@/pages/admin/barangay/ArchivesPage")
);
const InventoryPage = React.lazy(() =>
  import("@/pages/admin/barangay/InventoryPage")
);
// RequestsPage removed — replaced by CertificatesPage (AC3)
const OfficialsPage = React.lazy(() =>
  import("@/pages/admin/barangay/OfficialsPage")
);
const GeoMapPage = React.lazy(() => import("@/pages/admin/shared/GeoMapPage"));
const BarangaysPage = React.lazy(() =>
  import("@/pages/admin/municipality/BarangaysPage")
);
const AccountsPage = React.lazy(() =>
  import("@/pages/admin/shared/AccountsPage")
);
const SettingsPage = React.lazy(() =>
  import("@/pages/admin/shared/SettingsPage")
);
const ActivitiesPage = React.lazy(() =>
  import("@/pages/admin/shared/ActivitiesPage")
);
const GuidePage = React.lazy(() =>
  import("@/pages/admin/shared/GuidePage")
);
const OpenAPIPage = React.lazy(() =>
  import("@/pages/admin/municipality/OpenAPIPage")
);
const SystemManagementPage = React.lazy(() =>
  import("@/pages/admin/shared/SystemManagementPage")
);
// NEW: Registration approvals, bulk ID, GeoJSON setup
const RegistrationApprovalsPage = React.lazy(() =>
  import("@/pages/admin/shared/RegistrationApprovalsPage")
);
const GeoSetupPage = React.lazy(() =>
  import("@/pages/admin/municipality/GeoSetupPage")
);
// NEW: Certificate template management (AC4)
const CertificateTemplatesPage = React.lazy(() =>
  import("@/pages/admin/certificates/CertificateTemplatesPage")
);
const TemplateEditorPage = React.lazy(() =>
  import("@/pages/admin/certificates/TemplateEditorPage")
);
// NEW: Barangay certificate queue (AC3)
const CertificatesPage = React.lazy(() =>
  import("@/pages/admin/barangay/CertificatesPage")
);

const queryClient = new QueryClient();

// Create a separate AdminRoutes component that will be lazy loaded
function AdminRoutesContent() {
  const { isAuthenticated } = useAuth();
  const { role } = useRoles();

  // Clear Redis cache on application refresh (only for authenticated users)
  useCacheRefresh({
    enabled: isAuthenticated,
    clearOnAuth: true
  });

  // Redirect root to appropriate dashboard or setup
  if (window.location.pathname === "/admin" && isAuthenticated) {
    if (role === "municipality") {
      return <Navigate to={ADMIN_ROUTES.MUNICIPALITY.DASHBOARD} replace />;
    } else if (role === "barangay") {
      return <Navigate to={ADMIN_ROUTES.BARANGAY.DASHBOARD} replace />;
    }
  }

  return (
    <Routes>
      {/* Public auth routes (without /admin prefix) - These must come first */}
      <Route path={AUTH_ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordForm />} />
      <Route path={AUTH_ROUTES.RESET_PASSWORD} element={<ResetPasswordForm />} />

      {/* Public setup account routes */}
      <Route path={AUTH_ROUTES.SETUP_ACCOUNT} element={<SetupAccount />} />
      <Route path={ADMIN_ROUTES.SETUP_ACCOUNT} element={<SetupAccount />} />

      {/* Admin auth routes */}
      <Route
        path={ADMIN_ROUTES.LOGIN}
        element={
          isAuthenticated ? (
            role === "municipality" ? (
              <Navigate to={ADMIN_ROUTES.MUNICIPALITY.DASHBOARD} replace />
            ) : role === "barangay" ? (
              <Navigate to={ADMIN_ROUTES.BARANGAY.DASHBOARD} replace />
            ) : (
              <Navigate to="/admin" replace />
            )
          ) : (
            <LoginForm />
          )
        }
      />
      <Route
        path={ADMIN_ROUTES.FORGOT_PASSWORD}
        element={
          isAuthenticated ? (
            role === "municipality" ? (
              <Navigate to={ADMIN_ROUTES.MUNICIPALITY.DASHBOARD} replace />
            ) : role === "barangay" ? (
              <Navigate to={ADMIN_ROUTES.BARANGAY.DASHBOARD} replace />
            ) : (
              <Navigate to="/admin" replace />
            )
          ) : (
            <ForgotPasswordForm />
          )
        }
      />
      <Route
        path={ADMIN_ROUTES.RESET_PASSWORD}
        element={
          isAuthenticated ? (
            role === "municipality" ? (
              <Navigate to={ADMIN_ROUTES.MUNICIPALITY.DASHBOARD} replace />
            ) : role === "barangay" ? (
              <Navigate to={ADMIN_ROUTES.BARANGAY.DASHBOARD} replace />
            ) : (
              <Navigate to="/admin" replace />
            )
          ) : (
            <ResetPasswordForm />
          )
        }
      />

      {/* Municipality routes */}
      <Route
        path="/admin/municipality/*"
        element={
          <RoleRoute role="municipality">
            <SetupRouter>
              <MunicipalityLayout>
                <Suspense fallback={<LoadingSpinner message="Loading page..." variant="default" size="lg" />}>
                  <Routes>
                    <Route
                      path="dashboard"
                      element={<Dashboard role={role} />}
                    />
                    <Route
                      path="residents"
                      element={<ResidentsPage role={role} />}
                    />
                     <Route path="setup" element={<SetupPage role={role} />} />
                     {/* New GeoJSON-based municipality setup */}
                     <Route path="geo-setup" element={<GeoSetupPage />} />
                     <Route path="households" element={<HouseholdsPage />} />
                     <Route path="pets" element={<PetsPage />} />
                     <Route path="barangays" element={<BarangaysPage />} />
                     {/* Registration approvals are barangay-only */}
                     <Route path="bulk-id" element={<Navigate to="/admin/municipality/settings" replace />} />
                     {/* New: Certificate template management (AC4) */}
                     <Route path="certificate-templates" element={<CertificateTemplatesPage />} />
                     <Route path="certificate-templates/:id" element={<TemplateEditorPage />} />
                     <Route path="openapi" element={<OpenAPIPage />} />
                     <Route
                       path="accounts"
                       element={
                         <PermissionRoute permission="admin">
                           <AccountsPage />
                         </PermissionRoute>
                       }
                     />
                     <Route path="settings" element={<SettingsPage />} />
                     <Route path="activities" element={<ActivitiesPage />} />
                     <Route path="geomap" element={<GeoMapPage />} />
                     <Route path="system-management" element={<SystemManagementPage />} />
                     <Route path="guide" element={<GuidePage />} />
                     <Route path="*" element={<NotFound />} />
                   </Routes>
                 </Suspense>
               </MunicipalityLayout>
             </SetupRouter>
          </RoleRoute>
        }
      />

      {/* Barangay routes */}
      <Route
        path="/admin/barangay/*"
        element={
          <RoleRoute role="barangay">
            <SetupRouter>
              <BarangayLayout>
                <Suspense fallback={<LoadingSpinner message="Loading page..." variant="default" size="lg" />}>
                  <Routes>
                    <Route
                      path="dashboard"
                      element={<Dashboard role={role} />}
                    />
                    <Route
                      path="residents"
                      element={<ResidentsPage role={role} />} />
                     <Route path="setup" element={<SetupPage role={role} />} />
                     <Route path="households" element={<HouseholdsPage />} />
                     <Route path="pets" element={<PetsPage />} />
                     <Route path="registrations" element={<RegistrationApprovalsPage />} />
                     {/* Certificate request queue (AC3) — replaces old Requests page */}
                     <Route path="certificates" element={<CertificatesPage />} />
                     {/* Redirect old /requests URL to /certificates */}
                     <Route path="requests" element={<Navigate to="/admin/barangay/certificates" replace />} />
                     <Route path="archives" element={<ArchivesPage />} />
                    <Route path="inventory" element={<InventoryPage />} />
                     <Route path="officials" element={<OfficialsPage />} />
                    <Route
                      path="accounts"
                      element={
                        <PermissionRoute permission="admin">
                          <AccountsPage />
                        </PermissionRoute>
                      }
                    />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="activities" element={<ActivitiesPage />} />
                    <Route path="geomap" element={<GeoMapPage />} />
                    <Route path="guide" element={<GuidePage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BarangayLayout>
            </SetupRouter>
          </RoleRoute>
        }
      />

      {/* Catch-all for admin routes */}
      <Route path="/admin/*" element={<NotFound />} />
    </Routes>
  );
}

// Create a wrapper component that provides the AuthProvider context
function AdminRoutes() {
  return (
    <AuthProvider>
      <AdminRoutesContent />
    </AuthProvider>
  );
}

function PublicRoutes() {
  const { isBarangaySelected } = useBarangay();
  const location = useLocation();
  const isDeveloperPortal = location.pathname === '/developer-portal';

  if (!isDeveloperPortal && !isBarangaySelected) {
    return <BarangaySelection />;
  }

  return (
    <RequestProvider>
      <Routes>
        <Route path={PUBLIC_ROUTES.HOME} element={<PublicIndex />} />
        <Route path={PUBLIC_ROUTES.REQUEST} element={<PublicCertificates />} />
        <Route path={PUBLIC_ROUTES.TRACK} element={<PublicTrackRequest />} />
        <Route path={PUBLIC_ROUTES.MAP} element={<PublicMap />} />
        <Route path={PUBLIC_ROUTES.OFFICIALS} element={<PublicOfficials />} />
        <Route path={PUBLIC_ROUTES.CONTACT} element={<PublicContact />} />
        <Route path="/developer-portal" element={<DeveloperPortal />} />
        <Route path={PUBLIC_ROUTES.PET_QR_SCANNER} element={<PetQRScanner />} />
        <Route path="*" element={<PublicNotFound />} />
      </Routes>
    </RequestProvider>
  );
}

function AppRoutes() {
  // Use React Router's useLocation instead of window.location
  const location = useLocation();
  const isAdminRoutePath = isAdminRoute(location.pathname);
  const isSetupAccountRoute = location.pathname === AUTH_ROUTES.SETUP_ACCOUNT;
  const isAuthRoutePath = isAuthRoute(location.pathname);

  // Handle setup-account route that might be accessed without /admin prefix
  if (isSetupAccountRoute) {
    return <AdminRoutes />;
  }

  // Handle auth routes - these should be accessible without authentication
  if (isAuthRoutePath) {
    return <AdminRoutes />;
  }

  if (isAdminRoutePath) {
    // AdminRoutes now handles its own AuthProvider context
    return <AdminRoutes />;
  }

  // For public routes, wrap with BarangayProvider and don't call useAuth
  return (
    <BarangayProvider>
      <PublicRoutes />
    </BarangayProvider>
  );
}

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="bims-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
