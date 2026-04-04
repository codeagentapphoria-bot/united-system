import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import useRoles from "@/hooks/useRoles";
import SetupLoader from "@/components/common/SetupLoader";
import { ADMIN_ROUTES } from "@/constants/routes";

const SetupRouter = ({ children }) => {
  const { isAuthenticated, loading, isSetup, isInitialized, setupLoading } =
    useAuth();
  const { role } = useRoles();
  const location = useLocation();

  const paths =
    role === "municipality"
      ? {
          setup: "/admin/municipality/setup",
          dashboard: "/admin/municipality/dashboard",
        }
      : role === "barangay"
      ? {
          setup: "/admin/barangay/setup",
          dashboard: "/admin/barangay/dashboard",
        }
      : { setup: "/admin/setup", dashboard: "/admin" };

  if (loading || !isInitialized || (isAuthenticated && setupLoading)) {
    return <SetupLoader role={role} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ADMIN_ROUTES.LOGIN} replace />;
  }

  if (isSetup) {
    if (location.pathname === paths.setup) {
      return <Navigate to={paths.dashboard} replace />;
    }
    return children;
  }

  if (location.pathname !== paths.setup) {
    sessionStorage.setItem("postSetupRedirect", location.pathname);
    return <Navigate to={paths.setup} replace />;
  }

  return children;
};

export default SetupRouter;
