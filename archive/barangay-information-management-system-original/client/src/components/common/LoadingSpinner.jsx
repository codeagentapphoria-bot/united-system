import React from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const LoadingSpinner = ({ 
  message = "Loading...", 
  variant = "default", 
  size = "default",
  showCard = false,
  compact = false,
  className = ""
}) => {
  const [loadingTime, setLoadingTime] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLoadingTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getLoadingMessage = () => {
    if (loadingTime < 3) {
      return message;
    } else if (loadingTime < 6) {
      return "Almost done...";
    } else if (loadingTime < 9) {
      return "This is taking longer than usual...";
    } else {
      return "Please wait a moment longer...";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          container: compact ? "" : "h-32",
          icon: "h-4 w-4",
          text: "text-sm",
          card: "max-w-sm"
        };
      case "lg":
        return {
          container: compact ? "" : "h-96",
          icon: "h-12 w-12",
          text: "text-xl",
          card: "max-w-lg"
        };
      default:
        return {
          container: compact ? "" : "h-64",
          icon: "h-5 w-5",
          text: "text-base",
          card: "max-w-md"
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const loadingContent = (
    <div className={`flex items-center justify-center ${sizeClasses.container} ${compact ? "gap-2" : ""}`}>
      {compact ? (
        <>
          {/* Compact mode - just icon and text inline */}
          {variant === "dots" ? (
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
          ) : variant === "loader2" ? (
            <Loader2 className={`${sizeClasses.icon} animate-spin text-primary`} />
          ) : (
            <RefreshCw className={`${sizeClasses.icon} animate-spin text-primary`} />
          )}
          <span className={`${sizeClasses.text} font-medium text-foreground`}>
            {getLoadingMessage()}
          </span>
        </>
      ) : (
        <div className="text-center space-y-4">
          {/* Loading Icon */}
          <div className="flex justify-center">
            {variant === "dots" ? (
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
            ) : variant === "loader2" ? (
              <Loader2 className={`${sizeClasses.icon} animate-spin text-primary`} />
            ) : (
              <RefreshCw className={`${sizeClasses.icon} animate-spin text-primary`} />
            )}
          </div>

          {/* Loading Text */}
          <div className="space-y-2">
            <p className={`${sizeClasses.text} font-medium text-foreground`}>
              {getLoadingMessage()}
            </p>
            {loadingTime > 3 && (
              <p className="text-xs text-muted-foreground">
                Loading for {loadingTime}s...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (compact) {
    return loadingContent;
  }

  if (showCard) {
    return (
      <div className={`p-6 space-y-6 ${className}`}>
        <Card className={`w-full ${sizeClasses.card} mx-auto shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm`}>
          <CardContent className="p-8">
            {loadingContent}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {loadingContent}
    </div>
  );
};

export default LoadingSpinner;
