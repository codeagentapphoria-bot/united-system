import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { adminMenuItems } from '@/config/admin-menu';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDateWithoutTimezone, formatIdType } from '@/lib/utils';
import { adminRegistrationService, type RegistrationRequestResponse, type RegistrationRequestFilters } from '@/services/api/citizen-registration.service';
import { residentService } from '@/services/api/resident.service';
import { classificationTypeService } from '@/services/api/classificationType.service';
import { logger } from '@/utils/logger';
import React, { useEffect, useState } from 'react';
import { FiAlertCircle, FiCheck, FiEye, FiFileText, FiRotateCw, FiSearch, FiX, FiZoomIn } from 'react-icons/fi';
import ResidentClassificationsForm from '@/components/ui/ResidentClassificationsForm';
import type { ResidentInfo } from '@/components/ui/ResidentClassificationsForm';

type StatusFilter = 'ALL' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300',
  APPROVED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-red-100 text-red-800 border-red-300',
  REQUIRES_RESUBMISSION: 'bg-orange-100 text-orange-800 border-orange-300',
};

const STATUS_LABELS: Record<string, string> = {
  ALL: 'All',
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REQUIRES_RESUBMISSION: 'Needs Resubmission',
};

export const AdminRegistrationWorkflow: React.FC = () => {
  const { toast } = useToast();

  // State
  const [requests, setRequests] = useState<RegistrationRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequestResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION'>('APPROVED');
  const [adminNotes, setAdminNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Cleanup modal
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(30);

  // Image preview modal
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; label: string } | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  // Classification dialog
  const [classifyResident, setClassifyResident] = useState<ResidentInfo | null>(null);
  const [isClassifyModalOpen, setIsClassifyModalOpen] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);

  // Fetch registration requests
  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const filters: RegistrationRequestFilters = {
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchQuery || undefined,
        page: currentPage,
        limit,
      };

      const response = await adminRegistrationService.getRegistrationRequests(filters);
      setRequests(response.requests);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (error: any) {
      logger.error('Failed to fetch registration requests:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch registration requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, currentPage]);

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchRequests();
  };

  // Mark as under review
  const handleMarkUnderReview = async (request: RegistrationRequestResponse) => {
    try {
      await adminRegistrationService.markUnderReview(request.id);
      toast({
        title: 'Marked as Under Review',
        description: `Registration for ${request.citizen?.firstName} ${request.citizen?.lastName} is now under review.`,
      });
      fetchRequests();
    } catch (error: any) {
      logger.error('Failed to mark as under review:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark as under review',
        variant: 'destructive',
      });
    }
  };

  // Open review modal
  const handleReviewClick = (request: RegistrationRequestResponse, action: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setAdminNotes('');
    setIsReviewModalOpen(true);
  };

  // Submit review
  const handleReviewSubmit = async () => {
    if (!selectedRequest) return;

    try {
      setIsReviewing(true);

      if (reviewAction === 'REQUIRES_RESUBMISSION') {
        await adminRegistrationService.requestResubmission(selectedRequest.id, adminNotes || '');
        toast({
          title: 'Success',
          description: 'Resubmission requested. The resident will be notified.',
        });
        setIsReviewModalOpen(false);
        fetchRequests();
      } else {
        const result = await adminRegistrationService.reviewRegistration(
          selectedRequest.id,
          reviewAction,
          adminNotes || undefined
        );
        void result; // suppress unused variable warning
        toast({
          title: 'Success',
          description: `Registration ${reviewAction === 'APPROVED' ? 'approved' : 'rejected'} successfully`,
        });

        // After approval, fetch fresh resident data with auto-created classifications
        if (reviewAction === 'APPROVED' && selectedRequest.resident) {
          try {
            const residentId = selectedRequest.resident.id;
            if (residentId) {
              const freshResident = await residentService.getResident(residentId);
              setClassifyResident(freshResident as unknown as ResidentInfo);
            } else {
              setClassifyResident(selectedRequest.resident as unknown as ResidentInfo);
            }
          } catch (err) {
            logger.warn('Failed to fetch fresh resident for classification pre-fill', err);
            setClassifyResident(selectedRequest.resident as unknown as ResidentInfo);
          }
          setIsClassifyModalOpen(true);
          setIsReviewModalOpen(false);
        } else {
          setIsReviewModalOpen(false);
          fetchRequests();
        }
      }
    } catch (error: any) {
      logger.error('Failed to review registration:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to review registration',
        variant: 'destructive',
      });
    } finally {
      setIsReviewing(false);
    }
  };

  // Save classifications for a resident
  const handleClassificationSave = async (
    data: { classifications: Array<{ type: string; details: Record<string, unknown> | null }> }
  ) => {
    if (!classifyResident) return;

    setIsClassifying(true);
    try {
      await Promise.all(
        data.classifications.map((cls) =>
          classificationTypeService.insertClassification({
            residentId: classifyResident.id,
            classificationType: cls.type,
            classificationDetails: cls.details ?? undefined,
          })
        )
      );

      toast({
        title: 'Classifications Saved',
        description: 'Resident classifications have been assigned successfully.',
      });

      setIsClassifyModalOpen(false);
      setClassifyResident(null);
      fetchRequests();
    } catch (error: any) {
      logger.error('Failed to save classifications:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save classifications',
        variant: 'destructive',
      });
      throw error; // Re-throw so the form doesn't close
    } finally {
      setIsClassifying(false);
    }
  };

  // Handle cleanup
  const handleCleanup = async () => {
    try {
      setIsCleaning(true);
      const result = await adminRegistrationService.deleteRejectedRegistrations(cleanupDays);

      toast({
        title: 'Success',
        description: `Deleted ${result.deletedCount} rejected registration(s)`,
      });

      setIsCleanupModalOpen(false);
      fetchRequests();
    } catch (error: any) {
      logger.error('Failed to cleanup rejected registrations:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cleanup rejected registrations',
        variant: 'destructive',
      });
    } finally {
      setIsCleaning(false);
    }
  };

  // Open detail modal
  const handleViewDetails = (request: RegistrationRequestResponse) => {
    setSelectedRequest(request);
    setIsDetailModalOpen(true);
  };

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registration Approvals</h1>
          <p className="text-gray-500">Review and process resident registration requests from the portal</p>
        </div>



        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['ALL', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'] as StatusFilter[]).slice(0, 4).map((status) => (
            <Card 
              key={status}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                statusFilter === status && 'ring-2 ring-primary-500'
              )}
              onClick={() => setStatusFilter(status)}
            >
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {status === 'ALL' ? totalCount : requests.filter(r => r.status === status).length}
                </div>
                <p className="text-sm text-gray-500">{STATUS_LABELS[status]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>Search</Button>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No registration requests found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Applicant</th>
                      <th className="text-left py-3 px-4 font-medium">Contact</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Submitted</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">
                              {request.citizen 
                                ? `${request.citizen.firstName} ${request.citizen.lastName}`
                                : 'N/A'
                              }
                            </p>
                            {request.citizen?.extensionName && (
                              <p className="text-sm text-gray-500">{request.citizen.extensionName}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <p>{request.citizen?.phoneNumber || 'N/A'}</p>
                            <p className="text-gray-500">{request.citizen?.email || 'No email'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={STATUS_COLORS[request.status]}>
                            {STATUS_LABELS[request.status]}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {formatDateWithoutTimezone(request.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(request)}
                              title="View details"
                            >
                              <FiEye className="h-4 w-4" />
                            </Button>
                            {request.status === 'PENDING' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkUnderReview(request)}
                                title="Mark under review"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <FiFileText className="h-4 w-4" />
                              </Button>
                            )}
                            {(request.status === 'PENDING' || request.status === 'UNDER_REVIEW') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReviewClick(request, 'APPROVED')}
                                  title="Approve"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <FiCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReviewClick(request, 'REJECTED')}
                                  title="Reject"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <FiX className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))}
                  onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Registration Details</h2>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <Badge className={STATUS_COLORS[selectedRequest.status]}>
                    {STATUS_LABELS[selectedRequest.status]}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    ID: {selectedRequest.id.slice(0, 8)}...
                  </span>
                </div>

                {/* BIMS Resident Match Warning */}
                {selectedRequest.bimsMatchStatus === 'NOT_FOUND' && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <FiAlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-amber-800">No BIMS resident record found</p>
                      <p className="text-amber-700 mt-0.5">
                        This citizen has no matching record in the Barangay Information
                        Management System. They may not be a registered Borongan resident yet.
                        Verify their identity and residency before approving.
                      </p>
                    </div>
                  </div>
                )}
                {selectedRequest.bimsMatchStatus === 'PENDING' && (
                  <div className="flex items-start gap-3 rounded-lg border border-blue-300 bg-blue-50 p-3">
                    <FiAlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-800">BIMS match awaiting confirmation</p>
                      <p className="text-blue-700 mt-0.5">
                        A probable matching resident was found in BIMS (score 85–94).
                        Confirm the match in the citizen–resident mapping before approving.
                      </p>
                    </div>
                  </div>
                )}
                {selectedRequest.bimsMatchStatus === 'NEEDS_REVIEW' && (
                  <div className="flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 p-3">
                    <FiAlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-orange-800">Ambiguous BIMS match — review required</p>
                      <p className="text-orange-700 mt-0.5">
                        Multiple BIMS residents matched this citizen. Staff must manually
                        select the correct resident before approving.
                      </p>
                    </div>
                  </div>
                )}
                {selectedRequest.bimsMatchStatus === 'CONFIRMED' && (
                  <div className="flex items-start gap-3 rounded-lg border border-green-300 bg-green-50 p-3">
                    <FiCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-800">BIMS resident record verified</p>
                      <p className="text-green-700 mt-0.5">
                        A confirmed matching resident was found in BIMS (score ≥ 95).
                        Residency is verified.
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Personal Information */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Full Name</p>
                      <p className="font-medium">
                        {selectedRequest.citizen 
                          ? `${selectedRequest.citizen.firstName} ${selectedRequest.citizen.middleName || ''} ${selectedRequest.citizen.lastName} ${selectedRequest.citizen.extensionName || ''}`.trim()
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Birth Date</p>
                      <p className="font-medium">
                        {selectedRequest.citizen?.birthDate 
                          ? formatDateWithoutTimezone(selectedRequest.citizen.birthDate)
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Sex</p>
                      <p className="font-medium">{selectedRequest.citizen?.sex || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Civil Status</p>
                      <p className="font-medium">{selectedRequest.citizen?.civilStatus || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Phone Number</p>
                      <p className="font-medium">{selectedRequest.citizen?.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium">{selectedRequest.citizen?.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Address */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Address</h3>
                  <p className="text-sm text-gray-600">
                    {[
                      selectedRequest.citizen?.addressStreetAddress,
                      selectedRequest.citizen?.addressBarangay,
                      selectedRequest.citizen?.addressMunicipality,
                      selectedRequest.citizen?.addressProvince,
                      selectedRequest.citizen?.addressPostalCode,
                    ].filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>

                <Separator />

                {/* Documents */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Documents</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">ID Type</p>
                      <p className="font-medium">{formatIdType(selectedRequest.citizen?.idType || '')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">ID Number</p>
                      <p className="font-medium">{selectedRequest.citizen?.idDocumentNumber || 'N/A'}</p>
                    </div>
                  </div>
                  {(selectedRequest.citizen?.proofOfIdentification || selectedRequest.selfieUrl) && (
                    <div className="mt-4">
                      <div className="flex gap-4">
                        {selectedRequest.citizen?.proofOfIdentification && (
                          <div className="relative group">
                            <p className="text-gray-500 mb-2">ID Document</p>
                            <div className="relative w-32 h-40">
                              <img 
                                src={selectedRequest.citizen.proofOfIdentification} 
                                alt="ID Document" 
                                className="w-full h-full object-cover rounded-lg border cursor-pointer"
                                onClick={() => {
                                  setPreviewImage({
                                    src: selectedRequest.citizen!.proofOfIdentification!,
                                    label: 'ID Document'
                                  });
                                  setIsImagePreviewOpen(true);
                                }}
                              />
                              <div 
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                                onClick={() => {
                                  setPreviewImage({
                                    src: selectedRequest.citizen!.proofOfIdentification!,
                                    label: 'ID Document'
                                  });
                                  setIsImagePreviewOpen(true);
                                }}
                              >
                                <FiZoomIn className="text-white h-8 w-8" />
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedRequest.selfieUrl && (
                          <div className="relative group">
                            <p className="text-gray-500 mb-2">Selfie (for verification)</p>
                            <div className="relative w-32 h-40">
                              <img 
                                src={selectedRequest.selfieUrl} 
                                alt="Selfie verification" 
                                className="w-full h-full object-cover rounded-lg border cursor-pointer"
                                onClick={() => {
                                  setPreviewImage({
                                    src: selectedRequest.selfieUrl!,
                                    label: 'Selfie Verification'
                                  });
                                  setIsImagePreviewOpen(true);
                                }}
                              />
                              <div 
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                                onClick={() => {
                                  setPreviewImage({
                                    src: selectedRequest.selfieUrl!,
                                    label: 'Selfie Verification'
                                  });
                                  setIsImagePreviewOpen(true);
                                }}
                              >
                                <FiZoomIn className="text-white h-8 w-8" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedRequest.adminNotes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Admin Notes</h3>
                      <p className="text-sm text-gray-600">{selectedRequest.adminNotes}</p>
                    </div>
                  </>
                )}

                {/* Actions */}
                {(selectedRequest.status === 'PENDING' || selectedRequest.status === 'UNDER_REVIEW') && (
                  <div className="flex gap-4 pt-4">
                    <Button
                      variant="default"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleReviewClick(selectedRequest, 'APPROVED');
                      }}
                    >
                      <FiCheck className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleReviewClick(selectedRequest, 'REQUIRES_RESUBMISSION');
                      }}
                    >
                      <FiRotateCw className="mr-2 h-4 w-4" />
                      Request Docs
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        handleReviewClick(selectedRequest, 'REJECTED');
                      }}
                    >
                      <FiX className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {isReviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {reviewAction === 'APPROVED' ? 'Approve' : reviewAction === 'REJECTED' ? 'Reject' : 'Request Resubmission'}
                </h2>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <p className="text-gray-600 mb-4">
                {reviewAction === 'APPROVED'
                  ? `Are you sure you want to approve the registration for ${selectedRequest.citizen?.firstName} ${selectedRequest.citizen?.lastName}?`
                  : reviewAction === 'REJECTED'
                  ? `Are you sure you want to reject the registration for ${selectedRequest.citizen?.firstName} ${selectedRequest.citizen?.lastName}?`
                  : `Request resubmission for ${selectedRequest.citizen?.firstName} ${selectedRequest.citizen?.lastName}? The resident will be asked to re-upload their documents.`
                }
              </p>

              {/* BIMS warning inside the review modal */}
              {reviewAction === 'APPROVED' && selectedRequest.bimsMatchStatus === 'NOT_FOUND' && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 mb-4">
                  <FiAlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800">Warning: No BIMS resident record found</p>
                    <p className="text-amber-700 mt-0.5">
                      This citizen has no verified resident record in BIMS.
                      Approving will grant portal access without confirmed residency.
                    </p>
                  </div>
                </div>
              )}
              {reviewAction === 'APPROVED' && (selectedRequest.bimsMatchStatus === 'PENDING' || selectedRequest.bimsMatchStatus === 'NEEDS_REVIEW') && (
                <div className="flex items-start gap-3 rounded-lg border border-blue-300 bg-blue-50 p-3 mb-4">
                  <FiAlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-800">
                      {selectedRequest.bimsMatchStatus === 'NEEDS_REVIEW' ? 'Ambiguous BIMS match' : 'BIMS match unconfirmed'}
                    </p>
                    <p className="text-blue-700 mt-0.5">
                      The BIMS resident link has not been confirmed yet. Consider verifying
                      the match before approving.
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Notes {(reviewAction === 'REJECTED' || reviewAction === 'REQUIRES_RESUBMISSION') && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={reviewAction === 'REQUIRES_RESUBMISSION' ? 'What documents or information is needed?' : 'Enter reason for rejection...'}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsReviewModalOpen(false)}
                  disabled={isReviewing}
                >
                  Cancel
                </Button>
                <Button
                  variant={reviewAction === 'APPROVED' ? 'default' : reviewAction === 'REJECTED' ? 'destructive' : 'default'}
                  className="flex-1"
                  onClick={handleReviewSubmit}
                  disabled={isReviewing || (reviewAction === 'REQUIRES_RESUBMISSION' && !adminNotes.trim())}
                >
                  {isReviewing ? 'Processing...' : reviewAction === 'APPROVED' ? 'Approve' : reviewAction === 'REJECTED' ? 'Reject' : 'Request Resubmission'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Modal */}
      {isCleanupModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Cleanup Rejected Registrations</h2>
                <button
                  onClick={() => setIsCleanupModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="flex items-start gap-3 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <FiAlertCircle className="text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  This will permanently delete all rejected registrations older than the specified number of days. This action cannot be undone.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delete rejected registrations older than:
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={cleanupDays}
                    onChange={(e) => setCleanupDays(parseInt(e.target.value) || 30)}
                    className="w-24"
                  />
                  <span className="text-gray-600">days</span>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCleanupModalOpen(false)}
                  disabled={isCleaning}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCleanup}
                  disabled={isCleaning}
                >
                  {isCleaning ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {isImagePreviewOpen && previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]"
          onClick={() => setIsImagePreviewOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
            onClick={() => setIsImagePreviewOpen(false)}
          >
            <FiX className="h-8 w-8" />
          </button>
          <div className="max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-center mb-4 text-lg font-medium">{previewImage.label}</p>
            <img
              src={previewImage.src}
              alt={previewImage.label}
              className="max-w-full max-h-[80vh] object-contain mx-auto rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Classification Dialog */}
      <Dialog open={isClassifyModalOpen} onOpenChange={setIsClassifyModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {classifyResident?.firstName?.[0]}{classifyResident?.lastName?.[0]}
              </div>
              <div>
                <DialogTitle className="text-sm">
                  {classifyResident?.firstName}{' '}
                  {classifyResident?.middleName ? classifyResident.middleName + ' ' : ''}
                  {classifyResident?.lastName}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Assign classifications — optional, can be updated later
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {classifyResident && (
              <ResidentClassificationsForm
                resident={classifyResident}
                municipalityId={classifyResident.barangay?.municipality?.id ?? 1}
                onSubmit={handleClassificationSave}
                onCancel={() => {
                  setIsClassifyModalOpen(false);
                  setClassifyResident(null);
                  fetchRequests();
                }}
                showResidentInfo={false}
                showActions={false}
                loading={isClassifying}
                formId="classification-form"
              />
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30 shrink-0">
            <p className="text-xs text-muted-foreground">
              You can also assign classifications later from Resident Management.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsClassifyModalOpen(false);
                  setClassifyResident(null);
                  fetchRequests();
                }}
              >
                Skip
              </Button>
              <Button
                size="sm"
                type="submit"
                form="classification-form"
                disabled={isClassifying}
              >
                {isClassifying ? 'Saving...' : 'Save Classifications'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminRegistrationWorkflow;
