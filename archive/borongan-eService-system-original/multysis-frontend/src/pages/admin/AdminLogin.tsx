// React imports
import React, { useState } from 'react';

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

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Types and Schemas
import { adminLoginSchema, type AdminLoginInput } from '@/validations/auth.schema';

// Utils
import { cn } from '@/lib/utils';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: AdminLoginInput) => {
    setIsLoading(true);

    try {
      await login({ email: data.email, password: data.password }, true);
      toast({
        title: 'Success',
        description: 'Welcome back, Admin!',
      });
      navigate('/admin/dashboard');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: err.message || err.response?.data?.message || 'Invalid credentials',
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
          </div>
          <CardTitle className="text-2xl font-semibold text-center text-heading-700 mt-4">
            Admin Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="admin@example.com"
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
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>
          <p className='text-center text-sm text-gray-500 mt-4'>Version 6.0.0</p>
        </CardContent>
      </Card>
    </div>
  );
};
