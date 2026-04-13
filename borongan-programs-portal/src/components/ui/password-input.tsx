import { cn } from "@/lib/utils";
import * as React from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Input } from "./input";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const PasswordInput: React.FC<PasswordInputProps & { ref?: React.Ref<HTMLInputElement> }> = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="w-full">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("h-12 text-base", error && "border-red-500", className)}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? (
              <FiEyeOff size={20} />
            ) : (
              <FiEye size={20} />
            )}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
)

PasswordInput.displayName = "PasswordInput"

