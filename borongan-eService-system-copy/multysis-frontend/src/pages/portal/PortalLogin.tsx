/**
 * PortalLogin.tsx — v2
 *
 * Portal login: Username + Password  OR  Google OAuth
 * Replaces the old Phone Number + OTP flow.
 */

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

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
import { Separator } from '@/components/ui/separator';

import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
// Validation schema
const loginSchema = z.object({
  username: z.string().min(3, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginInput = z.infer<typeof loginSchema>;

// Google logo SVG
const GoogleIcon = () => (
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
);

export const PortalLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  // Username + password login
  const handleSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      await login({ username: data.username, password: data.password });
      toast({ title: 'Welcome back!' });
      navigate('/portal');
      window.location.reload();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: err.message || 'Invalid username or password',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth
  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // Redirect to backend Google OAuth initiation endpoint
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/auth/portal/google`;
  };

  // Handle Google OAuth callback result from URL params
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleLogin = params.get('google_login');
    const googleError = params.get('google_error');

    if (googleLogin === 'success') {
      toast({ title: 'Welcome back!' });
      navigate('/portal');
      window.location.reload();
    } else if (googleError) {
      const messages: Record<string, string> = {
        NOT_REGISTERED: 'This Google account is not registered. Please register first.',
        ACCOUNT_INACTIVE: 'Your account is inactive. Please contact the administrator.',
        access_denied: 'Google sign-in was cancelled.',
        failed: 'Google sign-in failed. Please try again.',
      };
      toast({
        variant: 'destructive',
        title: 'Google Sign-in Failed',
        description: messages[googleError] || 'Google sign-in failed. Please try again.',
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-600 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="w-full max-w-md">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            Already submitted your application?{' '}
            <button
              type="button"
              onClick={() => navigate('/portal/register/status')}
              className="font-medium text-primary hover:underline"
            >
              Check registration status →
            </button>
          </p>
        </div>
        <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col items-center space-y-3">
            <img
              src="/logo-colored.svg"
              alt="LGU Logo"
              className="h-16 w-auto"
            />
            <div className="text-center">
              <CardTitle className="text-2xl font-semibold text-heading-700">
                Resident Portal
              </CardTitle>
              <p className="text-sm text-heading-500 mt-1">Local Government System</p>
            </div>
          </div>
          <CardTitle className="text-xl font-semibold text-center text-heading-700">
            Welcome Back
          </CardTitle>
        </CardHeader>

        <CardContent className="px-8 pb-8 space-y-5">
          {/* Google OAuth button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium"
            disabled={isGoogleLoading || isLoading}
            onClick={handleGoogleLogin}
          >
            <GoogleIcon />
            {isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-3 text-xs text-gray-400">
              or sign in with username
            </span>
          </div>

          {/* Username + Password form */}
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Username</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter your username"
                        disabled={isLoading}
                        className="h-12 text-base"
                        autoComplete="username"
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
                        placeholder="Enter your password"
                        disabled={isLoading}
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className={cn('w-full h-12 text-base font-medium')}
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center text-sm">
                <p className="text-gray-600">
                  New resident?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/portal/register')}
                    className="font-medium text-primary hover:underline"
                  >
                    Register here
                  </button>
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
        </Card>
      </div>
    </div>
  );
};
