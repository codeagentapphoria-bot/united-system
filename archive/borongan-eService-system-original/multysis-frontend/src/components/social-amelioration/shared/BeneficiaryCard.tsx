// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Utils
import { calculateAge, cn, getAgeClassification, getAgeClassificationBadgeVariant } from '@/lib/utils';

// Components
import { StatusBadge } from './StatusBadge';

interface BeneficiaryCardProps {
  beneficiary: any;
  isSelected: boolean;
  onClick: () => void;
  showAgeClassification?: boolean;
}

export const BeneficiaryCard: React.FC<BeneficiaryCardProps> = ({
  beneficiary,
  isSelected,
  onClick,
  showAgeClassification = false,
}) => {
  return (
    <div className="relative">
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          isSelected
            ? 'border-primary-600 bg-primary-50'
            : 'hover:border-primary-300'
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-heading-700 truncate">
                {beneficiary.firstName} {beneficiary.middleName} {beneficiary.lastName}
                {beneficiary.extensionName && ` ${beneficiary.extensionName}`}
              </h3>
              {showAgeClassification && (() => {
                const birthDate = beneficiary.dateOfBirth || beneficiary.citizen?.birthDate;
                const age = birthDate ? calculateAge(birthDate) : (beneficiary.age || beneficiary.citizen?.age);
                const classification = getAgeClassification(age);
                if (classification) {
                  return (
                    <Badge className={cn("mt-1 text-xs", getAgeClassificationBadgeVariant(classification))}>
                      {classification}
                    </Badge>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex-shrink-0">
              <StatusBadge status={beneficiary.status} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Pointing Arrow - Only on large screens */}
      {isSelected && (
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
        </div>
      )}
    </div>
  );
};

