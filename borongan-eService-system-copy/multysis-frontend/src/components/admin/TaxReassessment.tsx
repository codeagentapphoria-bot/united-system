// React imports
import React, { useEffect, useState } from 'react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Services
import {
  taxReassessmentService,
  type ReassessmentComparison,
} from '@/services/api/tax-reassessment.service';
import type { TaxComputation } from '@/services/api/tax-computation.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Utils
import { format } from 'date-fns';
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

interface TaxReassessmentProps {
  transactionId: string;
  onReassessmentComplete?: () => void;
}

export const TaxReassessment: React.FC<TaxReassessmentProps> = ({
  transactionId,
  onReassessmentComplete,
}) => {
  const { toast } = useToast();
  const [history, setHistory] = useState<TaxComputation[]>([]);
  const [comparison, setComparison] = useState<ReassessmentComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (transactionId) {
      loadHistory();
    }
  }, [transactionId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await taxReassessmentService.getReassessmentHistory(transactionId);
      setHistory(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load reassessment history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerReassessment = async () => {
    if (!reason || reason.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Reassessment reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await taxReassessmentService.triggerReassessment(transactionId, {
        reason,
      });
      toast({
        title: 'Success',
        description: 'Tax reassessment completed successfully',
      });
      setShowTriggerDialog(false);
      setReason('');
      loadHistory();
      if (onReassessmentComplete) {
        onReassessmentComplete();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to trigger reassessment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewComparison = async (computationId: string) => {
    try {
      const data = await taxReassessmentService.getReassessmentComparison(computationId);
      setComparison(data);
      setShowComparisonDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load comparison',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getDifferenceIcon = (difference: number | undefined) => {
    if (difference === undefined || difference === 0) {
      return <FiMinus className="h-4 w-4 text-gray-500" />;
    } else if (difference > 0) {
      return <FiTrendingUp className="h-4 w-4 text-red-500" />;
    } else {
      return <FiTrendingDown className="h-4 w-4 text-green-500" />;
    }
  };

  const getDifferenceColor = (difference: number | undefined) => {
    if (difference === undefined || difference === 0) {
      return 'text-gray-600';
    } else if (difference > 0) {
      return 'text-red-600';
    } else {
      return 'text-green-600';
    }
  };

  const activeComputation = history.find((c) => c.isActive);

  return (
    <div className="space-y-6">
      {/* Trigger Reassessment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tax Reassessment</CardTitle>
            <Button
              onClick={() => setShowTriggerDialog(true)}
              size="sm"
              variant="outline"
              disabled={!activeComputation}
            >
              <FiRefreshCw className="mr-2 h-4 w-4" />
              Trigger Reassessment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!activeComputation ? (
            <div className="text-center py-4 text-gray-500">
              No active tax computation found. Tax must be computed before reassessment.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Tax Amount:</span>
                <span className="font-semibold">
                  {formatCurrency(
                    Number(activeComputation.adjustedTax ?? activeComputation.totalTax)
                  )}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Computed on: {format(new Date(activeComputation.computedAt), 'PPP p')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reassessment History */}
      <Card>
        <CardHeader>
          <CardTitle>Reassessment History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No reassessment history</div>
          ) : (
            <div className="space-y-4">
              {history.map((computation) => (
                <div
                  key={computation.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {format(new Date(computation.computedAt), 'MMM d, yyyy HH:mm')}
                        </span>
                        {computation.isActive && (
                          <Badge variant="default">Active</Badge>
                        )}
                        {computation.isReassessment && (
                          <Badge variant="secondary">Reassessment</Badge>
                        )}
                      </div>
                      {computation.reassessmentReason && (
                        <p className="text-sm text-gray-600 mt-1">
                          Reason: {computation.reassessmentReason}
                        </p>
                      )}
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">Tax Amount: </span>
                        <span className="font-semibold">
                          {formatCurrency(
                            Number(computation.adjustedTax ?? computation.totalTax)
                          )}
                        </span>
                        {computation.differenceAmount !== null &&
                          computation.differenceAmount !== undefined && (
                            <span
                              className={`ml-2 ${getDifferenceColor(
                                Number(computation.differenceAmount)
                              )}`}
                            >
                              {getDifferenceIcon(Number(computation.differenceAmount))}
                              {formatCurrency(Math.abs(Number(computation.differenceAmount)))}
                            </span>
                          )}
                      </div>
                    </div>
                    {computation.isReassessment && computation.previousComputationId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewComparison(computation.id)}
                      >
                        View Comparison
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trigger Dialog */}
      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trigger Tax Reassessment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reassessment Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a reason for reassessing this tax (minimum 10 characters)"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                This will deactivate the current computation and create a new one based on
                current transaction data.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTriggerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTriggerReassessment} disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Trigger Reassessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog open={showComparisonDialog} onOpenChange={setShowComparisonDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reassessment Comparison</DialogTitle>
          </DialogHeader>
          {comparison && (
            <div className="space-y-6">
              {/* Difference Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Difference:</span>
                  <div className="flex items-center gap-2">
                    {getDifferenceIcon(comparison.differenceAmount)}
                    <span
                      className={`text-lg font-bold ${getDifferenceColor(
                        comparison.differenceAmount
                      )}`}
                    >
                      {comparison.differenceAmount !== undefined
                        ? formatCurrency(Math.abs(comparison.differenceAmount))
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-2 gap-4">
                {/* Old Computation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Previous Computation</CardTitle>
                    <p className="text-xs text-gray-500">
                      {format(
                        new Date(comparison.oldComputation.computedAt),
                        'MMM d, yyyy HH:mm'
                      )}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-600">Total Tax: </span>
                      <span className="font-semibold">
                        {formatCurrency(Number(comparison.oldComputation.totalTax))}
                      </span>
                    </div>
                    {comparison.oldComputation.adjustedTax && (
                      <div>
                        <span className="text-sm text-gray-600">Adjusted Tax: </span>
                        <span className="font-semibold">
                          {formatCurrency(Number(comparison.oldComputation.adjustedTax))}
                        </span>
                      </div>
                    )}
                    {comparison.oldComputation.breakdown && (
                      <div>
                        <p className="text-sm font-semibold mb-2">Breakdown:</p>
                        <div className="space-y-1 text-xs">
                          {(
                            comparison.oldComputation.breakdown as any
                          )?.steps?.map((step: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>{step.description}</span>
                              <span>{formatCurrency(step.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* New Computation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">New Computation</CardTitle>
                    <p className="text-xs text-gray-500">
                      {format(
                        new Date(comparison.newComputation.computedAt),
                        'MMM d, yyyy HH:mm'
                      )}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-sm text-gray-600">Total Tax: </span>
                      <span className="font-semibold">
                        {formatCurrency(Number(comparison.newComputation.totalTax))}
                      </span>
                    </div>
                    {comparison.newComputation.adjustedTax && (
                      <div>
                        <span className="text-sm text-gray-600">Adjusted Tax: </span>
                        <span className="font-semibold">
                          {formatCurrency(Number(comparison.newComputation.adjustedTax))}
                        </span>
                      </div>
                    )}
                    {comparison.newComputation.reassessmentReason && (
                      <div>
                        <p className="text-sm font-semibold mb-1">Reason:</p>
                        <p className="text-xs text-gray-600">
                          {comparison.newComputation.reassessmentReason}
                        </p>
                      </div>
                    )}
                    {comparison.newComputation.breakdown && (
                      <div>
                        <p className="text-sm font-semibold mb-2">Breakdown:</p>
                        <div className="space-y-1 text-xs">
                          {(
                            comparison.newComputation.breakdown as any
                          )?.steps?.map((step: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>{step.description}</span>
                              <span>{formatCurrency(step.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowComparisonDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

