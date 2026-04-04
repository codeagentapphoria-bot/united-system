// React imports
import React from 'react';

// Custom Components
import { PortalLayout } from '@/components/layout/PortalLayout';
import { LoginPrompt } from '@/components/portal/LoginPrompt';

// Hooks
import { useAuth } from '@/context/AuthContext';

// Utils
import { FiCreditCard, FiFileText, FiClock } from 'react-icons/fi';

export const PortalEBills: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <PortalLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (!user) {
    return (
      <PortalLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-heading-700 mb-4">E-Bills</h1>
            <p className="text-lg text-heading-600">
              View and pay your bills conveniently online. Login to access your billing information.
            </p>
          </div>
          <LoginPrompt
            title="Login to View Your Bills"
            description="Log in to access your billing information and make payments:"
            features={[
              'View all your bills in one place',
              'Pay bills securely online',
              'View payment history',
              'Set up automatic payments',
              'Download receipts and invoices',
            ]}
          />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-heading-700 mb-4">E-Bills</h1>
          <p className="text-lg text-heading-600">
            View and pay your bills conveniently online.
          </p>
        </div>

        {/* Bills Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <FiCreditCard size={40} className="text-primary-600" />
            </div>
            <h2 className="text-2xl font-semibold text-heading-700 mb-2">No Bills Available</h2>
            <p className="text-heading-600">
              You don't have any bills at the moment. Bills will appear here when they are available.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
              <FiFileText size={24} />
            </div>
            <h3 className="text-lg font-semibold text-heading-700 mb-2">Payment History</h3>
            <p className="text-sm text-heading-600">
              View your past payments and download receipts
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
              <FiClock size={24} />
            </div>
            <h3 className="text-lg font-semibold text-heading-700 mb-2">Scheduled Payments</h3>
            <p className="text-sm text-heading-600">
              Manage your scheduled and automatic payments
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
              <FiCreditCard size={24} />
            </div>
            <h3 className="text-lg font-semibold text-heading-700 mb-2">Payment Methods</h3>
            <p className="text-sm text-heading-600">
              Add or manage your payment methods
            </p>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
};

