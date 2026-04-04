import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import React from 'react';
import { FiUser } from 'react-icons/fi';
import { getRegionName } from '@/constants/regions';

interface ProfileTabProps {
  selectedSubscriber: any;
  onImageClick: () => void;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, string> = {
    active: 'bg-success-100 text-success-700',
    pending: 'bg-warning-100 text-warning-700',
    expired: 'bg-neutral-200 text-neutral-700',
  };

  return (
    <Badge className={variants[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

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

export const ProfileTab: React.FC<ProfileTabProps> = ({
  selectedSubscriber,
  onImageClick,
}) => {
  return (
    <TabsContent value="profile" className={cn("space-y-6") }>
      {/* Profile Picture and Basic Info */}
      <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex-shrink-0">
          <div 
            className={cn(
              "w-28 h-28 rounded-full bg-white border-4 border-primary-200 overflow-hidden shadow-md transition-shadow flex items-center justify-center",
              (selectedSubscriber.profilePicture || selectedSubscriber.citizen?.citizenPicture) ? "cursor-pointer hover:shadow-lg" : ""
            )}
            onClick={onImageClick}
          >
            {(selectedSubscriber.profilePicture || (selectedSubscriber.citizen?.citizenPicture)) ? (
              <img 
                src={selectedSubscriber.citizen?.citizenPicture || selectedSubscriber.profilePicture} 
                alt={`${selectedSubscriber.firstName} ${selectedSubscriber.lastName}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNjAiIHI9IjI1IiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMCAxMjBDMzAgMTAwLjExOCA0NS4xMTggODUgNjUgODVIOThDMTE4Ljg4MiA4NSAxMzQgMTAwLjExOCAxMzQgMTIwVjE1MEgzMFYxMjBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPg==';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <FiUser size={48} className="text-gray-400" />
              </div>
            )}
          </div>
          {!selectedSubscriber.profilePicture && !selectedSubscriber.citizen?.citizenPicture && (
            <p className="text-xs text-gray-500 text-center mt-2">No image uploaded</p>
          )}
          {selectedSubscriber.citizen?.citizenPicture && !selectedSubscriber.profilePicture && (
            <p className="text-xs text-primary-600 text-center mt-2">Using citizen picture</p>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-heading-800 mb-3">
            {selectedSubscriber.citizen 
              ? `${selectedSubscriber.citizen.firstName} ${selectedSubscriber.citizen.middleName || ''} ${selectedSubscriber.citizen.lastName} ${selectedSubscriber.citizen.extensionName || ''}`.trim()
              : `${selectedSubscriber.firstName} ${selectedSubscriber.middleName || ''} ${selectedSubscriber.lastName} ${selectedSubscriber.extensionName || ''}`.trim()
            }
          </h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">Resident ID:</span>
              <span className="text-sm font-bold text-heading-800 font-mono bg-white px-2 py-1 rounded border">
                {selectedSubscriber.residentId || 'Not assigned'}
              </span>
            </div>
            <div>{getStatusBadge(selectedSubscriber.accountStatus || selectedSubscriber.status)}</div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Linked Citizen Information */}
      {selectedSubscriber.citizenId && selectedSubscriber.citizen && (
        <>
          <div className="bg-primary-50 p-6 rounded-lg border border-primary-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary-800">Linked Citizen Record</h3>
              <Badge className="bg-primary-600 text-white">Linked</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Citizen Name</label>
                <div className="min-h-[40px] flex items-center">
                  <span className="text-sm font-medium text-gray-900">
                    {selectedSubscriber.citizen.firstName} {selectedSubscriber.citizen.middleName || ''} {selectedSubscriber.citizen.lastName} {selectedSubscriber.citizen.extensionName || ''}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Citizen Resident ID</label>
                <div className="min-h-[40px] flex items-center">
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {selectedSubscriber.citizen.residentId || 'Not assigned'}
                  </span>
                </div>
              </div>
              {selectedSubscriber.citizen.phoneNumber && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Citizen Phone</label>
                  <div className="min-h-[40px] flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {selectedSubscriber.citizen.phoneNumber}
                    </span>
                  </div>
                </div>
              )}
              {selectedSubscriber.citizen.email && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Citizen Email</label>
                  <div className="min-h-[40px] flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {selectedSubscriber.citizen.email}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 p-3 bg-white rounded border border-primary-200">
              <p className="text-xs text-primary-700">
                <strong>Note:</strong> This subscriber is linked to a citizen record. Personal information (name, birthdate, address) is sourced from the citizen record to avoid data duplication.
              </p>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Residency Information */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Residency Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Residency Status</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.residencyStatus ? (
                getStatusBadge(selectedSubscriber.residencyStatus)
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resident ID</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.residentId ? (
                <p className="text-sm font-medium text-heading-700 font-mono bg-gray-50 px-3 py-2 rounded border w-full">{selectedSubscriber.residentId}</p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not assigned</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Residency Type</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.residencyType ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">
                  {selectedSubscriber.residencyType.replace('-', ' ')}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Personal Information */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.citizen?.lastName || selectedSubscriber.lastName ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                  {selectedSubscriber.citizen?.lastName || selectedSubscriber.lastName}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.citizen?.middleName || selectedSubscriber.middleName ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                  {selectedSubscriber.citizen?.middleName || selectedSubscriber.middleName}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.citizen?.firstName || selectedSubscriber.firstName ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                  {selectedSubscriber.citizen?.firstName || selectedSubscriber.firstName}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extension Name</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.citizen?.extensionName || selectedSubscriber.extensionName ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                  {selectedSubscriber.citizen?.extensionName || selectedSubscriber.extensionName}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.phoneNumber ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedSubscriber.phoneNumber}</p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.email ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedSubscriber.email}</p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Complete Address */}
      {(selectedSubscriber.citizen?.addressRegion || selectedSubscriber.residentAddress) && (
        <>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Complete Address</h3>
            {selectedSubscriber.citizen ? (
              // Use citizen's structured address
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                  <div className="min-h-[40px] flex items-center">
                    {selectedSubscriber.citizen.addressRegion ? (
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                        {getRegionName(selectedSubscriber.citizen.addressRegion)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Province</label>
                  <div className="min-h-[40px] flex items-center">
                    {selectedSubscriber.citizen.addressProvince ? (
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                        {selectedSubscriber.citizen.addressProvince}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipality</label>
                  <div className="min-h-[40px] flex items-center">
                    {selectedSubscriber.citizen.addressMunicipality ? (
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                        {selectedSubscriber.citizen.addressMunicipality}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Barangay</label>
                  <div className="min-h-[40px] flex items-center">
                    {selectedSubscriber.citizen.addressBarangay ? (
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                        {selectedSubscriber.citizen.addressBarangay}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Postal Code</label>
                  <div className="min-h-[40px] flex items-center">
                    {selectedSubscriber.citizen.addressPostalCode ? (
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                        {selectedSubscriber.citizen.addressPostalCode}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Street Address</label>
                  <div className="min-h-[40px] flex items-center">
                    {selectedSubscriber.citizen.addressStreetAddress ? (
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                        {selectedSubscriber.citizen.addressStreetAddress}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Fallback to subscriber's residentAddress
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resident Address</label>
                  <div className="min-h-[40px] flex items-center">
                    {selectedSubscriber.residentAddress ? (
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedSubscriber.residentAddress}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Place of Birth */}
      {selectedSubscriber.placeOfBirth && (
        <>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Place of Birth</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                <div className="min-h-[40px] flex items-center">
                  {selectedSubscriber.placeOfBirth.region ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{getRegionName(selectedSubscriber.placeOfBirth.region)}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Province</label>
                <div className="min-h-[40px] flex items-center">
                  {selectedSubscriber.placeOfBirth.province ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedSubscriber.placeOfBirth.province}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipality</label>
                <div className="min-h-[40px] flex items-center">
                  {selectedSubscriber.placeOfBirth.municipality ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedSubscriber.placeOfBirth.municipality}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Demographics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Demographics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.citizen?.sex || selectedSubscriber.sex ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">
                  {selectedSubscriber.citizen?.sex || selectedSubscriber.sex}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Civil Status</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.citizen?.civilStatus || selectedSubscriber.civilStatus ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">
                  {selectedSubscriber.citizen?.civilStatus || selectedSubscriber.civilStatus}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
            <div className="min-h-[40px] flex items-center">
              {selectedSubscriber.citizen?.birthDate || selectedSubscriber.birthDate ? (
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                  {formatDateWithoutTimezone(selectedSubscriber.citizen?.birthDate || selectedSubscriber.birthDate || '', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mother's Information */}
      {selectedSubscriber.motherInfo && (
        <>
          <Separator />
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Mother's Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mother's First Name</label>
                <div className="min-h-[40px] flex items-center">
                  {selectedSubscriber.motherInfo.firstName ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedSubscriber.motherInfo.firstName}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mother's Middle Name</label>
                <div className="min-h-[40px] flex items-center">
                  {selectedSubscriber.motherInfo.middleName ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedSubscriber.motherInfo.middleName}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mother's Last Name</label>
                <div className="min-h-[40px] flex items-center">
                  {selectedSubscriber.motherInfo.lastName ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedSubscriber.motherInfo.lastName}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </TabsContent>
  );
};

