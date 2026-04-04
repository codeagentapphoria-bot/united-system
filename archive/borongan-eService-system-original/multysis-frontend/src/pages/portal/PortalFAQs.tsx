// React imports
import React from 'react';

// Third-party libraries
import { FiHelpCircle } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Custom Components
import { PortalLayout } from '@/components/layout/PortalLayout';
import { FAQList } from '@/components/portal/faqs/FAQList';

export const PortalFAQs: React.FC = () => {
  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                <FiHelpCircle size={24} className="text-primary-600" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold text-heading-700">
                  Frequently Asked Questions
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Find answers to common questions about our services
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FAQList limit={10} />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};


