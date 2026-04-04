// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Custom Components
import { PortalLayout } from '@/components/layout/PortalLayout';
import { EditProfileModal } from '@/components/modals/subscribers/EditProfileModal';
import { LoginPrompt } from '@/components/portal/LoginPrompt';
import { MyApplications } from '@/components/portal/MyApplications';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Services
import { subscriberService, type Subscriber } from '@/services/api/subscriber.service';
import type { EditProfileInput } from '@/validations/subscriber.schema';

// Utils
import { getRegionName } from '@/constants/regions';
import { FiCalendar, FiEdit, FiFileText, FiMail, FiMapPin, FiPhone, FiUser } from 'react-icons/fi';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

type ProfileInput = z.infer<typeof profileSchema>;

// Helper function to format date
const formatDateWithoutTimezone = (dateString: string, options?: Intl.DateTimeFormatOptions) => {
  if (!dateString) return 'Not provided';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', options || {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper function to format residentAddress by formatting the region
// Helper function to parse residentAddress string into structured components
// Format: "Street, Barangay, Municipality, Province, Region, PostalCode"
const parseResidentAddressForDisplay = (addressString: string | undefined): {
  streetAddress?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  region?: string;
  postalCode?: string;
} => {
  if (!addressString || !addressString.trim()) {
    return {};
  }
  
  const parts = addressString.split(',').map(part => part.trim()).filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return {};
  }
  
  const parsed: { [key: string]: string } = {};
  
  // Parse from right to left (most specific to least specific)
  if (parts.length > 0) parsed.postalCode = parts.pop() || '';
  if (parts.length > 0) parsed.region = parts.pop() || '';
  if (parts.length > 0) parsed.province = parts.pop() || '';
  if (parts.length > 0) parsed.municipality = parts.pop() || '';
  if (parts.length > 0) parsed.barangay = parts.pop() || '';
  if (parts.length > 0) parsed.streetAddress = parts.join(', '); // Remaining parts form street address
  
  return {
    streetAddress: parsed.streetAddress,
    barangay: parsed.barangay,
    municipality: parsed.municipality,
    province: parsed.province,
    region: parsed.region,
    postalCode: parsed.postalCode,
  };
};

