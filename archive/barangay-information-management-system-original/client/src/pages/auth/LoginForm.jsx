import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Eye,
  EyeOff,
  Building,
  Shield,
  ArrowRight,
  CheckCircle,
  Mail,
  Lock,
  Users,
  FileText,
  BarChart3,
  Sparkles,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import useRoles from "@/hooks/useRoles";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/images/lgu-borongan.png";

const authSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  targetType: z.enum(["barangay", "municipality"]),
});

export const LoginForm = () => {
  const [showPassword, setShowPassword] = React.useState(false);
  const { login, loading, error, isAuthenticated } = useAuth();
  const { role } = useRoles();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      targetType: "barangay",
    },
  });

  const onSubmit = async (values) => {
    const result = await login(values.email, values.password);
    if (result.success) {
      toast({
        title: "Login Successful",
        description: "Welcome back! You have successfully signed in.",
      });
    }
  };

  const features = [
    {
      icon: Users,
      title: "Resident Management",
      description: "Comprehensive resident database and profile management"
    },
    {
      icon: FileText,
      title: "Document Processing",
      description: "Digital certificates and document generation"
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Real-time insights and detailed reporting"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security and data protection"
    },
  ];

  const benefits = [
    "Streamlined resident management",
    "Real-time data analytics",
    "Secure document processing",
    "Community insights dashboard",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <img src={logo} alt="BIMS Logo" className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">BIMS</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Barangay Information Management System
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Left Side - Hero/Features (Hidden on mobile, shown on desktop) */}
          <div className="hidden lg:flex lg:flex-1 bg-primary/5 p-8 xl:p-12">
            <div className="max-w-lg mx-auto flex flex-col justify-center">
              <div className="mb-8">
                <h1 className="text-3xl xl:text-4xl font-bold text-foreground mb-4 leading-tight">
                  Empowering Communities Through
                  <span className="block text-primary mt-2">
                    Digital Governance
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Transform your barangay operations with our comprehensive
                  management system. Streamline processes, enhance transparency,
                  and build stronger communities.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 gap-4 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border shadow-sm">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Benefits List */}
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="p-1 bg-success/10 rounded-full">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-sm text-foreground font-medium">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md">
              {/* Mobile Hero Section */}
              <div className="text-center mb-8 lg:hidden">
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Welcome to
                    <span className="block text-primary">BIMS</span>
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Your community management solution
                  </p>
                </div>
              </div>

              {/* Login Form Card */}
              <Card className="shadow-lg border-border">
                <CardHeader className="space-y-1 pb-6">
                  <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center lg:text-left">
                    Sign In
                  </CardTitle>
                  <p className="text-sm text-muted-foreground text-center lg:text-left">
                    Access your community management dashboard
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-2 text-destructive text-sm">
                        <Shield className="h-4 w-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          autoComplete="username"
                          className="pl-10 h-12 border-input focus-visible:ring-primary"
                          {...register("email")}
                          disabled={loading}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                          <Shield className="h-3 w-3 flex-shrink-0" />
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-foreground">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="pl-10 pr-12 h-12 border-input focus-visible:ring-primary"
                          {...register("password")}
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                          onClick={() => setShowPassword((v) => !v)}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errors.password && (
                        <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                          <Shield className="h-3 w-3 flex-shrink-0" />
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-semibold"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                          Signing In...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          Sign In
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </form>

                  {/* Forgot Password Link */}
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => navigate("/forgot-password")}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      Forgot your password?
                    </Button>
                  </div>

                  {/* Security Note */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 justify-center">
                      <Shield className="h-4 w-4 text-success" />
                      <p className="text-xs text-muted-foreground">
                        Secure access to your community management system
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mobile Features (Shown only on mobile) */}
              <div className="mt-8 lg:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {features.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <feature.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground text-xs">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-card border-t border-border mt-8 lg:mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            <p>
              &copy; 2025 Barangay Information Management System. All rights reserved.
            </p>
            <p className="mt-1">Developed for LGU Borongan</p>
          </div>
        </div>
      </div>
    </div>
  );
};