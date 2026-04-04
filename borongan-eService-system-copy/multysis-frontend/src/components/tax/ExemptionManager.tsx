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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Services
import { exemptionService, type Exemption } from '@/services/api/exemption.service';
import { uploadService } from '@/services/api/upload.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Utils
import { format } from 'date-fns';
import { FiX, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';

interface ExemptionManagerProps {
  transactionId: string;
  mode: 'portal' | 'admin';
  onExemptionApproved?: () => void;
}

export const ExemptionManager: React.FC<ExemptionManagerProps> = ({
  transactionId,
  mode,
  onExemptionApproved,
}) => {
  const { toast } = useToast();
  const [exemptions, setExemptions] = useState<Exemption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedExemption, setSelectedExemption] = useState<Exemption | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    exemptionType: 'SENIOR_CITIZEN' as 'SENIOR_CITIZEN' | 'PWD' | 'SOLO_PARENT' | 'OTHER',
    requestReason: '',
  });
  const [approveData, setApproveData] = useState({
    exemptionAmount: '',
  });
  const [rejectData, setRejectData] = useState({
    rejectionReason: '',
  });

  // Load exemptions
  useEffect(() => {
    if (transactionId) {
      loadExemptions();
    }
  }, [transactionId]);

  const loadExemptions = async () => {
    setIsLoading(true);
    try {
      const data = await exemptionService.getExemptionsByTransaction(transactionId);
      setExemptions(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load exemptions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const response = await uploadService.uploadTransactionDocument(file);
        return response.url;
      });
      const urls = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...urls]);
      toast({
        title: 'Success',
        description: 'Files uploaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload files',
        variant: 'destructive',
      });
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitRequest = async () => {
    if (!formData.requestReason || formData.requestReason.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Request reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await exemptionService.createExemptionRequest({
        transactionId,
        exemptionType: formData.exemptionType,
        requestReason: formData.requestReason,
        supportingDocuments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      });
      toast({
        title: 'Success',
        description: 'Exemption request submitted successfully',
      });
      setShowRequestForm(false);
      setFormData({ exemptionType: 'SENIOR_CITIZEN', requestReason: '' });
      setUploadedFiles([]);
      loadExemptions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit exemption request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedExemption || !approveData.exemptionAmount) {
      toast({
        title: 'Validation Error',
        description: 'Exemption amount is required',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(approveData.exemptionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Exemption amount must be a positive number',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await exemptionService.approveExemption(selectedExemption.id, {
        exemptionAmount: amount,
      });
      toast({
        title: 'Success',
        description: 'Exemption approved successfully',
      });
      setShowApproveDialog(false);
      setSelectedExemption(null);
      setApproveData({ exemptionAmount: '' });
      loadExemptions();
      if (onExemptionApproved) {
        onExemptionApproved();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve exemption',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExemption || !rejectData.rejectionReason || rejectData.rejectionReason.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Rejection reason must be at least 10 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await exemptionService.rejectExemption(selectedExemption.id, {
        rejectionReason: rejectData.rejectionReason,
      });
      toast({
        title: 'Success',
        description: 'Exemption rejected',
      });
      setShowRejectDialog(false);
      setSelectedExemption(null);
      setRejectData({ rejectionReason: '' });
      loadExemptions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject exemption',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: Exemption['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="default" className="bg-green-500">
            <FiCheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive">
            <FiXCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary">
            <FiClock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (mode === 'portal') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tax Exemptions</CardTitle>
            {!showRequestForm && (
              <Button onClick={() => setShowRequestForm(true)} size="sm">
                Request Exemption
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showRequestForm ? (
            <div className="space-y-4">
              <div>
                <Label>Exemption Type</Label>
                <Select
                  value={formData.exemptionType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, exemptionType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SENIOR_CITIZEN">Senior Citizen</SelectItem>
                    <SelectItem value="PWD">Person with Disability</SelectItem>
                    <SelectItem value="SOLO_PARENT">Solo Parent</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Request Reason *</Label>
                <Textarea
                  value={formData.requestReason}
                  onChange={(e) =>
                    setFormData({ ...formData, requestReason: e.target.value })
                  }
                  placeholder="Please provide a detailed reason for your exemption request (minimum 10 characters)"
                  rows={4}
                />
              </div>
              <div>
                <Label>Supporting Documents (Optional)</Label>
                <div className="mt-2">
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    disabled={uploadingFiles}
                  />
                  {uploadedFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {uploadedFiles.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm truncate">{url.split('/').pop()}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <FiX className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
                  Submit Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRequestForm(false);
                    setFormData({ exemptionType: 'SENIOR_CITIZEN', requestReason: '' });
                    setUploadedFiles([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">Loading exemptions...</div>
              ) : exemptions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No exemption requests. Click "Request Exemption" to create one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exemptions.map((exemption) => (
                      <TableRow key={exemption.id}>
                        <TableCell>{exemption.exemptionType.replace('_', ' ')}</TableCell>
                        <TableCell>{getStatusBadge(exemption.status)}</TableCell>
                        <TableCell>
                          {format(new Date(exemption.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {exemption.exemptionAmount
                            ? `₱${exemption.exemptionAmount.toLocaleString()}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Admin view
  const pendingExemptions = exemptions.filter((e) => e.status === 'PENDING');
  const processedExemptions = exemptions.filter((e) => e.status !== 'PENDING');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemption Management</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Loading exemptions...</div>
        ) : (
          <div className="space-y-6">
            {/* Pending Exemptions */}
            {pendingExemptions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Pending Approvals</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingExemptions.map((exemption) => (
                      <TableRow key={exemption.id}>
                        <TableCell>{exemption.exemptionType.replace('_', ' ')}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {exemption.requestReason}
                        </TableCell>
                        <TableCell>
                          {exemption.supportingDocuments &&
                          Array.isArray(exemption.supportingDocuments) &&
                          exemption.supportingDocuments.length > 0 ? (
                            <div className="space-y-1">
                              {exemption.supportingDocuments.map((doc: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={doc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  Document {idx + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(exemption.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedExemption(exemption);
                                setShowApproveDialog(true);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedExemption(exemption);
                                setShowRejectDialog(true);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Processed Exemptions */}
            {processedExemptions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Processed Exemptions</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedExemptions.map((exemption) => (
                      <TableRow key={exemption.id}>
                        <TableCell>{exemption.exemptionType.replace('_', ' ')}</TableCell>
                        <TableCell>{getStatusBadge(exemption.status)}</TableCell>
                        <TableCell>
                          {exemption.exemptionAmount
                            ? `₱${exemption.exemptionAmount.toLocaleString()}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {exemption.approvedAt
                            ? format(new Date(exemption.approvedAt), 'MMM d, yyyy')
                            : exemption.rejectedAt
                            ? format(new Date(exemption.rejectedAt), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {exemptions.length === 0 && (
              <div className="text-center py-4 text-gray-500">No exemptions found</div>
            )}
          </div>
        )}

        {/* Approve Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Exemption</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Exemption Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={approveData.exemptionAmount}
                  onChange={(e) =>
                    setApproveData({ exemptionAmount: e.target.value })
                  }
                  placeholder="Enter exemption amount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isSubmitting}>
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Exemption</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  value={rejectData.rejectionReason}
                  onChange={(e) =>
                    setRejectData({ rejectionReason: e.target.value })
                  }
                  placeholder="Please provide a reason for rejection (minimum 10 characters)"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting}
              >
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

