import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FiInfo } from 'react-icons/fi';
import type { TaxPreviewResult } from '@/services/api/tax-computation.service';

interface TaxPreviewProps {
  preview: TaxPreviewResult;
  isLoading?: boolean;
}

export const TaxPreview: React.FC<TaxPreviewProps> = ({ preview, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">Calculating tax preview...</div>
        </CardContent>
      </Card>
    );
  }

  if (!preview) {
    return null;
  }

  const breakdown = preview.breakdown;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="text-lg">Estimated Tax</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <FiInfo className="h-4 w-4" />
          <AlertDescription>
            This is an estimate. Final tax may vary based on actual data and any approved exemptions.
          </AlertDescription>
        </Alert>

        {/* Breakdown Steps */}
        {breakdown.steps && breakdown.steps.length > 0 && (
          <div className="space-y-3">
            {breakdown.steps.map((step, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{step.description}</p>
                    {step.calculation && (
                      <p className="text-xs text-gray-500 mt-1">{step.calculation}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 ml-4">
                    {formatCurrency(step.amount)}
                  </p>
                </div>
                {index < breakdown.steps.length - 1 && <Separator className="mt-2" />}
              </div>
            ))}
          </div>
        )}

        {/* Total Tax */}
        <div className="pt-4 border-t-2 border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-lg font-bold text-gray-900">Estimated Total Tax</p>
            <p className="text-lg font-bold text-primary-600">{formatCurrency(breakdown.totalTax)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
