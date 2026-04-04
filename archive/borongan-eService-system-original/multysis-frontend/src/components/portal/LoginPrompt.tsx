// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Hooks
import { useLoginSheet } from '@/context/LoginSheetContext';

import { FiLock, FiLogIn, FiUserPlus } from 'react-icons/fi';

interface LoginPromptProps {
  title?: string;
  description?: string;
  features?: string[];
}

export const LoginPrompt: React.FC<LoginPromptProps> = ({
  title = 'Login Required',
  description = 'Please log in to access this section and enjoy the following benefits:',
  features = [
    'Access your personal dashboard',
    'View and manage your transactions',
    'Make payments and requests',
    'Track your service applications',
  ],
}) => {
  const { openLoginSheet, openSignupSheet } = useLoginSheet();
  return (
    <div className="flex items-center justify-center min-h-[400px] py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <FiLock size={32} className="text-primary-600" />
          </div>
          <CardTitle className="text-2xl text-heading-700">{title}</CardTitle>
          <CardDescription className="text-base mt-2">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Features List */}
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-primary-600" />
                </div>
                <p className="text-sm text-heading-600">{feature}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={openLoginSheet}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
            >
              <FiLogIn size={18} className="mr-2" />
              <span>Login</span>
            </Button>
            <Button
              onClick={openSignupSheet}
              variant="outline"
              className="flex-1 border-primary-600 text-primary-600 hover:bg-primary-50"
            >
              <FiUserPlus size={18} className="mr-2" />
              <span>Sign Up</span>
            </Button>
          </div>

          <p className="text-xs text-center text-heading-400 pt-2">
            Don't have an account?{' '}
            <button
              onClick={openSignupSheet}
              className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
            >
              Create one now
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

