// React imports
import React, { useState } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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

// Hooks
import { useAuth as _useAuth } from '@/context/AuthContext';
import { authService } from '@/services/api/auth.service';
import { useLoginSheet } from '@/context/LoginSheetContext';
import { useToast } from '@/hooks/use-toast';

// Types and Schemas
import { signupSchema, type SignupInput } from '@/validations/auth.schema';

// Utils
import { cn } from '@/lib/utils';

export const PortalSignup: React.FC = () => {
  const navigate = useNavigate();
  void _useAuth; // context used below for navigation guards
  const { openLoginSheet } = useLoginSheet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: SignupInput) => {
    setIsLoading(true);

    try {
      await (authService as any).signup?.(data);
      toast({
        title: 'Success',
        description: 'Your account has been created!',
      });
      navigate('/portal');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: err.message || err.response?.data?.message || 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-600 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex flex-col items-center space-y-3">
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
            Create Account
          </CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">First Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="Juan"
                          disabled={isLoading}
                          className="h-12 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Last Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="Dela Cruz"
                          disabled={isLoading}
                          className="h-12 text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Middle Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Santos (optional)"
                        disabled={isLoading}
                        className="h-12 text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="email@example.com (optional)"
                        disabled={isLoading}
                        className="h-12 text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Create a strong password"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Confirm Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Re-enter your password"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        I agree to the Terms and Conditions *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className={cn("w-full h-12 text-base font-medium")}
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </Button>

              <div className="text-center text-base">
                <span className="text-gray-600">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    navigate('/portal');
                    setTimeout(() => {
                      openLoginSheet();
                    }, 100);
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </button>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  Are you a new resident?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/portal/register')}
                    className="font-medium text-primary-600 hover:underline"
                  >
                    Register with Document Verification
                  </button>
                </p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Submit ID and selfie for admin verification to get full access
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
