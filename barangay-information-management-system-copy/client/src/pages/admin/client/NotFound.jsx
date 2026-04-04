import React from "react";
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Home, 
  Users, 
  FileText, 
  BarChart3, 
  Settings, 
  ArrowLeft, 
  Search,
  Shield,
  Map
} from "lucide-react";
import { ADMIN_ROUTES } from "@/constants/routes";
import useAuth from "@/hooks/useAuth";
import useRoles from "@/hooks/useRoles";

const NotFound = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { role } = useRoles();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // Determine the appropriate dashboard route based on user role
  const getDashboardRoute = () => {
    if (role === "municipality") {
      return ADMIN_ROUTES.MUNICIPALITY.DASHBOARD;
    } else if (role === "barangay") {
      return ADMIN_ROUTES.BARANGAY.DASHBOARD;
    }
    return "/admin";
  };

  // Get role-specific navigation options
  const getNavigationOptions = () => {
    if (role === "municipality") {
      return [
        { 
          title: "Dashboard", 
          icon: BarChart3, 
          route: ADMIN_ROUTES.MUNICIPALITY.DASHBOARD,
          color: "bg-blue-600 hover:bg-blue-700"
        },
        { 
          title: "Residents", 
          icon: Users, 
          route: ADMIN_ROUTES.MUNICIPALITY.RESIDENTS,
          color: "bg-green-600 hover:bg-green-700"
        },
        { 
          title: "Barangays", 
          icon: Map, 
          route: ADMIN_ROUTES.MUNICIPALITY.BARANGAYS,
          color: "bg-purple-600 hover:bg-purple-700"
        },

      ];
    } else if (role === "barangay") {
      return [
        { 
          title: "Dashboard", 
          icon: BarChart3, 
          route: ADMIN_ROUTES.BARANGAY.DASHBOARD,
          color: "bg-blue-600 hover:bg-blue-700"
        },
        { 
          title: "Residents", 
          icon: Users, 
          route: ADMIN_ROUTES.BARANGAY.RESIDENTS,
          color: "bg-green-600 hover:bg-green-700"
        },
        { 
          title: "Households", 
          icon: Home, 
          route: ADMIN_ROUTES.BARANGAY.HOUSEHOLDS,
          color: "bg-purple-600 hover:bg-purple-700"
        },
        { 
          title: "Requests", 
          icon: FileText, 
          route: ADMIN_ROUTES.BARANGAY.REQUESTS,
          color: "bg-orange-600 hover:bg-orange-700"
        }
      ];
    }
    return [];
  };

  const navigationOptions = getNavigationOptions();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-3xl w-full">
        <Card className="border-0 shadow-xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
                <Search className="w-12 h-12 text-red-500" />
              </div>
              <h1 className="text-6xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                404
              </h1>
              <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Admin Page Not Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                The administrative page you're looking for doesn't exist or you don't have access to it.
              </p>
              {role && (
                <div className="mt-4 inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                  <Shield className="w-4 h-4 mr-2" />
                  Logged in as {role.charAt(0).toUpperCase() + role.slice(1)} Administrator
                </div>
              )}
            </div>

            {/* Error Details */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Requested URL:</strong>
              </p>
              <code className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded break-all">
                {location.pathname}
              </code>
            </div>

            {/* Helpful Actions */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
                Quick Navigation:
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {navigationOptions.map((option, index) => (
                  <Link key={index} to={option.route}>
                    <Button className={`w-full h-12 ${option.color} text-white`} variant="default">
                      <option.icon className="w-4 h-4 mr-2" />
                      {option.title}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Additional Help */}
            <div className="text-center space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={getDashboardRoute()}>
                  <Button variant="outline" className="border-gray-300 dark:border-gray-600">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                
                <Link to={role === "municipality" ? ADMIN_ROUTES.MUNICIPALITY.SETTINGS : ADMIN_ROUTES.BARANGAY.SETTINGS}>
                  <Button variant="outline" className="border-gray-300 dark:border-gray-600">
                    <Settings className="w-4 h-4 mr-2" />
                    System Settings
                  </Button>
                </Link>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400">
                If you believe this is an error, please contact your system administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
