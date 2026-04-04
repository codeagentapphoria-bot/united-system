// React imports
import React, { useState, useEffect } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

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

// Utils
import { cn } from '@/lib/utils';
import { FiLock, FiLogIn, FiUser } from 'react-icons/fi';

// Supabase Auth
import { supabase } from '@/lib/supabase';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginInput = z.infer<typeof loginSchema>;

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
  const { closeLoginSheet } = useLoginSheet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  // Reset form when sheet closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const handleSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      await login({ username: data.username, password: data.password });
      toast({ title: 'Welcome back!' });
      form.reset();
      closeLoginSheet();
      navigate('/portal');
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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/portal` },
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: err.message || 'Failed to login with Google. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToRegister = () => {
    closeLoginSheet();
    navigate('/portal/register');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" hideClose>
        {/* Decorative Header */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-primary-600 -mt-6">
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <img src="/logo-white.svg" alt="Logo" className="h-12 w-auto" />
          </div>
        </div>

        <div className="mt-24">
          <SheetHeader>
            <SheetTitle className="text-3xl font-bold text-heading-700">Welcome Back</SheetTitle>
            <SheetDescription className="text-base text-heading-600 mt-2">
              Sign in to access government services
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8">
            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-heading-700">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
                          <Input {...field} placeholder="Enter your username" disabled={isLoading} className="h-12 text-base pl-10" />
                        </div>
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
                      <FormLabel className="text-base font-medium text-heading-700">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
                          <PasswordInput {...field} placeholder="Enter your password" disabled={isLoading} className="h-12 pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className={cn('w-full h-12 text-base font-medium bg-primary-600 hover:bg-primary-700 text-white')}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span>Signing in...</span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <FiLogIn size={18} className="mr-2" /> Sign In
                    </span>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-heading-500">or</span>
                  </div>
                </div>

                {/* Google Login */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full h-12 text-base font-medium border-gray-300 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-heading-500">New here?</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSwitchToRegister}
                  className="w-full h-12 text-base font-medium border-primary-600 text-primary-600 hover:bg-primary-50"
                >
                  <FiUser size={18} className="mr-2" /> Register
                </Button>

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 text-center">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { closeLoginSheet(); navigate('/portal/register/status'); }}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      Check Status
                    </button>
                  </p>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
