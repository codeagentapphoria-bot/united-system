// React imports
import React from 'react';

// Third-party libraries
import { Link } from 'react-router-dom';
import { FiArrowRight, FiHelpCircle } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';

// Custom Components
import { FAQItem } from './FAQItem';

// Hooks
import { usePortalFAQs } from '@/hooks/faqs/usePortalFAQs';

export const HomepageFAQs: React.FC = () => {
  const { homepageFAQs, isLoadingHomepage } = usePortalFAQs();

  // Don't show loading state or empty state - just return null if no FAQs
  // This prevents showing empty sections when backend is not available
  if (isLoadingHomepage || homepageFAQs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
            <FiHelpCircle className="text-primary-600 w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-heading-700">Frequently Asked Questions</h2>
            <p className="text-sm text-gray-500 mt-1">Get answers to common questions</p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-primary-600 text-primary-600 hover:bg-primary-50 w-full sm:w-auto"
        >
          <Link to="/portal/faqs">
            View All
            <FiArrowRight className="ml-2" size={16} />
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        {homepageFAQs.map((faq) => (
          <FAQItem key={faq.id} faq={faq} />
        ))}
      </div>
    </div>
  );
};