// Helper function to get status badge
const getStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    active: 'bg-success-100 text-success-700',
    pending: 'bg-warning-100 text-warning-700',
    expired: 'bg-neutral-200 text-neutral-700',
    blocked: 'bg-red-100 text-red-700',
  };

  return (
    <Badge className={variants[status.toLowerCase()] || variants.pending}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export const PortalProfile: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isCitizenLinked, setIsCitizenLinked] = useState(false);
  const [subscriberData, setSubscriberData] = useState<Subscriber | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentUser = user;

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: currentUser?.name || '',
      email: (currentUser as any)?.email || '',
      phoneNumber: currentUser?.phoneNumber || '',
    },
  });

  useEffect(() => {
    if (currentUser?.id) {
      fetchSubscriberProfile();
    }
  }, [currentUser?.id]);

  const fetchSubscriberProfile = async () => {
    if (!currentUser?.id) return;

    try {
      setIsLoadingProfile(true);
      const subscriber = await subscriberService.getSubscriber(currentUser.id);
      setSubscriberData(subscriber);
      setProfilePicture(subscriber.profilePicture || null);
      
      // Check if subscriber is linked to a citizen
      const isLinkedToCitizen = !!(subscriber.citizenId || subscriber.citizen);
      setIsCitizenLinked(isLinkedToCitizen);
      
      // Update form with fetched data
      form.reset({
        name: subscriber.firstName && subscriber.lastName
          ? `${subscriber.firstName} ${subscriber.middleName || ''} ${subscriber.lastName}`.trim()
          : currentUser?.name || '',
        email: subscriber.email || (currentUser as any)?.email || '',
        phoneNumber: subscriber.phoneNumber || currentUser?.phoneNumber || '',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch profile data',
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };


  const handleEditProfile = async (data: EditProfileInput) => {
    if (!currentUser?.id) return;
    
    try {
      await subscriberService.updateSubscriber(currentUser.id, data);
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      
      // Refresh profile data
      await fetchSubscriberProfile();
      setIsEditModalOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update profile',
      });
      throw error; // Re-throw to prevent modal from closing
    }
  };

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <PortalLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (!currentUser) {
    return (
      <PortalLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-heading-700 mb-4">Profile</h1>
            <p className="text-lg text-heading-600">
              Manage your profile and account settings. Login to access your profile.
            </p>
          </div>
          <LoginPrompt
            title="Login to Manage Your Profile"
            description="Log in to access and manage your profile:"
            features={[
              'Update personal information',
              'Change password',
              'Manage account settings',
              'View account activity',
              'Update contact preferences',
            ]}
          />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-heading-700 mb-4">Profile</h1>
          <p className="text-lg text-heading-600">
            Manage your profile and account settings.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="inline-flex h-12 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-600 mb-6 w-full">
            <TabsTrigger 
              value="profile" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-primary-700 data-[state=active]:shadow-sm gap-2 flex-1"
            >
              <FiUser size={18} />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="applications" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-primary-700 data-[state=active]:shadow-sm gap-2 flex-1"
            >
              <FiFileText size={18} />
              <span className="hidden sm:inline">My Applications</span>
              <span className="sm:hidden">Applications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-6">
            {isLoadingProfile ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : subscriberData ? (
              <>
                {/* Profile Header */}
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-600 to-primary-700 h-32"></div>
                  <CardContent className="pt-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 -mt-16 pb-6">
                      <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                          {profilePicture || subscriberData.citizen?.citizenPicture ? (
                            <img
                              src={subscriberData.citizen?.citizenPicture || profilePicture || ''}
                              alt={`${subscriberData.firstName} ${subscriberData.lastName}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNjAiIHI9IjI1IiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMCAxMjBDMzAgMTAwLjExOCA0NS4xMTggODUgNjUgODVIOThDMTE4Ljg4MiA4NSAxMzQgMTAwLjExOCAxMzQgMTIwVjE1MEgzMFYxMjBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPg==';
                              }}
                            />
                          ) : (
                            <FiUser size={64} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                          <h2 className="text-3xl font-bold text-heading-800 mb-2">
                            {subscriberData.citizen
                              ? `${subscriberData.citizen.firstName} ${subscriberData.citizen.middleName || ''} ${subscriberData.citizen.lastName} ${subscriberData.citizen.extensionName || ''}`.trim()
                              : `${subscriberData.firstName} ${subscriberData.middleName || ''} ${subscriberData.lastName} ${subscriberData.extensionName || ''}`.trim()
                            }
                          </h2>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            {subscriberData.residentId && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Resident ID:</span>
                                <span className="font-mono font-semibold text-heading-700">{subscriberData.residentId}</span>
                              </div>
                            )}
                            <div>{getStatusBadge(subscriberData.status)}</div>
                          </div>
                        </div>
                        <Button
                          onClick={() => setIsEditModalOpen(true)}
                          className="bg-primary-600 hover:bg-primary-700 text-white"
                        >
                          <FiEdit className="mr-2" size={18} />
                          Edit Profile
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Information Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Personal Information Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FiUser className="text-primary-600" size={20} />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">First Name</p>
                          <p className="text-sm font-medium text-heading-800">
                            {subscriberData.citizen?.firstName || subscriberData.firstName || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Last Name</p>
                          <p className="text-sm font-medium text-heading-800">
                            {subscriberData.citizen?.lastName || subscriberData.lastName || '—'}
                          </p>
                        </div>
                        {subscriberData.citizen?.middleName || subscriberData.middleName ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Middle Name</p>
                            <p className="text-sm font-medium text-heading-800">
                              {subscriberData.citizen?.middleName || subscriberData.middleName}
                            </p>
                          </div>
                        ) : null}
                        {subscriberData.citizen?.extensionName || subscriberData.extensionName ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Extension</p>
                            <p className="text-sm font-medium text-heading-800">
                              {subscriberData.citizen?.extensionName || subscriberData.extensionName}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      {(subscriberData.citizen?.birthDate || subscriberData.birthDate) && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date of Birth</p>
                          <p className="text-sm font-medium text-heading-800 flex items-center gap-2">
                            <FiCalendar size={16} className="text-gray-400" />
                            {formatDateWithoutTimezone(subscriberData.citizen?.birthDate || subscriberData.birthDate || '', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {(subscriberData.citizen?.sex || subscriberData.sex) && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Gender</p>
                            <p className="text-sm font-medium text-heading-800 capitalize">
                              {subscriberData.citizen?.sex || subscriberData.sex}
                            </p>
                          </div>
                        )}
                        {(subscriberData.citizen?.civilStatus || subscriberData.civilStatus) && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Civil Status</p>
                            <p className="text-sm font-medium text-heading-800 capitalize">
                              {subscriberData.citizen?.civilStatus || subscriberData.civilStatus}
                            </p>
                          </div>
                        )}
                      </div>
                      {!(subscriberData.citizen?.birthDate || subscriberData.birthDate) && 
                       !(subscriberData.citizen?.sex || subscriberData.sex) && 
                       !(subscriberData.citizen?.civilStatus || subscriberData.civilStatus) && (
                        <p className="text-sm text-gray-500 italic">No additional personal information available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Contact Information Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FiMail className="text-primary-600" size={20} />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {subscriberData.phoneNumber || subscriberData.citizen?.phoneNumber ? (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone Number</p>
                          <p className="text-sm font-medium text-heading-800 flex items-center gap-2">
                            <FiPhone size={16} className="text-gray-400" />
                            {subscriberData.phoneNumber || subscriberData.citizen?.phoneNumber}
                          </p>
                        </div>
                      ) : null}
                      {subscriberData.email || subscriberData.citizen?.email ? (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email Address</p>
                          <p className="text-sm font-medium text-heading-800 flex items-center gap-2">
                            <FiMail size={16} className="text-gray-400" />
                            {subscriberData.email || subscriberData.citizen?.email}
                          </p>
                        </div>
                      ) : null}
                      {subscriberData.residencyStatus && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Residency Status</p>
                          <div className="mt-1">{getStatusBadge(subscriberData.residencyStatus)}</div>
                        </div>
                      )}
                      {subscriberData.residencyType && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Residency Type</p>
                          <p className="text-sm font-medium text-heading-800 capitalize">
                            {subscriberData.residencyType.replace('-', ' ')}
                          </p>
                        </div>
                      )}
                      {!subscriberData.phoneNumber && 
                       !subscriberData.citizen?.phoneNumber && 
                       !subscriberData.email && 
                       !subscriberData.citizen?.email && 
                       !subscriberData.residencyStatus && 
                       !subscriberData.residencyType && (
                        <p className="text-sm text-gray-500 italic">No contact information available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Address Card */}
                  {(subscriberData.citizen?.addressRegion || subscriberData.residentAddress) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FiMapPin className="text-primary-600" size={20} />
                          Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {subscriberData.citizen ? (
                          <>
                            {subscriberData.citizen.addressRegion && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Region</p>
                                <p className="text-sm font-medium text-heading-800">
                                  {getRegionName(subscriberData.citizen.addressRegion)}
                                </p>
                              </div>
                            )}
                            {subscriberData.citizen.addressProvince && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Province</p>
                                <p className="text-sm font-medium text-heading-800">
                                  {subscriberData.citizen.addressProvince}
                                </p>
                              </div>
                            )}
                            {subscriberData.citizen.addressMunicipality && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Municipality</p>
                                <p className="text-sm font-medium text-heading-800">
                                  {subscriberData.citizen.addressMunicipality}
                                </p>
                              </div>
                            )}
                            {subscriberData.citizen.addressBarangay && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Barangay</p>
                                <p className="text-sm font-medium text-heading-800">
                                  {subscriberData.citizen.addressBarangay}
                                </p>
                              </div>
                            )}
                            {subscriberData.citizen.addressStreetAddress && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Street Address</p>
                                <p className="text-sm font-medium text-heading-800">
                                  {subscriberData.citizen.addressStreetAddress}
                                </p>
                              </div>
                            )}
                            {subscriberData.citizen.addressPostalCode && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Postal Code</p>
                                <p className="text-sm font-medium text-heading-800">
                                  {subscriberData.citizen.addressPostalCode}
                                </p>
                              </div>
                            )}
                            {!subscriberData.citizen.addressRegion && 
                             !subscriberData.citizen.addressProvince && 
                             !subscriberData.citizen.addressMunicipality && 
                             !subscriberData.citizen.addressBarangay && 
                             !subscriberData.citizen.addressStreetAddress && 
                             !subscriberData.citizen.addressPostalCode && (
                              <p className="text-sm text-gray-500 italic">No address information available</p>
                            )}
                          </>
                        ) : subscriberData.residentAddress ? (
                          (() => {
                            const parsedAddress = parseResidentAddressForDisplay(subscriberData.residentAddress);
                            return (
                              <>
                                {parsedAddress.region && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Region</p>
                                    <p className="text-sm font-medium text-heading-800">
                                      {getRegionName(parsedAddress.region)}
                                    </p>
                                  </div>
                                )}
                                {parsedAddress.province && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Province</p>
                                    <p className="text-sm font-medium text-heading-800">
                                      {parsedAddress.province}
                                    </p>
                                  </div>
                                )}
                                {parsedAddress.municipality && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Municipality</p>
                                    <p className="text-sm font-medium text-heading-800">
                                      {parsedAddress.municipality}
                                    </p>
                                  </div>
                                )}
                                {parsedAddress.barangay && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Barangay</p>
                                    <p className="text-sm font-medium text-heading-800">
                                      {parsedAddress.barangay}
                                    </p>
                                  </div>
                                )}
                                {parsedAddress.streetAddress && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Street Address</p>
                                    <p className="text-sm font-medium text-heading-800">
                                      {parsedAddress.streetAddress}
                                    </p>
                                  </div>
                                )}
                                {parsedAddress.postalCode && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Postal Code</p>
                                    <p className="text-sm font-medium text-heading-800">
                                      {parsedAddress.postalCode}
                                    </p>
                                  </div>
                                )}
                                {!parsedAddress.region && 
                                 !parsedAddress.province && 
                                 !parsedAddress.municipality && 
                                 !parsedAddress.barangay && 
                                 !parsedAddress.streetAddress && 
                                 !parsedAddress.postalCode && (
                                  <p className="text-sm text-gray-500 italic">No address information available</p>
                                )}
                              </>
                            );
                          })()
                        ) : (
                          <p className="text-sm text-gray-500 italic">No address information available</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Place of Birth Card */}
                  {subscriberData.placeOfBirth && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FiMapPin className="text-primary-600" size={20} />
                          Place of Birth
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {subscriberData.placeOfBirth.region && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Region</p>
                            <p className="text-sm font-medium text-heading-800">
                              {getRegionName(subscriberData.placeOfBirth.region)}
                            </p>
                          </div>
                        )}
                        {subscriberData.placeOfBirth.province && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Province</p>
                            <p className="text-sm font-medium text-heading-800">
                              {subscriberData.placeOfBirth.province}
                            </p>
                          </div>
                        )}
                        {subscriberData.placeOfBirth.municipality && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Municipality</p>
                            <p className="text-sm font-medium text-heading-800">
                              {subscriberData.placeOfBirth.municipality}
                            </p>
                          </div>
                        )}
                        {!subscriberData.placeOfBirth.region && 
                         !subscriberData.placeOfBirth.province && 
                         !subscriberData.placeOfBirth.municipality && (
                          <p className="text-sm text-gray-500 italic">No place of birth information available</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Mother's Information Card */}
                  {subscriberData.motherInfo && (subscriberData.motherInfo.firstName || subscriberData.motherInfo.lastName) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FiUser className="text-primary-600" size={20} />
                          Mother's Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {subscriberData.motherInfo.firstName && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">First Name</p>
                            <p className="text-sm font-medium text-heading-800">
                              {subscriberData.motherInfo.firstName}
                            </p>
                          </div>
                        )}
                        {subscriberData.motherInfo.middleName && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Middle Name</p>
                            <p className="text-sm font-medium text-heading-800">
                              {subscriberData.motherInfo.middleName}
                            </p>
                          </div>
                        )}
                        {subscriberData.motherInfo.lastName && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Last Name</p>
                            <p className="text-sm font-medium text-heading-800">
                              {subscriberData.motherInfo.lastName}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Linked Citizen Card */}
                  {subscriberData.citizenId && subscriberData.citizen && (
                    <Card className="border-primary-200 bg-primary-50/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Badge className="bg-primary-600 text-white">Linked</Badge>
                          <span>Citizen Record</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700 mb-4">
                          Your profile is linked to a citizen record. Personal information is managed through the citizen record.
                        </p>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-semibold text-gray-700">Citizen ID:</span>{' '}
                            <span className="font-mono text-heading-800">{subscriberData.citizen.residentId || 'N/A'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Edit Profile Modal */}
                <EditProfileModal
                  open={isEditModalOpen}
                  onClose={() => setIsEditModalOpen(false)}
                  onSubmit={handleEditProfile}
                  isLinkedToCitizen={isCitizenLinked}
                  initialData={subscriberData ? {
                    firstName: subscriberData.firstName || '',
                    middleName: subscriberData.middleName || '',
                    lastName: subscriberData.lastName || '',
                    extensionName: subscriberData.extensionName || '',
                    email: subscriberData.email || '',
                    phoneNumber: subscriberData.phoneNumber || '',
                    civilStatus: subscriberData.civilStatus || '',
                    sex: subscriberData.sex || '',
                    birthdate: subscriberData.birthDate || '',
                    // Get address from citizen object (check both direct citizen and person.citizen)
                    // For non-citizens, these will be empty and we'll parse residentAddress instead
                    addressRegion: subscriberData.citizen?.addressRegion || subscriberData.person?.citizen?.addressRegion || '',
                    addressProvince: subscriberData.citizen?.addressProvince || subscriberData.person?.citizen?.addressProvince || '',
                    addressMunicipality: subscriberData.citizen?.addressMunicipality || subscriberData.person?.citizen?.addressMunicipality || '',
                    addressBarangay: subscriberData.citizen?.addressBarangay || subscriberData.person?.citizen?.addressBarangay || '',
                    addressPostalCode: subscriberData.citizen?.addressPostalCode || subscriberData.person?.citizen?.addressPostalCode || '',
                    addressStreetAddress: subscriberData.citizen?.addressStreetAddress || subscriberData.person?.citizen?.addressStreetAddress || '',
                    // Pass residentAddress for non-citizens so it can be parsed
                    residentAddress: subscriberData.residentAddress || '',
                    region: subscriberData.placeOfBirth?.region || '',
                    province: subscriberData.placeOfBirth?.province || '',
                    municipality: subscriberData.placeOfBirth?.municipality || '',
                    motherFirstName: subscriberData.motherInfo?.firstName || '',
                    motherMiddleName: subscriberData.motherInfo?.middleName || '',
                    motherLastName: subscriberData.motherInfo?.lastName || '',
                  } : undefined}
                />
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            <MyApplications />
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
};
