import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import useRoles from "@/hooks/useRoles";
import { Loader2 } from "lucide-react";
import { ADMIN_ROUTES } from "@/constants/routes";

const SetupGuard = ({ children }) => {
  const { isSetup, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const { role } = useRoles();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 mr-2 text-primary" />
        <span className="text-lg text-muted-foreground">
          Checking setup status...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ADMIN_ROUTES.LOGIN} replace />;
  }

  const setupPath =
    role === "municipality"
      ? ADMIN_ROUTES.MUNICIPALITY.SETUP
      : role === "barangay"
      ? ADMIN_ROUTES.BARANGAY.SETUP
      : "/admin/setup";

  const dashboardPath =
    role === "municipality"
      ? ADMIN_ROUTES.MUNICIPALITY.DASHBOARD
      : role === "barangay"
      ? ADMIN_ROUTES.BARANGAY.DASHBOARD
      : "/admin";

  if (isSetup && location.pathname === setupPath) {
    return <Navigate to={dashboardPath} replace />;
  }

  if (!isSetup && location.pathname !== setupPath) {
    sessionStorage.setItem("postSetupRedirect", location.pathname);
    return <Navigate to={setupPath} replace />;
  }

  return children;
};

export default SetupGuard;
