// React imports
import React, { useState, useEffect } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { OtpInput } from '@/components/ui/otp-input';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useLoginSheet } from '@/context/LoginSheetContext';
import { useToast } from '@/hooks/use-toast';

// Types and Schemas
import { loginSchema, otpVerifySchema, type LoginInput, type OtpVerifyInput } from '@/validations/auth.schema';

// Services
import { authService } from '@/services/api/auth.service';

// Utils
import { cn } from '@/lib/utils';
import { FiLock, FiLogIn, FiPhone, FiUser } from 'react-icons/fi';

// Supabase Auth
import { supabase } from '@/lib/supabase';

interface PortalLoginSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PortalLoginSheet: React.FC<PortalLoginSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { closeLoginSheet, openSignupSheet } = useLoginSheet();
  const { toast } = useToast();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const credentialsForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: '',
      password: '',
    },
  });

  const otpForm = useForm<OtpVerifyInput>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: {
      phoneNumber: '',
      otp: '',
    },
  });

  // Reset forms when sheet closes
  useEffect(() => {
    if (!open) {
      setStep('credentials');
      setPhoneNumber('');
      setResendCooldown(0);
      credentialsForm.reset();
      otpForm.reset();
    }
  }, [open, credentialsForm, otpForm]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCredentialsSubmit = async (data: LoginInput) => {
    setIsLoading(true);

    try {
      const result = await authService.verifyCredentials(data.phoneNumber, data.password);
      
      // If OTP is not required, complete login directly
      if (!result.otpRequired) {
        // Complete login without OTP - use a bypass code
        try {
          await authService.verifyOtp(data.phoneNumber, 'BYPASS');
          toast({
            title: 'Success',
            description: 'Welcome back!',
          });
          credentialsForm.reset();
          otpForm.reset();
          closeLoginSheet();
          navigate('/portal');
          window.location.reload();
        } catch (err: any) {
          // If verifyOtp fails, try the old login method as fallback
          await login(data);
          toast({
            title: 'Success',
            description: 'Welcome back!',
          });
          credentialsForm.reset();
          closeLoginSheet();
          navigate('/portal');
          window.location.reload();
        }
        return;
      }
      
      // OTP is required, proceed to OTP step
      setPhoneNumber(data.phoneNumber);
      otpForm.setValue('phoneNumber', data.phoneNumber);
      setStep('otp');
      setResendCooldown(60);
      toast({
        title: 'OTP Sent',
        description: `We've sent a verification code to ${data.phoneNumber}`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: err.message || 'Invalid credentials',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (data: OtpVerifyInput) => {
    setIsLoading(true);

    try {
      await authService.verifyOtp(data.phoneNumber, data.otp);
      toast({
        title: 'Success',
        description: 'Welcome back!',
      });
      credentialsForm.reset();
      otpForm.reset();
      closeLoginSheet();
      navigate('/portal');
      // Force a page reload to ensure auth state is refreshed
      window.location.reload();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'OTP Verification Failed',
        description: err.message || 'Invalid OTP code',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !phoneNumber) return;

    setIsLoading(true);
    try {
      const password = credentialsForm.getValues('password');
      if (!password) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please go back and re-enter your credentials',
        });
        return;
      }

      await authService.verifyCredentials(phoneNumber, password);
      setResendCooldown(60);
      toast({
        title: 'OTP Resent',
        description: `We've sent a new verification code to ${phoneNumber}`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to resend OTP',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    otpForm.setValue('otp', value);
    if (value.length === 6) {
      otpForm.handleSubmit(handleOtpSubmit)();
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/portal`,
        },
      });

      if (error) {
        throw error;
      }

      // If no redirect URL, Supabase will use popup mode
      // If there's a redirect URL, the page will redirect and come back
      if (!data.url) {
        // Popup mode - session will be detected automatically
        console.log('Google OAuth initiated in popup mode');
      }
    } catch (err: any) {
      console.error('Google login error:', err);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: err.message || 'Failed to login with Google. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToSignup = () => {
    closeLoginSheet();
    setTimeout(() => {
      openSignupSheet();
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" hideClose>
        {/* Decorative Header */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-primary-600 -mt-6">
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <img 
              src="/logo-white.svg" 
              alt="City of Borongan Logo" 
              className="h-12 w-auto"
            />
            <p className="text-white text-xs font-medium">City of Borongan</p>
          </div>
        </div>

        <div className="mt-24">
          <SheetHeader>
            <SheetTitle className="text-3xl font-bold text-heading-700">
              {step === 'credentials' ? 'Welcome Back' : 'Verify OTP'}
            </SheetTitle>
            <SheetDescription className="text-base text-heading-600 mt-2">
              {step === 'credentials'
                ? 'Sign in to your account to access all government services'
                : 'Enter the verification code sent to your phone'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8">
            {step === 'credentials' ? (
              <Form {...credentialsForm}>
                <form className="space-y-6" onSubmit={credentialsForm.handleSubmit(handleCredentialsSubmit)}>
                  <FormField
                    control={credentialsForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-heading-700">
                          Phone Number
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
                            <Input
                              {...field}
                              type="tel"
                              placeholder="09XXXXXXXXX"
                              disabled={isLoading}
                              className="h-12 text-base pl-10"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={credentialsForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-heading-700">
                          Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
                            <PasswordInput
                              {...field}
                              placeholder="Enter your password"
                              disabled={isLoading}
                              className="h-12 pl-10"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className={cn(
                      'w-full h-12 text-base font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg transition-all'
                    )}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <span className="mr-2">Verifying...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <FiLogIn size={18} className="mr-2" />
                        Continue
                      </span>
                    )}
                  </Button>

                  {/* Google Login Button */}
                  <>
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-white text-heading-500">or</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full h-12 text-base font-medium border-gray-300 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </Button>
                  </>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-heading-500">New to City of Borongan?</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSwitchToSignup}
                    className="w-full h-12 text-base font-medium border-primary-600 text-primary-600 hover:bg-primary-50"
                  >
                    <FiUser size={18} className="mr-2" />
                    Create Account
                  </Button>

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 text-center">
                      Are you a new resident?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          closeLoginSheet();
                          navigate('/portal/register');
                        }}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        Register with ID Verification
                      </button>
                    </p>
                  </div>
                </form>
              </Form>
            ) : (
              <Form {...otpForm}>
                <form className="space-y-6" onSubmit={otpForm.handleSubmit(handleOtpSubmit)}>
                  <div className="text-center space-y-2">
                    <p className="text-sm text-heading-600">
                      We've sent a verification code to
                    </p>
                    <p className="text-base font-medium text-heading-700">{phoneNumber}</p>
                  </div>

                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-heading-700 text-center block">
                          Enter 6-digit code
                        </FormLabel>
                        <FormControl>
                          <OtpInput
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              handleOtpChange(value);
                            }}
                            disabled={isLoading}
                            error={!!otpForm.formState.errors.otp}
                          />
                        </FormControl>
                        <FormMessage className="text-center" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className={cn(
                      'w-full h-12 text-base font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg transition-all'
                    )}
                    disabled={isLoading || otpForm.watch('otp').length !== 6}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <span className="mr-2">Verifying...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <FiLogIn size={18} className="mr-2" />
                        Verify & Login
                      </span>
                    )}
                  </Button>

                  <div className="text-center space-y-2">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isLoading}
                      className={cn(
                        "text-sm font-medium text-primary hover:underline",
                        (resendCooldown > 0 || isLoading) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {resendCooldown > 0
                        ? `Resend OTP in ${resendCooldown}s`
                        : 'Resend OTP'}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setStep('credentials');
                          otpForm.reset();
                          setResendCooldown(0);
                        }}
                        className="text-sm text-heading-600 hover:text-heading-800"
                      >
                        ← Back to login
                      </button>
                    </div>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

