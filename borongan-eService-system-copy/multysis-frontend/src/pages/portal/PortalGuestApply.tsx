/**
 * PortalGuestApply.tsx
 *
 * Non-resident (guest) service application.
 * Accessible at /portal/apply-as-guest?serviceId=xxx (serviceId is optional pre-select)
 *
 * Flow:
 *   1. Select a service (or use pre-selected from query param)
 *   2. Fill in applicant info (name, contact, email, address)
 *   3. Submit → POST /api/transactions with applicantName etc.
 *   4. Show reference number + link to /portal/track
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PortalLayout } from '@/components/layout/PortalLayout';
import { useToast } from '@/hooks/use-toast';
import { serviceService, type Service } from '@/services/api/service.service';
import api from '@/services/api/auth.service';
import { FiAlertTriangle, FiArrowLeft, FiArrowRight, FiCheckCircle, FiClipboard, FiUser } from 'react-icons/fi';

// ── Schema ─────────────────────────────────────────────────────────────────
const guestSchema = z.object({
  serviceId:       z.string().min(1, 'Please select a service'),
  applicantName:   z.string().min(2, 'Full name is required'),
  applicantContact: z.string().min(10, 'Contact number is required'),
  applicantEmail:  z.string().email('Invalid email').or(z.literal('')).optional(),
  applicantAddress: z.string().min(5, 'Address is required'),
  purpose:         z.string().optional(),
});
type GuestInput = z.infer<typeof guestSchema>;

// ── Component ───────────────────────────────────────────────────────────────
export const PortalGuestApply: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [submitted, setSubmitted] = useState<{ referenceNumber: string; serviceName: string } | null>(null);

  const form = useForm<GuestInput>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      serviceId:        searchParams.get('serviceId') || '',
      applicantName:    '',
      applicantContact: '',
      applicantEmail:   '',
      applicantAddress: '',
      purpose:          '',
    },
  });

  useEffect(() => {
    serviceService
      .getActiveServices({ displayInSubscriberTabs: true })
      .then(setServices)
      .catch(console.error)
      .finally(() => setIsLoadingServices(false));
  }, []);

  const selectedServiceId = form.watch('serviceId');
  const selectedService = services.find((s) => s.id === selectedServiceId);
  const isBarangayCertificate = selectedService?.category === 'Barangay Certificate';

  const onSubmit = async (data: GuestInput) => {
    try {
      const response = await api.post('/transactions', {
        serviceId:        data.serviceId,
        applicantName:    data.applicantName,
        applicantContact: data.applicantContact,
        applicantEmail:   data.applicantEmail || undefined,
        applicantAddress: data.applicantAddress,
        serviceData:      data.purpose ? { purpose: data.purpose } : undefined,
        applicationDate:  new Date().toISOString(),
      });

      const tx = response.data.data ?? response.data;
      setSubmitted({
        referenceNumber: tx.referenceNumber,
        serviceName:     selectedService?.name ?? 'Service',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: err.response?.data?.message || err.message || 'Please try again',
      });
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <PortalLayout>
        <div className="max-w-lg mx-auto py-16 text-center space-y-6">
          <FiCheckCircle size={64} className="mx-auto text-green-500" />
          <h2 className="text-2xl font-bold text-heading-700">Application Submitted!</h2>
          <p className="text-gray-600">
            Your application for <strong>{submitted.serviceName}</strong> has been received.
          </p>

          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-gray-500 mb-1">Your reference number</p>
              <p className="text-2xl font-mono font-bold text-primary-700">
                {submitted.referenceNumber}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Save this number to track your application status.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate(`/portal/track?ref=${submitted.referenceNumber}`)}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <FiClipboard size={16} className="mr-2" />
              Track Application
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/portal/e-government')}
            >
              Browse More Services
            </Button>
          </div>
        </div>
      </PortalLayout>
    );
  }

  // ── Application form ───────────────────────────────────────────────────────
  return (
    <PortalLayout>
      <div className="max-w-2xl mx-auto py-10 px-4">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <FiArrowLeft size={14} /> Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-heading-700 flex items-center gap-2">
            <FiUser className="text-primary-600" /> Apply as Guest
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Submit a service application without creating an account.
            Save your reference number to track your application.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Service selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select a Service</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          disabled={isLoadingServices}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">
                            {isLoadingServices ? 'Loading services…' : 'Select a service'}
                          </option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}{s.category ? ` (${s.category})` : ''}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedService?.description && (
                  <p className="text-xs text-gray-500 mt-2">{selectedService.description}</p>
                )}
                {selectedService?.requiresPayment && (
                  <p className="text-xs text-orange-600 mt-1 font-medium">
                    This service requires payment.
                    {selectedService.defaultAmount
                      ? ` Fee: ₱${Number(selectedService.defaultAmount).toFixed(2)}`
                      : ''}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Barangay certificate block — shown instead of the form when applicable */}
            {isBarangayCertificate ? (
              <Card className="border-amber-300 bg-amber-50">
                <CardContent className="py-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <FiAlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800">
                        This certificate is for registered residents only
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Barangay certificates (clearance, indigency, residency, etc.) are issued
                        based on your residency record. Guest applicants cannot request them online
                        because they have no barangay on file to process the request.
                      </p>
                    </div>
                  </div>

                  <Separator className="border-amber-200" />

                  <p className="text-sm font-medium text-amber-800">You have two options:</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1 — register */}
                    <button
                      type="button"
                      onClick={() => navigate('/portal/register')}
                      className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-white p-4 text-left hover:bg-amber-50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                        Register as a Resident
                        <FiArrowRight size={13} />
                      </span>
                      <span className="text-xs text-amber-700">
                        Create a portal account. Once your registration is approved, you can
                        request barangay certificates online.
                      </span>
                    </button>

                    {/* Option 2 — walk-in */}
                    <div className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-white p-4">
                      <span className="text-sm font-semibold text-amber-900">
                        Visit Your Barangay Hall
                      </span>
                      <span className="text-xs text-amber-700">
                        Walk in during office hours. Bring a valid government-issued ID. Staff will
                        prepare your certificate on the spot or within the same day.
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-start pt-1">
                    <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                      <FiArrowLeft size={14} className="mr-1.5" /> Go Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Applicant info — only shown for non-barangay-certificate services */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Applicant Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="applicantName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Juan Santos Dela Cruz" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="applicantContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Number *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="09XXXXXXXXX" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="applicantEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (optional)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="your@email.com" type="email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="applicantAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Street, Barangay, City" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purpose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. For employment, For school enrollment" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Separator />

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary-600 hover:bg-primary-700"
                    disabled={form.formState.isSubmitting || !selectedServiceId}
                  >
                    {form.formState.isSubmitting ? 'Submitting…' : 'Submit Application'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </div>
    </PortalLayout>
  );
};
