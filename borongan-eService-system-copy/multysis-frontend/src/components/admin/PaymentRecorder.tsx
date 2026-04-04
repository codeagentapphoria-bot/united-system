// React imports
import React, { useEffect, useState } from 'react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Services
import { paymentService, type Payment, type PaymentBalance } from '@/services/api/payment.service';
import { taxComputationService, type TaxComputation } from '@/services/api/tax-computation.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Utils
import { format } from 'date-fns';
import { FiDollarSign, FiCheckCircle } from 'react-icons/fi';

interface PaymentRecorderProps {
  transactionId: string;
  onPaymentRecorded?: () => void;
}

export const PaymentRecorder: React.FC<PaymentRecorderProps> = ({
  transactionId,
  onPaymentRecorded,
}) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<PaymentBalance | null>(null);
  const [taxComputation, setTaxComputation] = useState<TaxComputation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'CASH' as Payment['paymentMethod'],
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    referenceNumber: '',
    notes: '',
  });

  useEffect(() => {
    if (transactionId) {
      loadData();
    }
  }, [transactionId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load tax computation
      const computation = await taxComputationService.getActiveTaxComputation(transactionId);
      setTaxComputation(computation);

      // Load payments
      const paymentData = await paymentService.getPaymentsByTransaction(transactionId);
      setPayments(paymentData);

      // Load balance
      if (computation) {
        const balanceData = await paymentService.getBalance(transactionId);
        setBalance(balanceData);
      }
    } catch (error: any) {
      // Tax computation might not exist yet
      if (error.message && !error.message.includes('not found')) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load payment data',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!taxComputation) {
      toast({
        title: 'Error',
        description: 'Tax computation not found. Please compute tax first.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Payment amount must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await paymentService.recordPayment({
        transactionId,
        taxComputationId: taxComputation.id,
        amount: parseFloat(formData.amount),
        paymentMethod: formData.paymentMethod,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate).toISOString() : undefined,
        referenceNumber: formData.referenceNumber || undefined,
        notes: formData.notes || undefined,
      });
      toast({
        title: 'Success',
        description: 'Payment recorded successfully',
      });
      setShowForm(false);
      setFormData({
        amount: '',
        paymentMethod: 'CASH',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        referenceNumber: '',
        notes: '',
      });
      loadData();
      if (onPaymentRecorded) {
        onPaymentRecorded();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPaymentMethodBadge = (method: Payment['paymentMethod']) => {
    const colors: Record<Payment['paymentMethod'], string> = {
      CASH: 'bg-green-100 text-green-800',
      CHECK: 'bg-blue-100 text-blue-800',
      ONLINE: 'bg-purple-100 text-purple-800',
      BANK_TRANSFER: 'bg-indigo-100 text-indigo-800',
      GCASH: 'bg-yellow-100 text-yellow-800',
      PAYMAYA: 'bg-pink-100 text-pink-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={colors[method] || colors.OTHER}>
        {method.replace('_', ' ')}
      </Badge>
    );
  };

  if (!taxComputation) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-gray-500">
            No tax computation found. Tax must be computed before recording payments.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Display */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Balance</CardTitle>
        </CardHeader>
        <CardContent>
          {balance ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Tax:</span>
                <span className="font-semibold">{formatCurrency(balance.totalTax)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Paid:</span>
                <span className="font-semibold">{formatCurrency(balance.totalPaid)}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Balance:</span>
                  <div className="flex items-center gap-2">
                    {balance.balance === 0 ? (
                      <Badge className="bg-green-500">
                        <FiCheckCircle className="mr-1 h-4 w-4" />
                        Fully Paid
                      </Badge>
                    ) : (
                      <span
                        className={`text-lg font-bold ${
                          balance.balance > 0 ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {formatCurrency(balance.balance)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">Loading balance...</div>
          )}
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Record Payment</CardTitle>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <FiDollarSign className="mr-2 h-4 w-4" />
                New Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showForm ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Payment Method *</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHECK">Check</SelectItem>
                      <SelectItem value="ONLINE">Online</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="GCASH">GCash</SelectItem>
                      <SelectItem value="PAYMAYA">PayMaya</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Reference Number (Optional)</Label>
                <Input
                  value={formData.referenceNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, referenceNumber: e.target.value })
                  }
                  placeholder="Check number, transaction ID, etc."
                />
              </div>
              <div>
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this payment"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  Record Payment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      amount: '',
                      paymentMethod: 'CASH',
                      paymentDate: format(new Date(), 'yyyy-MM-dd'),
                      referenceNumber: '',
                      notes: '',
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Click "New Payment" to record a payment
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No payments recorded yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(Number(payment.amount))}
                    </TableCell>
                    <TableCell>{getPaymentMethodBadge(payment.paymentMethod)}</TableCell>
                    <TableCell>{payment.referenceNumber || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{payment.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

