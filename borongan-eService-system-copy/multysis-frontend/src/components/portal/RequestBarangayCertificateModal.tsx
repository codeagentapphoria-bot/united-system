import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ResidentCertificateTemplate } from '@/services/api/certificate-template.service';
import type { Service } from '@/services/api/service.service';
import { transactionService } from '@/services/api/transaction.service';

interface Props {
  open: boolean;
  onClose: () => void;
  service: Service;
  template: ResidentCertificateTemplate;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { message?: string } }; message?: string };
  return err.response?.data?.message || err.message || fallback;
};

export const RequestBarangayCertificateModal: React.FC<Props> = ({
  open,
  onClose,
  service,
  template,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);

  const submit = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Login required',
        description: 'Please log in as a resident.',
      });
      return;
    }
    if (!purpose.trim()) {
      toast({
        variant: 'destructive',
        title: 'Purpose required',
        description: 'State the purpose of this certificate.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const transaction = await transactionService.createTransaction({
        residentId: user.id,
        serviceId: service.id,
        serviceData: {
          certificate_type: template.certificateType,
          purpose: purpose.trim(),
        },
        paymentAmount: service.defaultAmount ? Number(service.defaultAmount) : undefined,
        isLocalResident: true,
      });
      setReferenceNumber(transaction.referenceNumber);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Request failed',
        description: getErrorMessage(error, 'Please try again.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{referenceNumber ? 'Request submitted' : template.name}</DialogTitle>
          <DialogDescription>
            {referenceNumber
              ? 'Your barangay will process this request in BIMS.'
              : 'This certificate is issued by your barangay and processed in BIMS.'}
          </DialogDescription>
        </DialogHeader>

        {referenceNumber ? (
          <div className="rounded-lg border bg-green-50 p-4 text-center">
            <p className="text-sm text-gray-600">Reference number</p>
            <p className="text-xl font-mono font-bold text-green-700">{referenceNumber}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="certificate-purpose">
              Purpose <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="certificate-purpose"
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              className="min-h-[110px]"
              placeholder="Example: employment, scholarship, government assistance"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {referenceNumber ? 'Close' : 'Cancel'}
          </Button>
          {!referenceNumber && (
            <Button onClick={submit} disabled={isSubmitting || !purpose.trim()}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
