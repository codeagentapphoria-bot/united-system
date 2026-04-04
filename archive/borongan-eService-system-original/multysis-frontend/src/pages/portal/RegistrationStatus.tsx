import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { citizenRegistrationService, type RegistrationStatusResponse } from '@/services/api/citizen-registration.service';
import { FiPhone, FiSearch, FiCheck, FiClock, FiX, FiAlertCircle } from 'react-icons/fi';
import { cn } from '@/lib/utils';

export const RegistrationStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<RegistrationStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.match(/^09\d{9}$/)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 11-digit phone number.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const result = await citizenRegistrationService.getRegistrationStatus(phoneNumber);
      setStatus(result);
    } catch (err: any) {
      setStatus(null);
      setError(err.message || 'No registration found for this phone number.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get display status (prefer workflowStatus, fall back to residencyStatus)
  const getDisplayStatus = () => {
    if (!status) return null;
    // Use workflowStatus if available, otherwise use residencyStatus
    return status.workflowStatus || status.status;
  };

  const getStatusIcon = (statusValue: string | null | undefined) => {
    if (!statusValue) return null;
    switch (statusValue) {
      case 'PENDING':
        return <FiClock className="h-6 w-6 text-yellow-500" />;
      case 'UNDER_REVIEW':
        return <FiSearch className="h-6 w-6 text-blue-500" />;
      case 'ACTIVE':
      case 'APPROVED':
        return <FiCheck className="h-6 w-6 text-green-500" />;
      case 'REJECTED':
        return <FiX className="h-6 w-6 text-red-500" />;
      case 'REQUIRES_RESUBMISSION':
        return <FiAlertCircle className="h-6 w-6 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (statusValue: string | null | undefined) => {
    if (!statusValue) return 'bg-gray-50 border-gray-200 text-gray-800';
    switch (statusValue) {
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'UNDER_REVIEW':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'ACTIVE':
      case 'APPROVED':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'REJECTED':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'REQUIRES_RESUBMISSION':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusLabel = (statusValue: string | null | undefined) => {
    if (!statusValue) return 'Unknown';
    switch (statusValue) {
      case 'PENDING':
        return 'Pending Review';
      case 'UNDER_REVIEW':
        return 'Under Review';
      case 'ACTIVE':
        return 'Approved & Active';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'REQUIRES_RESUBMISSION':
        return 'Requires Resubmission';
      case 'INACTIVE':
        return 'Inactive';
      default:
        return statusValue;
    }
  };

  const displayStatus = getDisplayStatus();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Check Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                      type="tel"
                      placeholder="09XXXXXXXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-12 pl-10"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading} className="h-12 px-6">
                    {isLoading ? 'Searching...' : 'Check Status'}
                  </Button>
                </div>
              </div>
            </form>

            {/* Error State */}
            {error && hasSearched && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <FiX className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">No Registration Found</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Result */}
            {status && (
              <div className="mt-6 space-y-4">
                {/* Status Card */}
                <div className={cn('p-4 rounded-lg border', getStatusColor(displayStatus))}>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(displayStatus)}
                    <div>
                      <p className="font-semibold">{getStatusLabel(displayStatus)}</p>
                      <p className="text-sm opacity-80">
                        Reference: {status.citizenId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Applicant:</span>
                    <span className="font-medium">
                      {status.firstName} {status.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted On:</span>
                    <span className="font-medium">
                      {new Date(status.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {status.reviewedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reviewed On:</span>
                      <span className="font-medium">
                        {new Date(status.reviewedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  {status.adminNotes && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-gray-600">Admin Notes:</span>
                      <p className="font-medium text-sm mt-1">{status.adminNotes}</p>
                    </div>
                  )}
                </div>

                {/* Rejection Reason */}
                {(displayStatus === 'REJECTED') && status.adminNotes && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="font-medium text-red-800 mb-2">Rejection Reason:</p>
                    <p className="text-sm text-red-700">{status.adminNotes}</p>
                    <p className="text-sm text-red-600 mt-3">
                      You may submit a new application with corrected information.
                    </p>
                    <Button
                      onClick={() => navigate('/portal/register')}
                      className="mt-4 bg-primary-600 hover:bg-primary-700"
                    >
                      Submit New Application
                    </Button>
                  </div>
                )}

                {/* Resubmission Request */}
                {displayStatus === 'REQUIRES_RESUBMISSION' && status.adminNotes && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="font-medium text-orange-800 mb-2">Additional Information Required:</p>
                    <p className="text-sm text-orange-700">{status.adminNotes}</p>
                    <p className="text-sm text-orange-600 mt-3">
                      Please submit a new application with the requested documents.
                    </p>
                    <Button
                      onClick={() => navigate('/portal/register')}
                      className="mt-4 bg-primary-600 hover:bg-primary-700"
                    >
                      Submit New Application
                    </Button>
                  </div>
                )}

                {/* Approved - Active Citizen */}
                {(displayStatus === 'ACTIVE' || displayStatus === 'APPROVED') && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-800 mb-2">Congratulations!</p>
                    <p className="text-sm text-green-700 mb-4">
                      Your registration has been approved. You should have received an email with your temporary password.
                    </p>
                    <div className="bg-white border border-green-300 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1 text-center">Check your email for login credentials</p>
                    </div>
                    <p className="text-sm text-green-600 mt-4">
                      Please change your password after logging in.
                    </p>
                    <Button
                      onClick={() => navigate('/portal')}
                      className="mt-4 w-full bg-green-600 hover:bg-green-700"
                    >
                      Go to Login
                    </Button>
                  </div>
                )}

                {/* Pending/Under Review - Info */}
                {(displayStatus === 'PENDING' || displayStatus === 'UNDER_REVIEW') && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="font-medium text-blue-800 mb-2">What's Next?</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Your application is being reviewed by our staff.</li>
                      <li>• You will receive an email notification once the review is complete.</li>
                      <li>• If approved, you will receive your temporary password via email.</li>
                      <li>• The review process typically takes 1-3 business days.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Initial State */}
            {!hasSearched && (
              <div className="mt-6 text-center text-gray-500">
                <FiSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter your phone number to check your registration status.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => navigate('/portal/register')}
            className="text-primary-600"
          >
            Submit New Application
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationStatusPage;
