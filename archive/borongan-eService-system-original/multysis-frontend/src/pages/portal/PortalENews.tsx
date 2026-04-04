// React imports
import React from 'react';

// Custom Components
import { PortalLayout } from '@/components/layout/PortalLayout';
import { LoginPrompt } from '@/components/portal/LoginPrompt';

// Hooks
import { useAuth } from '@/context/AuthContext';

// Utils
import { FiFileText, FiBell, FiRss } from 'react-icons/fi';

export const PortalENews: React.FC = () => {
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
            <h1 className="text-4xl font-bold text-heading-700 mb-4">E-News</h1>
            <p className="text-lg text-heading-600">
              Stay updated with the latest news and announcements. Login to access news and updates.
            </p>
          </div>
          <LoginPrompt
            title="Login to View News"
            description="Log in to access the latest news and announcements:"
            features={[
              'Read latest government news and updates',
              'Get notified about important announcements',
              'Browse news by category',
              'Subscribe to newsletters',
              'Save favorite articles',
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
          <h1 className="text-4xl font-bold text-heading-700 mb-4">E-News</h1>
          <p className="text-lg text-heading-600">
            Stay updated with the latest news and announcements from the government.
          </p>
        </div>

        {/* News Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <FiFileText size={40} className="text-primary-600" />
            </div>
            <h2 className="text-2xl font-semibold text-heading-700 mb-2">News Coming Soon</h2>
            <p className="text-heading-600">
              The E-News section is currently under development. Check back soon for the latest news and announcements from the government.
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
              <FiFileText size={24} />
            </div>
            <h3 className="text-lg font-semibold text-heading-700 mb-2">Latest News</h3>
            <p className="text-sm text-heading-600">
              Stay informed with the latest government news and updates
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
              <FiBell size={24} />
            </div>
            <h3 className="text-lg font-semibold text-heading-700 mb-2">Notifications</h3>
            <p className="text-sm text-heading-600">
              Get notified about important announcements and updates
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center mb-4">
              <FiRss size={24} />
            </div>
            <h3 className="text-lg font-semibold text-heading-700 mb-2">Newsletter</h3>
            <p className="text-sm text-heading-600">
              Subscribe to receive news and updates directly in your inbox
            </p>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
};

