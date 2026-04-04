import React from "react";
import { Navigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import useRoles from "@/hooks/useRoles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield } from "lucide-react";
import { ADMIN_ROUTES } from "@/constants/routes";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const PermissionRoute = ({ permission, children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { permissionLevel } = useRoles();

  if (loading) {
    return (
      <LoadingSpinner 
        message="Checking permissions..." 
        variant="default"
        size="lg"
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ADMIN_ROUTES.LOGIN} replace />;
  }

  const allowedPermissions = Array.isArray(permission)
    ? permission
    : [permission];

  if (!allowedPermissions.includes(permissionLevel)) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Shield className="h-5 w-5" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-red-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Insufficient Permissions
                </h3>
                <p className="text-gray-600 mb-4">
                  Your current permission level ({permissionLevel}) does not
                  have permission to access this page. Required permissions:{" "}
                  {allowedPermissions.join(", ")}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => window.history.back()}
                    variant="outline"
                  >
                    Go Back
                  </Button>
                  <Button onClick={() => (window.location.href = "/admin")}>
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return children;
};

export default PermissionRoute;
