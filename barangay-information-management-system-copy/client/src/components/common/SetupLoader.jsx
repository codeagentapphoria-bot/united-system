import React from "react";
import { Loader2, Building2, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SetupLoader = ({ role }) => {
  const [loadingTime, setLoadingTime] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLoadingTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getRoleIcon = () => {
    return role === "municipality" ? (
      <Building2 className="w-12 h-12 text-primary" />
    ) : (
      <MapPin className="w-12 h-12 text-primary" />
    );
  };

  const getRoleText = () => {
    return role === "municipality" ? "Municipality" : "Barangay";
  };

  const getLoadingMessage = () => {
    if (loadingTime < 3) {
      return `Verifying your ${getRoleText().toLowerCase()} configuration`;
    } else if (loadingTime < 6) {
      return "Checking setup status...";
    } else if (loadingTime < 9) {
      return "Almost done...";
    } else {
      return "This is taking longer than usual. Please wait...";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md mx-4 shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-6">
            {/* Role Icon */}
            <div className="p-4 bg-primary/10 rounded-full">
              {getRoleIcon()}
            </div>

            {/* Loading Animation */}
            <div className="flex items-center space-x-3">
              <Loader2 className="animate-spin w-6 h-6 text-primary" />
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                Checking {getRoleText()} Setup...
              </span>
            </div>

            {/* Status Text */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getLoadingMessage()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {loadingTime > 5
                  ? `Loading for ${loadingTime}s...`
                  : "This may take a few moments"}
              </p>
            </div>

            {/* Progress Dots */}
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <div
                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupLoader;
