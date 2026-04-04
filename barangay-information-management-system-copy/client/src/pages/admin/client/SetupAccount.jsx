import React, { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import api from "@/utils/api";
import { ADMIN_ROUTES } from "@/constants/routes";
import { 
  LogOut, 
  Upload, 
  XCircle, 
  User, 
  Shield, 
  Mail, 
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Camera
} from "lucide-react";
import useAuth from "@/hooks/useAuth";

const setupSchema = z
  .object({
    barangayName: z.string().min(1, "Barangay name is required"),
    barangayCode: z.string().min(1, "Barangay code is required"),
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => {
    const hasUpperCase = /[A-Z]/.test(data.password);
    const hasLowerCase = /[a-z]/.test(data.password);
    const hasNumbers = /\d/.test(data.password);
    return hasUpperCase && hasLowerCase && hasNumbers;
  }, {
    message: "Password must contain uppercase, lowercase, and numbers",
    path: ["password"],
  });

export default function SetupAccount() {
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [picturePreview, setPicturePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [setupData, setSetupData] = useState(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [validatingToken, setValidatingToken] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  // Check for JWT token first, then fallback to URL params
  const token = params.get("token");
  const barangayName = params.get("barangayName") || "";
  const barangayCode = params.get("barangayCode") || "";
  const fullName = params.get("fullName") || "";
  const email = params.get("email") || "";
  const barangayId = params.get("barangayId") || "";
  
  const form = useForm({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      barangayName: "",
      barangayCode: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const { watch } = form;
  const password = watch("password");

  // Validate JWT token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        setValidatingToken(true);
        try {
          const response = await api.post("/validate-setup-token", { token });
          
          setSetupData(response.data.data);
          setTokenValid(true);
          
          // Update form with token data
          form.setValue("barangayName", response.data.data.barangayName);
          form.setValue("barangayCode", response.data.data.barangayCode);
          form.setValue("fullName", response.data.data.fullName);
          form.setValue("email", response.data.data.email);
        } catch (error) {
          console.error("❌ Token validation failed:", error);
          toast({
            title: "Invalid Setup Link",
            description: "This setup link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
          setTokenValid(false);
        } finally {
          setValidatingToken(false);
        }
      } else {
        // Fallback to URL params for backward compatibility
        if (barangayName || barangayCode || fullName || email) {
          form.setValue("barangayName", barangayName);
          form.setValue("barangayCode", barangayCode);
          form.setValue("fullName", fullName);
          form.setValue("email", email);
        }
        setTokenValid(true);
      }
    };

    validateToken();
  }, [token, form, toast, barangayName, barangayCode, fullName, email]);

  useEffect(() => {
    // Calculate password strength
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  useEffect(() => {
    async function checkIfUserHasPassword() {
      if (!email) return;
      try {
        const res = await api.get(
          `/user/by-email?email=${encodeURIComponent(email)}`
        );
        logger.debug("User: ", res.data);
        const user = res.data?.data;
        if (user && user.password) {
          navigate(`/admin/barangay/dashboard`);
        }
      } catch (err) {
        // 404 is expected when user doesn't exist yet (during setup)
        if (err.response?.status === 404) {
          logger.debug("User not found - this is expected during account setup");
        } else {
          logger.error("Error checking user password:", err);
        }
      }
    }
    checkIfUserHasPassword();
  }, [email, navigate]);

  const handlePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image file must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPicturePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePicture = () => {
    setSelectedFile(null);
    setPicturePreview(null);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return "bg-destructive";
    if (passwordStrength <= 3) return "bg-warning";
    if (passwordStrength <= 4) return "bg-primary";
    return "bg-success";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Good";
    return "Strong";
  };

  // Check for email conflicts
  const checkForEmailConflicts = async (email) => {
    try {
      const response = await api.get("/user/conflicts", {
        params: { email }
      });
      return response.data.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error checking for email conflicts:", error);
}
      return { hasConflicts: false, conflicts: [] };
    }
  };

  const onSubmit = async (data) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Use the public complete-account-setup endpoint — no auth required.
      // The setup token acts as authentication for this operation.
      const activeToken = token || setupData?.token;
      if (!activeToken) {
        toast({
          title: "Invalid setup link",
          description: "Setup token is missing. Please use the link from your email.",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append("token", activeToken);
      formData.append("fullname", data.fullName);
      formData.append("password", data.password);

      if (selectedFile) {
        formData.append("picturePath", selectedFile);
      }

      await api.post("/complete-account-setup", formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast({
        title: "Account setup complete!",
        description: "You can now log in with your new credentials.",
      });
      navigate(ADMIN_ROUTES.LOGIN);
    } catch (error) {
      logger.error("Setup error:", error);
      toast({
        title: "Error setting up account",
        description: error.response?.data?.message || "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate(ADMIN_ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Complete Your Account Setup
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Welcome to BIMS! Let's get your barangay admin account ready. This will only take a few minutes.
          </p>
        </div>

        {/* Loading State */}
        {validatingToken && (
          <Card className="shadow-lg border-border">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground">Validating setup link...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Setup Card */}
        {!validatingToken && (
          <Card className="shadow-lg border-border">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-foreground">
                    Account Information
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set up your password and profile picture
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </Button>
              </div>
            </CardHeader>

          <CardContent className="space-y-6">
            {/* Pre-filled Information */}
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Pre-filled Information
                </h3>
                <span className="text-xs text-muted-foreground italic">
                  Can be edited later once signed in
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Barangay Name</label>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {setupData?.barangayName || form.getValues("barangayName") || barangayName}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Barangay Code</label>
                  <Badge variant="secondary" className="text-xs">
                    {setupData?.barangayCode || form.getValues("barangayCode") || barangayCode}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {setupData?.fullName || form.getValues("fullName") || fullName}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {setupData?.email || form.getValues("email") || email}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Picture Upload */}
                <div className="space-y-3">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Profile Picture
                    <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </FormLabel>
                  
                  <div className="space-y-3">
                    {picturePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={picturePreview}
                          alt="Profile preview"
                          className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-md"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={removePicture}
                          className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0 shadow-md"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePictureChange}
                          className="hidden"
                          id="picture-upload"
                        />
                        <label htmlFor="picture-upload" className="cursor-pointer">
                          <div className="flex flex-col items-center text-muted-foreground">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                              <Camera className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium">Upload Profile Picture</span>
                            <span className="text-xs text-muted-foreground mt-1">
                              JPG, PNG, GIF (Max 5MB)
                            </span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Password Section */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Create Password
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Choose a strong password to secure your account
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="pr-10"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                        
                        {/* Password Strength Indicator */}
                        {password && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                                  style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">
                                {getPasswordStrengthText()}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? 'bg-success' : 'bg-muted'}`} />
                                At least 8 characters
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-success' : 'bg-muted'}`} />
                                Uppercase letter
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(password) ? 'bg-success' : 'bg-muted'}`} />
                                Lowercase letter
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${/\d/.test(password) ? 'bg-success' : 'bg-muted'}`} />
                                Number
                              </div>
                            </div>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">
                          Confirm Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm your password"
                              className="pr-10"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <Eye className="w-4 h-4 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Submit Button */}
                <div className="space-y-4">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                        Setting up your account...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Complete Account Setup
                      </div>
                    )}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    By completing this setup, you agree to our terms of service and privacy policy.
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
