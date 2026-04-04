// React imports
import React from 'react';

// UI Components (shadcn/ui)
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Types
import type { FAQ } from '@/services/api/faq.service';

// Utils
import { cn } from '@/lib/utils';

interface FAQItemProps {
  faq: FAQ;
  className?: string;
}

export const FAQItem: React.FC<FAQItemProps> = ({ faq, className }) => {
  return (
    <Accordion type="single" collapsible className={cn('w-full', className)}>
      <AccordionItem value={faq.id} className="border-b border-gray-200">
        <AccordionTrigger className="text-left font-semibold text-heading-700 hover:no-underline py-4">
          {faq.question}
        </AccordionTrigger>
        <AccordionContent className="text-heading-600 pb-4 pt-2 whitespace-pre-wrap">
          {faq.answer}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};


