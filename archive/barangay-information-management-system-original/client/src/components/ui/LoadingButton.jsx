import React from "react";
import { Button } from "./button";
import { Loader2 } from "lucide-react";

const LoadingButton = ({
  children,
  loading = false,
  loadingText = "Loading...",
  disabled,
  variant = "default",
  size = "default",
  className = "",
  ...props
}) => {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </Button>
  );
};

export default LoadingButton;
