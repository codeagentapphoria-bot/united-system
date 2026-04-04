import { TabsContent } from '@/components/ui/tabs';
import React from 'react';

interface PlaceholderTabProps {
  value: string;
  label: string;
}

export const PlaceholderTab: React.FC<PlaceholderTabProps> = ({ value, label }) => {
  return (
    <TabsContent value={value}>
      <div className="text-center py-8 text-gray-500">
        {label} records will be displayed here
      </div>
    </TabsContent>
  );
};

