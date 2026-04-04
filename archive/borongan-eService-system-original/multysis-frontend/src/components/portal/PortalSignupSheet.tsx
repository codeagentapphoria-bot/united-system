// React imports
import React, { useState } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
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
import { signupSchema, type SignupInput } from '@/validations/auth.schema';

// Utils
import { cn } from '@/lib/utils';
import { FiLock, FiLogIn, FiPhone, FiUser, FiUserPlus } from 'react-icons/fi';

interface PortalSignupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PortalSignupSheet: React.FC<PortalSignupSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { closeSignupSheet, openLoginSheet } = useLoginSheet();
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
      await signup(data);
      toast({
        title: 'Success',
        description: 'Account created successfully! Your account is pending activation. An administrator will review and activate your account soon.',
      });
      form.reset();
      closeSignupSheet();
      navigate('/portal');
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Please try again';
      let userFriendlyMessage = errorMessage;

      // Provide specific error messages for common cases
      if (errorMessage.includes('Phone number already registered') || 
          errorMessage.includes('Phone number is already registered')) {
        userFriendlyMessage = 'This phone number is already registered. Please use a different phone number or sign in if you already have an account.';
      } else if (errorMessage.includes('already exists')) {
        userFriendlyMessage = 'An account with this information already exists. Please sign in or contact support.';
      }

      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: userFriendlyMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchToLogin = () => {
    closeSignupSheet();
    setTimeout(() => {
      openLoginSheet();
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
              Create Account
            </SheetTitle>
            <SheetDescription className="text-base text-heading-600 mt-2">
              Join City of Borongan Local Government System to access all government services
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8">
            <Form {...form}>
              <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                {/* Registration Type Clarification */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> This form is for <strong>non-resident subscribers</strong> only. Citizens of Borongan must first{' '}
                    <Link to="/portal/register" className="text-primary-700 underline font-medium">
                      self-register here
                    </Link>{' '}
                    or be registered by administrators. Non-residents may contact the administration office for assistance.
                  </p>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-heading-700">
                          First Name *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
                            <Input
                              {...field}
                              type="text"
                              placeholder="Juan"
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
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium text-heading-700">
                          Last Name *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
                            <Input
                              {...field}
                              type="text"
                              placeholder="Dela Cruz"
                              disabled={isLoading}
                              className="h-12 text-base pl-10"
                            />
                          </div>
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
                      <FormLabel className="text-base font-medium text-heading-700">
                        Middle Name
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
                          <Input
                            {...field}
                            type="text"
                            placeholder="Santos (optional)"
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
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-heading-700">
                        Email
                      </FormLabel>
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
                      <FormLabel className="text-base font-medium text-heading-700">
                        Phone Number *
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
                      <p className="text-xs text-gray-500 mt-1">Philippine format: 09XXXXXXXXX</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Requirements */}
                <div className="bg-primary-50 border border-primary-200 rounded-md p-3">
                  <p className="text-sm text-primary-700 font-medium mb-1">Password Requirements:</p>
                  <ul className="text-xs text-primary-600 space-y-0.5 list-disc list-inside">
                    <li>At least 8 characters long</li>
                    <li>Contains at least one uppercase letter (A-Z)</li>
                    <li>Contains at least one lowercase letter (a-z)</li>
                    <li>Contains at least one number (0-9)</li>
                  </ul>
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-heading-700">
                        Password *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
                          <PasswordInput
                            {...field}
                            placeholder="Create a strong password"
                            disabled={isLoading}
                            className="h-12 pl-10"
                          />
                        </div>
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
                      <FormLabel className="text-base font-medium text-heading-700">
                        Confirm Password *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
                          <PasswordInput
                            {...field}
                            placeholder="Re-enter your password"
                            disabled={isLoading}
                            className="h-12 pl-10"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Terms and Conditions */}
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
                          I agree to the{' '}
                          <Link to="/terms" className="text-primary hover:underline" target="_blank">
                            Terms and Conditions
                          </Link>
                          {' '}and{' '}
                          <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                            Privacy Policy
                          </Link>
                          {' '}*
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className={cn(
                    'w-full h-12 text-base font-medium bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg transition-all mt-6'
                  )}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <span className="mr-2">Creating account...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <FiUserPlus size={18} className="mr-2" />
                      Create Account
                    </span>
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-heading-500">Already have an account?</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSwitchToLogin}
                  className="w-full h-12 text-base font-medium border-primary-600 text-primary-600 hover:bg-primary-50"
                >
                  <FiLogIn size={18} className="mr-2" />
                  Sign In
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

