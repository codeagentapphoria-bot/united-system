/**
 * RegistrationStatus.tsx
 *
 * Public page: check resident registration status by username.
 * Accessible without login — for applicants waiting for approval.
 * URL: /register/status?username=...
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api/auth.service';

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
});

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <FiClock size={16} />,
    description: 'Your application has been received and is waiting to be reviewed.',
  },
  under_review: {
    label: 'Under Review',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: <FiClock size={16} />,
    description: 'Your application is currently being reviewed by the administrator.',
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: <FiCheckCircle size={16} />,
    description: 'Your registration has been approved! You can now sign in to the portal.',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: <FiXCircle size={16} />,
    description: 'Your registration was rejected. Please see the admin notes below.',
  },
  requires_resubmission: {
    label: 'Resubmission Required',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: <FiAlertCircle size={16} />,
    description: 'You need to provide additional information or documents.',
  },
};

export const RegistrationStatus: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [statusData, setStatusData] = useState<any>(null);
  const [showResubmitForm, setShowResubmitForm] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  const form = useForm({ resolver: zodResolver(schema), defaultValues: { username: '' } });

  // Pre-fill from URL param
  useEffect(() => {
    const username = searchParams.get('username');
    if (username) {
      form.setValue('username', username);
      handleCheck({ username });
    }
  }, []);

  const handleCheck = async (data: { username: string }) => {
    setIsLoading(true);
    setStatusData(null);
    try {
      const res = await api.get(`/portal-registration/status/${encodeURIComponent(data.username)}`);
      setStatusData(res.data.data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Not Found',
        description: error.response?.data?.message || 'Registration not found for this username.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleResubmit = async () => {
    if (!selfieFile || !idFile) {
      toast({ variant: 'destructive', title: 'Missing files', description: 'Please upload both documents.' });
      return;
    }
    setResubmitting(true);
    try {
      const [selfieUrl, idDocumentUrl] = await Promise.all([
        fileToBase64(selfieFile),
        fileToBase64(idFile),
      ]);
      await api.post('/portal-registration/resubmit', {
        username: statusData.username,
        selfieUrl,
        idDocumentUrl,
      });
      toast({ title: 'Resubmission sent', description: 'Your documents have been re-submitted for review.' });
      setShowResubmitForm(false);
      setSelfieFile(null);
      setIdFile(null);
      await handleCheck({ username: statusData.username });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.response?.data?.message || 'Failed to submit.' });
    } finally {
      setResubmitting(false);
    }
  };

  const statusInfo = statusData ? STATUS_CONFIG[statusData.registrationStatus] : null;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">

      {/* Top nav */}
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-heading-500 hover:text-heading-700 transition-colors"
          >
            <img src="/favicon.png" alt="LGU Borongan" className="h-7 w-auto" />
            <span className="font-semibold text-sm hidden sm:block">Borongan Services Portal</span>
          </button>
        </div>
      </nav>

      {/* Back link */}
      <div className="max-w-md mx-auto w-full px-4 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FiArrowLeft size={14} />
          Back
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 py-8 px-4">
        <div className="max-w-md mx-auto space-y-6">

          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-heading-700">Check Registration Status</h1>
            <p className="text-sm text-gray-500 mt-1">
              Enter your username to check your application status.
            </p>
          </div>

          {/* Search form */}
          <Card>
            <CardContent className="pt-6">
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(handleCheck)}>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your registered username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Checking...' : 'Check Status'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Status result */}
          {statusData && statusInfo && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Applicant info + status badge */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {statusData.firstName} {statusData.lastName}
                    </p>
                    <p className="text-sm text-gray-500">@{statusData.username}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium ${statusInfo.color}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                  </div>
                </div>

                {/* Status description */}
                <p className="text-sm text-gray-600">{statusInfo.description}</p>

                {/* Admin notes */}
                {statusData.adminNotes && (
                  <div className="bg-gray-50 border rounded p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Admin Notes</p>
                    <p className="text-sm text-gray-700">{statusData.adminNotes}</p>
                  </div>
                )}

                <Separator />

                {/* Resubmission form */}
                {statusData.registrationStatus === 'requires_resubmission' && (
                  <div className="space-y-3">
                    {!showResubmitForm ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowResubmitForm(true)}
                      >
                        Re-upload Documents
                      </Button>
                    ) : (
                      <div className="space-y-3 border rounded p-4 bg-gray-50">
                        <p className="text-sm font-medium text-gray-700">Upload Required Documents</p>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">Selfie with Government ID</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => setSelfieFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">Government ID Document</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => setIdFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={handleResubmit}
                            disabled={resubmitting}
                          >
                            {resubmitting ? 'Submitting...' : 'Submit'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowResubmitForm(false)}
                            disabled={resubmitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Approved — sign in */}
                {statusData.registrationStatus === 'approved' && (
                  <Button className="w-full" onClick={() => navigate('/login')}>
                    Sign In Now
                  </Button>
                )}

                {/* Submitted date */}
                {statusData.submittedAt && (
                  <p className="text-xs text-gray-400 text-right">
                    Submitted: {new Date(statusData.submittedAt).toLocaleDateString('en-PH')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Links */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              New resident?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-primary hover:underline font-medium"
              >
                Register here
              </button>
            </p>
            <p className="text-sm text-gray-500">
              Already a member?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
