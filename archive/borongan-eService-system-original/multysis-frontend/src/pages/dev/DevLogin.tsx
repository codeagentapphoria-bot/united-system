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
import { devLoginSchema, type DevLoginInput } from '@/validations/dev.schema';

// Utils
import { cn } from '@/lib/utils';

export const DevLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DevLoginInput>({
    resolver: zodResolver(devLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: DevLoginInput) => {
    setIsLoading(true);

    try {
      await login({ email: data.email, password: data.password }, false, true);
      toast({
        title: 'Success',
        description: 'Welcome to Developer Portal!',
      });
      navigate('/dev/dashboard');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg shadow-xl border-gray-800 bg-gray-800">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-16 w-16 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-3xl">🔧</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-center text-white mt-4">
            Developer Portal
          </CardTitle>
          <p className="text-center text-sm text-gray-400">
            Access system logs, connections, and debugging tools
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium text-gray-300">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="dev@example.com"
                        disabled={isLoading}
                        className="h-12 text-base bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
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
                    <FormLabel className="text-base font-medium text-gray-300">Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Enter your password"
                        disabled={isLoading}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className={cn("w-full h-12 text-base font-medium bg-purple-600 hover:bg-purple-700 text-white")}
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

