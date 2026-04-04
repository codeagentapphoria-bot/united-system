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
  ArrowLeft, 
  Mail, 
  Shield, 
  CheckCircle, 
  Lock,
  ArrowRight,
  Users,
  FileText,
  BarChart3,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/images/lgu-borongan.png";
import { ADMIN_ROUTES } from "@/constants/routes";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
});

export const ForgotPasswordForm = () => {
  const [loading, setLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailSent(true);
        toast({
          title: "Reset Code Sent",
          description: "Please check your email for the reset code.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send reset code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate(ADMIN_ROUTES.LOGIN);
  };

  const handleResetPassword = () => {
    navigate("/reset-password");
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
                  Secure Access to
                  <span className="block text-primary mt-2">
                    Your Community
                  </span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Don't worry if you've forgotten your password. We'll help you
                  regain access to your BIMS account securely and quickly.
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

              {/* Security Note */}
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-success" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Secure Password Reset</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your security is our priority. Reset codes are sent securely to your registered email.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Forgot Password Form */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md">
              {/* Mobile Hero Section */}
              <div className="text-center mb-8 lg:hidden">
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Forgot Your
                    <span className="block text-primary">Password?</span>
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    We'll help you regain access to your account
                  </p>
                </div>
              </div>

              {/* Forgot Password Form Card */}
              <Card className="shadow-lg border-border">
                <CardHeader className="space-y-1 pb-6">
                  <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center lg:text-left">
                    Reset Password
                  </CardTitle>
                  <p className="text-sm text-muted-foreground text-center lg:text-left">
                    Enter your email to receive a reset code
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {emailSent ? (
                    <div className="text-center space-y-6">
                      <div className="flex justify-center">
                        <div className="p-4 bg-success/10 rounded-full">
                          <CheckCircle className="h-8 w-8 text-success" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Reset Code Sent!
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          We've sent a 6-digit reset code to your email address.
                          Please check your inbox and enter the code to reset your password.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Button
                          onClick={handleResetPassword}
                          className="w-full h-12 text-base font-semibold"
                        >
                          <div className="flex items-center gap-2">
                            Enter Reset Code
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleBackToLogin}
                          className="w-full h-12"
                        >
                          Back to Login
                        </Button>
                      </div>
                    </div>
                  ) : (
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
                            placeholder="Enter your email address"
                            autoComplete="email"
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

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold"
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                            Sending Reset Code...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            Send Reset Code
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        )}
                      </Button>

                      {/* Back to Login Link */}
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleBackToLogin}
                          className="text-muted-foreground hover:text-foreground text-sm"
                        >
                          <ArrowLeft className="h-4 w-4 mr-2" />
                          Back to Login
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Security Note */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center gap-2 justify-center">
                      <Shield className="h-4 w-4 text-success" />
                      <p className="text-xs text-muted-foreground">
                        Secure password reset process
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
