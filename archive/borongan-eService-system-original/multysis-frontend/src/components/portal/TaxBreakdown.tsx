// React imports
import React from 'react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Types
import type { TaxComputation } from '@/services/api/tax-computation.service';
import { format } from 'date-fns';

interface TaxBreakdownProps {
  computation: TaxComputation | null;
  isLoading?: boolean;
}

export const TaxBreakdown: React.FC<TaxBreakdownProps> = ({
  computation,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">Loading tax computation...</div>
        </CardContent>
      </Card>
    );
  }

  if (!computation) {
    return null;
  }

  const breakdown = computation.breakdown;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Computation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Breakdown Steps */}
        {breakdown.steps && breakdown.steps.length > 0 && (
          <div className="space-y-3">
            {breakdown.steps.map((step, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {step.description}
                    </p>
                    {step.calculation && (
                      <p className="text-xs text-gray-500 mt-1">
                        {step.calculation}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 ml-4">
                    {formatCurrency(step.amount)}
                  </p>
                </div>
                {index < breakdown.steps.length - 1 && (
                  <Separator className="mt-2" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Base Tax */}
        <div className="pt-4 border-t-2 border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-base font-semibold text-gray-900">Base Tax</p>
            <p className="text-base font-semibold text-gray-900">
              {formatCurrency(breakdown.totalTax)}
            </p>
          </div>
        </div>

        {/* Adjustments */}
        {computation.adjustedTax !== null && computation.adjustedTax !== undefined && 
         computation.adjustedTax !== breakdown.totalTax && (
          <>
            {/* Show exemptions, discounts, penalties if available */}
            {computation.exemptionsApplied && 
             Array.isArray(computation.exemptionsApplied) && 
             computation.exemptionsApplied.length > 0 && (
              <div className="pt-2">
                <p className="text-sm text-gray-600 mb-1">Exemptions Applied:</p>
                <ul className="list-disc list-inside text-xs text-gray-500">
                  {computation.exemptionsApplied.map((exemption: string, idx: number) => (
                    <li key={idx}>{exemption}</li>
                  ))}
                </ul>
              </div>
            )}
            {computation.discountsApplied && 
             Array.isArray(computation.discountsApplied) && 
             computation.discountsApplied.length > 0 && (
              <div className="pt-2">
                <p className="text-sm text-gray-600 mb-1">Discounts Applied:</p>
                <ul className="list-disc list-inside text-xs text-gray-500">
                  {computation.discountsApplied.map((discount: string, idx: number) => (
                    <li key={idx}>{discount}</li>
                  ))}
                </ul>
              </div>
            )}
            {computation.penaltiesApplied && 
             Array.isArray(computation.penaltiesApplied) && 
             computation.penaltiesApplied.length > 0 && (
              <div className="pt-2">
                <p className="text-sm text-gray-600 mb-1">Penalties Applied:</p>
                <ul className="list-disc list-inside text-xs text-gray-500">
                  {computation.penaltiesApplied.map((penalty: string, idx: number) => (
                    <li key={idx}>{penalty}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Adjusted Tax */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold text-gray-900">Adjusted Tax Due</p>
                <p className="text-lg font-bold text-primary-600">
                  {formatCurrency(Number(computation.adjustedTax))}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Total Tax (if no adjustments) */}
        {(!computation.adjustedTax || computation.adjustedTax === breakdown.totalTax) && (
          <div className="pt-4 border-t-2 border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-gray-900">Total Tax Due</p>
              <p className="text-lg font-bold text-primary-600">
                {formatCurrency(breakdown.totalTax)}
              </p>
            </div>
          </div>
        )}

        {/* Computation Info */}
        <div className="pt-2 text-xs text-gray-500">
          <p>
            Computed on: {format(new Date(computation.computedAt), 'PPP p')}
          </p>
          {computation.taxProfileVersion && (
            <p className="mt-1">
              Tax Profile: {computation.taxProfileVersion.taxProfile.name} (Version{' '}
              {computation.taxProfileVersion.version})
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

