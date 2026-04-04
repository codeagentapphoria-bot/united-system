// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent } from '@/components/ui/card';

// Icons
import { FiUserCheck } from 'react-icons/fi';

interface CitizenDisplayCardProps {
  citizen: any;
}

export const CitizenDisplayCard: React.FC<CitizenDisplayCardProps> = ({ citizen }) => {
  if (!citizen) {
    return <p className="text-sm text-gray-500">Loading citizen information...</p>;
  }

  return (
    <Card className="border-primary-200 bg-primary-50">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-heading-700 text-sm">
              {citizen.firstName} {citizen.middleName} {citizen.lastName} {citizen.extensionName || ''}
            </h4>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-600">
              {citizen.residentId && <span>ID: {citizen.residentId}</span>}
              {citizen.phoneNumber && <span>• {citizen.phoneNumber}</span>}
            </div>
          </div>
          <FiUserCheck className="text-primary-600" size={18} />
        </div>
      </CardContent>
    </Card>
  );
};

