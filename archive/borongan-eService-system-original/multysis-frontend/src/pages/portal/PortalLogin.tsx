// React imports
import React, { useState, useEffect } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export const PortalLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { openSignupSheet } = useLoginSheet();
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
          navigate('/portal');
          window.location.reload();
        } catch (err: any) {
          // If verifyOtp fails, try the old login method as fallback
          await login(data);
          toast({
            title: 'Success',
            description: 'Welcome back!',
          });
          navigate('/portal');
          window.location.reload();
        }
        return;
      }
      
      // OTP is required, proceed to OTP step
      setPhoneNumber(data.phoneNumber);
      otpForm.setValue('phoneNumber', data.phoneNumber);
      setStep('otp');
      setResendCooldown(60); // Start 60-second cooldown
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
      // Navigate - AuthContext will refresh user state on route change
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
      // We need to get the password from the credentials form
      // For resend, we'll need to store it or ask user to re-enter
      // For now, we'll show an error if password is not available
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
    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
      otpForm.handleSubmit(handleOtpSubmit)();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-600 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="space-y-4 pb-6 w-100 m-0">
          <div className="flex flex-col items-center space-y-3 m-0">
            <img 
              src="/logo-colored.svg" 
              alt="City of Borongan Logo" 
              className="h-16 w-auto"
            />
            <div className="text-center">
              <CardTitle className="text-2xl font-semibold text-heading-700">
                City of Borongan
              </CardTitle>
              <p className="text-sm text-heading-500 mt-1">Local Government System</p>
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-center text-heading-700 mt-4">
            {step === 'credentials' ? 'Welcome Back' : 'Verify OTP'}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {step === 'credentials' ? (
            <Form {...credentialsForm}>
              <form className="space-y-6" onSubmit={credentialsForm.handleSubmit(handleCredentialsSubmit)}>
                <FormField
                  control={credentialsForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="09XXXXXXXXX"
                          disabled={isLoading}
                          className="h-12 text-base"
                        />
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
                      <FormLabel className="text-base font-medium">Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          {...field}
                          placeholder="Enter your password"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className={cn("w-full h-12 text-base font-medium")}
                  disabled={isLoading}
                >
                  {isLoading ? 'Verifying...' : 'Continue'}
                </Button>

                <div className="text-center text-base">
                  <span className="text-gray-600">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/portal');
                      setTimeout(() => {
                        openSignupSheet();
                      }, 100);
                    }}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form className="space-y-6" onSubmit={otpForm.handleSubmit(handleOtpSubmit)}>
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    We've sent a verification code to
                  </p>
                  <p className="text-base font-medium text-heading-700">{phoneNumber}</p>
                </div>

                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-center block">
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
                  className={cn("w-full h-12 text-base font-medium")}
                  disabled={isLoading || otpForm.watch('otp').length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Login'}
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
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ← Back to login
                    </button>
                  </div>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
