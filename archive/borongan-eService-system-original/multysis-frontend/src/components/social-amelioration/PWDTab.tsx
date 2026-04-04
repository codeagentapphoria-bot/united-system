// React imports
import React, { useEffect, useState } from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// Constants
import { getRegionName } from '@/constants/regions';

// Custom Components
import {
  AddPWDModal,
  DeletePWDModal,
  EditPWDModal,
} from '@/components/modals/social-amelioration';
import {
  BeneficiaryCard,
  StatusBadge,
} from './shared';

// Hooks
import { useGovernmentPrograms } from '@/hooks/social-amelioration/useGovernmentPrograms';
import { useBeneficiaryManagement } from '@/hooks/social-amelioration/useSocialAmelioration';
import { useDebounce } from '@/hooks/useDebounce';

// Types and Schemas
import type { PWDInput } from '@/validations/beneficiary.schema';

// Utils
import { calculateAge, cn, formatDateWithoutTimezone, formatIdType } from '@/lib/utils';

// Icons
import { FiDownload, FiEdit, FiEye, FiHeart, FiPlus, FiSearch, FiTrash2, FiUser } from 'react-icons/fi';

// PWD Card Component - Using shared BeneficiaryCard
const PWDCard: React.FC<{
  beneficiary: any;
  isSelected: boolean;
  onClick: () => void;
}> = ({ beneficiary, isSelected, onClick }) => {
  return (
    <BeneficiaryCard
      beneficiary={beneficiary}
      isSelected={isSelected}
      onClick={onClick}
    />
  );
};

// Full Information Modal Component
const FullInformationModal: React.FC<{
  open: boolean;
  onClose: () => void;
  beneficiary: any;
  getProgramNames: (programIds: string[] | undefined) => string[];
}> = ({ open, onClose, beneficiary, getProgramNames }) => {
  if (!beneficiary) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto")}>
        <DialogHeader>
          <DialogTitle className={cn("text-2xl font-semibold text-primary-600")}>
            Full Information - {beneficiary.firstName} {beneficiary.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Profile Picture and Basic Info */}
          <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-28 h-28 rounded-full bg-white border-4 border-primary-200 overflow-hidden shadow-md">
                <img 
                  src={beneficiary.profilePicture || beneficiary.citizen?.citizenPicture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNjAiIHI9IjI1IiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMCAxMjBDMzAgMTAwLjExOCA0NS4xMTggODUgNjUgODVIOThDMTE4Ljg4MiA4NSAxMzQgMTAwLjExOCAxMzQgMTIwVjE1MEgzMFYxMjBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPg=='} 
                  alt={`${beneficiary.firstName} ${beneficiary.lastName}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-heading-800 mb-3">
                {beneficiary.firstName} {beneficiary.middleName} {beneficiary.lastName} {beneficiary.extensionName}
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">PWD ID:</span>
                  <span className="text-sm font-bold text-heading-800 font-mono bg-white px-2 py-1 rounded border">{beneficiary.pwdId}</span>
                </div>
                <StatusBadge status={beneficiary.status} />
              </div>
            </div>
          </div>

          <Separator />

          {/* PWD Assistance Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">PWD Assistance Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Disability Type</label>
                <div className="min-h-[40px] flex items-center">
                  {beneficiary.disabilityTypeName || beneficiary.disabilityType || beneficiary.typeOfDisability ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.disabilityTypeName || beneficiary.disabilityType || beneficiary.typeOfDisability}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Disability Level</label>
                <div className="min-h-[40px] flex items-center">
                  {beneficiary.disabilityLevel ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.disabilityLevel}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Monetary Allowance</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {beneficiary.monetaryAllowance ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assisted Device</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {beneficiary.assistedDevice ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
              {beneficiary.donorDevice && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Donor Device</label>
                  <div className="min-h-[40px] flex items-center">
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.donorDevice}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Government Programs */}
          {(() => {
            const governmentProgramNames = getProgramNames(beneficiary.governmentPrograms);
            return governmentProgramNames.length > 0 ? (
              <>
                <Separator />
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Government Programs</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Programs</label>
                    <div className="min-h-[40px] flex items-center flex-wrap gap-2">
                      {governmentProgramNames.map((programName, idx) => (
                        <Badge key={idx} className="bg-primary-100 text-primary-700 px-3 py-1">
                          {programName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null;
          })()}

          <Separator />

          {/* Personal Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                <div className="min-h-[40px] flex items-center">
                  {beneficiary.lastName || beneficiary.citizen?.lastName ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.lastName || beneficiary.citizen?.lastName}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                <div className="min-h-[40px] flex items-center">
                  {beneficiary.firstName || beneficiary.citizen?.firstName ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.firstName || beneficiary.citizen?.firstName}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
                <div className="min-h-[40px] flex items-center">
                  {beneficiary.middleName || beneficiary.citizen?.middleName ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.middleName || beneficiary.citizen?.middleName}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extension Name</label>
                <div className="min-h-[40px] flex items-center">
                  {beneficiary.extensionName || beneficiary.citizen?.extensionName ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.extensionName || beneficiary.citizen?.extensionName}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                <div className="min-h-[40px] flex items-center">
                  {beneficiary.gender || beneficiary.citizen?.sex ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">{beneficiary.gender || beneficiary.citizen?.sex}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                <div className="min-h-[40px] flex items-center">
                  {beneficiary.dateOfBirth || beneficiary.citizen?.birthDate ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                      {(beneficiary.dateOfBirth || beneficiary.citizen?.birthDate).includes('T') 
                        ? formatDateWithoutTimezone(beneficiary.dateOfBirth || beneficiary.citizen?.birthDate, { month: 'long', day: 'numeric', year: 'numeric' })
                        : (beneficiary.dateOfBirth || beneficiary.citizen?.birthDate)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</label>
                <div className="min-h-[40px] flex items-center">
                  {(() => {
                    const birthDate = beneficiary.dateOfBirth || beneficiary.citizen?.birthDate;
                    const age = birthDate ? calculateAge(birthDate) : (beneficiary.age || beneficiary.citizen?.age);
                    if (age !== null && age !== undefined) {
                      return (
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{age} years old</p>
                      );
                    }
                    return (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                    );
                  })()}
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
                  {beneficiary.phoneNumber || beneficiary.mobileNumber || beneficiary.contactNumber || beneficiary.citizen?.phoneNumber ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.phoneNumber || beneficiary.mobileNumber || beneficiary.contactNumber || beneficiary.citizen?.phoneNumber}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <div className="min-h-[40px] flex items-center">
                  {beneficiary.email || beneficiary.citizen?.email ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.email || beneficiary.citizen?.email}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Complete Address */}
          {(beneficiary.addressRegion || beneficiary.address || beneficiary.region || beneficiary.citizen?.addressRegion) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Complete Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(beneficiary.addressRegion || beneficiary.citizen?.addressRegion) && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{getRegionName(beneficiary.addressRegion || beneficiary.citizen?.addressRegion)}</p>
                      </div>
                    </div>
                  )}
                  {(beneficiary.addressProvince || beneficiary.citizen?.addressProvince) && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Province</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.addressProvince || beneficiary.citizen?.addressProvince}</p>
                      </div>
                    </div>
                  )}
                  {(beneficiary.addressMunicipality || beneficiary.citizen?.addressMunicipality) && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipality</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.addressMunicipality || beneficiary.citizen?.addressMunicipality}</p>
                      </div>
                    </div>
                  )}
                  {(beneficiary.addressBarangay || beneficiary.citizen?.addressBarangay) && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Barangay</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.addressBarangay || beneficiary.citizen?.addressBarangay}</p>
                      </div>
                    </div>
                  )}
                  {(beneficiary.addressPostalCode || beneficiary.citizen?.addressPostalCode) && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Postal Code</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.addressPostalCode || beneficiary.citizen?.addressPostalCode}</p>
                      </div>
                    </div>
                  )}
                  {(beneficiary.addressStreetAddress || beneficiary.citizen?.addressStreetAddress) && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit No. / House No. / Street Name</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.addressStreetAddress || beneficiary.citizen?.addressStreetAddress}</p>
                      </div>
                    </div>
                  )}
                  {(beneficiary.address || beneficiary.citizen?.address) && !(beneficiary.addressRegion || beneficiary.citizen?.addressRegion) && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address (Legacy)</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.address || beneficiary.citizen?.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Place of Birth */}
          {(beneficiary.birthRegion || beneficiary.citizen?.citizenPlaceOfBirth) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Place of Birth</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(beneficiary.birthRegion || beneficiary.citizen?.citizenPlaceOfBirth?.region) && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{getRegionName(beneficiary.birthRegion || beneficiary.citizen?.citizenPlaceOfBirth?.region)}</p>
                      </div>
                    </div>
                  )}
                  {(beneficiary.birthProvince || beneficiary.citizen?.citizenPlaceOfBirth?.province) && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Province</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.birthProvince || beneficiary.citizen?.citizenPlaceOfBirth?.province}</p>
                      </div>
                    </div>
                  )}
                  {(beneficiary.birthMunicipality || beneficiary.citizen?.citizenPlaceOfBirth?.municipality) && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipality</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.birthMunicipality || beneficiary.citizen?.citizenPlaceOfBirth?.municipality}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Family Information */}
          {(beneficiary.motherFirstName || beneficiary.fatherFirstName || beneficiary.spouseFirstName || beneficiary.spouseName || beneficiary.citizen?.spouseName) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Family Information</h3>
                <div className="space-y-6">
                  {/* Spouse Name */}
                  {(beneficiary.spouseName || beneficiary.citizen?.spouseName || beneficiary.spouseFirstName) && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Spouse Name</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {beneficiary.spouseName || beneficiary.citizen?.spouseName ? (
                          <div className="space-y-2 md:col-span-3">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Spouse Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.spouseName || beneficiary.citizen?.spouseName}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {beneficiary.spouseLastName && (
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                                <div className="min-h-[40px] flex items-center">
                                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.spouseLastName}</p>
                                </div>
                              </div>
                            )}
                            {beneficiary.spouseFirstName && (
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                                <div className="min-h-[40px] flex items-center">
                                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.spouseFirstName}</p>
                                </div>
                              </div>
                            )}
                            {beneficiary.spouseMiddleName && (
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
                                <div className="min-h-[40px] flex items-center">
                                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.spouseMiddleName}</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Emergency Contact */}
                  {(beneficiary.emergencyContactPerson || beneficiary.citizen?.emergencyContactPerson) && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact Person</label>
                          <div className="min-h-[40px] flex items-center">
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.emergencyContactPerson || beneficiary.citizen?.emergencyContactPerson}</p>
                          </div>
                        </div>
                        {(beneficiary.emergencyContactNumber || beneficiary.citizen?.emergencyContactNumber) && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact Number</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.emergencyContactNumber || beneficiary.citizen?.emergencyContactNumber}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mother's Maiden Name */}
                  {(beneficiary.motherFirstName || beneficiary.motherLastName) && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Mother's Maiden Name</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {beneficiary.motherLastName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.motherLastName}</p>
                            </div>
                          </div>
                        )}
                        {beneficiary.motherFirstName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.motherFirstName}</p>
                            </div>
                          </div>
                        )}
                        {beneficiary.motherMiddleName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.motherMiddleName}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Father's Name */}
                  {(beneficiary.fatherFirstName || beneficiary.fatherLastName) && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Father's Name</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {beneficiary.fatherLastName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.fatherLastName}</p>
                            </div>
                          </div>
                        )}
                        {beneficiary.fatherFirstName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.fatherFirstName}</p>
                            </div>
                          </div>
                        )}
                        {beneficiary.fatherMiddleName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.fatherMiddleName}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Identity Information */}
          {(beneficiary.height || beneficiary.weight || beneficiary.complexion || beneficiary.citizenship || beneficiary.citizen?.citizenship) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Identity Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {beneficiary.height && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Height</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.height}</p>
                      </div>
                    </div>
                  )}
                  {beneficiary.weight && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.weight}</p>
                      </div>
                    </div>
                  )}
                  {beneficiary.complexion && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Complexion</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.complexion}</p>
                      </div>
                    </div>
                  )}
                  {(beneficiary.citizenship || beneficiary.citizen?.citizenship) && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Country of Citizenship</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.citizenship || beneficiary.citizen?.citizenship}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Educational Information */}
          {(beneficiary.education || beneficiary.institution) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Educational Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {beneficiary.education && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Highest Educational Attainment</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.education}</p>
                      </div>
                    </div>
                  )}
                  {beneficiary.institution && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Institution</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.institution}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Valid ID */}
          {(beneficiary.idType || beneficiary.citizen?.idType || beneficiary.validIdType) && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Valid ID</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Type</label>
                  <div className="min-h-[40px] flex items-center">
                    {beneficiary.idType || beneficiary.citizen?.idType || beneficiary.validIdType ? (
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{formatIdType(beneficiary.idType || beneficiary.citizen?.idType || beneficiary.validIdType)}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                    )}
                  </div>
                </div>
                {beneficiary.validIdNumber && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valid ID Number</label>
                    <div className="min-h-[40px] flex items-center">
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.validIdNumber}</p>
                    </div>
                  </div>
                )}
                {(beneficiary.proofOfIdentification || beneficiary.citizen?.proofOfIdentification) && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Image</label>
                    <div className="flex justify-center items-center">
                      <img
                        src={beneficiary.proofOfIdentification || beneficiary.citizen?.proofOfIdentification}
                        alt="Valid ID"
                        className="max-w-full max-h-64 rounded-lg border border-gray-200"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// PWD Information Component
const PWDInfo: React.FC<{
  beneficiary: any;
  getProgramNames: (programIds: string[] | undefined) => string[];
}> = ({ beneficiary, getProgramNames }) => {
  const [isFullInfoModalOpen, setIsFullInfoModalOpen] = useState(false);

  if (!beneficiary) {
    return (
      <div className="text-center text-gray-500 py-12">
        <FiUser className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg">Select a PWD to view details</p>
      </div>
    );
  }


  return (
    <>
      <div className="space-y-6">
        {/* Profile Picture and Basic Info */}
        <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            <div 
              className={cn(
                "w-28 h-28 rounded-full bg-white border-4 border-primary-200 overflow-hidden shadow-md transition-shadow",
                (beneficiary.profilePicture || beneficiary.citizen?.citizenPicture) ? "cursor-pointer hover:shadow-lg" : ""
              )}
              onClick={() => {
                if (beneficiary.profilePicture || beneficiary.citizen?.citizenPicture) {
                  // Could add image modal here if needed
                }
              }}
            >
              {(beneficiary.profilePicture || beneficiary.citizen?.citizenPicture) ? (
                <img 
                  src={beneficiary.profilePicture || beneficiary.citizen?.citizenPicture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNjAiIHI9IjI1IiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMCAxMjBDMzAgMTAwLjExOCA0NS4xMTggODUgNjUgODVIOThDMTE4Ljg4MiA4NSAxMzQgMTAwLjExOCAxMzQgMTIwVjE1MEgzMFYxMjBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPg=='} 
                  alt={`${beneficiary.firstName} ${beneficiary.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <FiUser size={48} className="text-gray-400" />
                </div>
              )}
            </div>
            {!(beneficiary.profilePicture || beneficiary.citizen?.citizenPicture) && (
              <p className="text-xs text-gray-500 text-center mt-2">No image uploaded</p>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-heading-800 mb-3">
              {beneficiary.firstName || beneficiary.citizen?.firstName} {beneficiary.middleName || beneficiary.citizen?.middleName} {beneficiary.lastName || beneficiary.citizen?.lastName} {beneficiary.extensionName || beneficiary.citizen?.extensionName}
            </h3>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">PWD ID:</span>
                <span className="text-sm font-bold text-heading-800 font-mono bg-white px-2 py-1 rounded border">{beneficiary.pwdId}</span>
              </div>
              {(() => {
                const birthDate = beneficiary.dateOfBirth || beneficiary.citizen?.birthDate;
                const age = birthDate ? calculateAge(birthDate) : (beneficiary.age || beneficiary.citizen?.age);
                if (age !== null && age !== undefined) {
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">Age:</span>
                      <span className="text-sm font-bold text-heading-800 bg-white px-2 py-1 rounded border">{age} years old</span>
                    </div>
                  );
                }
                return null;
              })()}
              <StatusBadge status={beneficiary.status} />
            </div>
          </div>
        </div>

        <Separator />

        {/* PWD Assistance Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">PWD Assistance Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Disability Type</label>
              <div className="min-h-[40px] flex items-center">
              {beneficiary.disabilityTypeName || beneficiary.disabilityType || beneficiary.typeOfDisability ? (
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.disabilityTypeName || beneficiary.disabilityType || beneficiary.typeOfDisability}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                  )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Disability Level</label>
              <div className="min-h-[40px] flex items-center">
                {beneficiary.disabilityLevel ? (
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.disabilityLevel}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Monetary Allowance</label>
              <div className="min-h-[40px] flex items-center">
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                  {beneficiary.monetaryAllowance ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assisted Device</label>
              <div className="min-h-[40px] flex items-center">
                <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                  {beneficiary.assistedDevice ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
            {beneficiary.donorDevice && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Donor Device</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.donorDevice}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Government Programs */}
        {(() => {
          const governmentProgramNames = getProgramNames(beneficiary.governmentPrograms);
          return governmentProgramNames.length > 0 ? (
            <>
              <Separator />
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Government Programs</h3>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Programs</label>
                  <div className="min-h-[40px] flex items-center flex-wrap gap-2">
                    {governmentProgramNames.map((programName, idx) => (
                      <Badge key={idx} className="bg-primary-100 text-primary-700 px-3 py-1">
                        {programName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null;
        })()}

        <Separator />

        {/* Personal Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
              <div className="min-h-[40px] flex items-center">
                {beneficiary.lastName || beneficiary.citizen?.lastName ? (
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.lastName || beneficiary.citizen?.lastName}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
              <div className="min-h-[40px] flex items-center">
                {beneficiary.firstName || beneficiary.citizen?.firstName ? (
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.firstName || beneficiary.citizen?.firstName}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
              <div className="min-h-[40px] flex items-center">
                {beneficiary.middleName || beneficiary.citizen?.middleName ? (
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.middleName || beneficiary.citizen?.middleName}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extension Name</label>
              <div className="min-h-[40px] flex items-center">
                {beneficiary.extensionName || beneficiary.citizen?.extensionName ? (
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.extensionName || beneficiary.citizen?.extensionName}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
              <div className="min-h-[40px] flex items-center">
                {beneficiary.gender || beneficiary.citizen?.sex ? (
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">{beneficiary.gender || beneficiary.citizen?.sex}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
              <div className="min-h-[40px] flex items-center">
                {beneficiary.dateOfBirth || beneficiary.citizen?.birthDate ? (
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {(beneficiary.dateOfBirth || beneficiary.citizen?.birthDate).includes('T') 
                      ? formatDateWithoutTimezone(beneficiary.dateOfBirth || beneficiary.citizen?.birthDate, { month: 'long', day: 'numeric', year: 'numeric' })
                      : (beneficiary.dateOfBirth || beneficiary.citizen?.birthDate)}
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
                {beneficiary.phoneNumber || beneficiary.mobileNumber || beneficiary.contactNumber || beneficiary.citizen?.phoneNumber ? (
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.phoneNumber || beneficiary.mobileNumber || beneficiary.contactNumber || beneficiary.citizen?.phoneNumber}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
              <div className="min-h-[40px] flex items-center">
                {beneficiary.email || beneficiary.citizen?.email ? (
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.email || beneficiary.citizen?.email}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* See Full Information Button */}
        <div className="flex justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsFullInfoModalOpen(true)}
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            <FiEye className="h-4 w-4 mr-2" />
            See Full Information
          </Button>
        </div>
      </div>

      {/* Full Information Modal */}
      <FullInformationModal
        open={isFullInfoModalOpen}
        onClose={() => setIsFullInfoModalOpen(false)}
        beneficiary={beneficiary}
        getProgramNames={getProgramNames}
      />
    </>
  );
};

export const PWDTab: React.FC = () => {
  const {
    beneficiaries,
    selectedBeneficiary,
    setSelectedBeneficiary,
    setSearchQuery,
    handleAddBeneficiary,
    handleEditBeneficiary,
    handleDeleteBeneficiary,
    handleDownloadList,
    isLoading,
  } = useBeneficiaryManagement('pwd');

  const { allGovernmentPrograms } = useGovernmentPrograms();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Helper function to get program names from IDs
  const getProgramNames = (programIds: string[] | undefined): string[] => {
    if (!programIds || programIds.length === 0) return [];
    return programIds
      .map(id => allGovernmentPrograms.find(p => p.id === id)?.name)
      .filter((name): name is string => !!name);
  };

  // Update the actual search query when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleDownloadList}
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            <FiDownload className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Add PWD
          </Button>
        </div>
      </div>

      {/* Main Content: List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: PWD List */}
        <Card className="lg:col-span-1 overflow-visible">
          <CardHeader>
            <CardTitle className="text-heading-700 text-lg">PWD List</CardTitle>

            {/* Search */}
            <div className="relative mt-4">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiSearch size={18} />
              </div>
              <Input
                placeholder="Search PWD..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Total count */}
            <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
              <span>Total: {beneficiaries.length} PWD</span>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col">
            <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading PWD records...
                </div>
              ) : beneficiaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No PWD found.
                </div>
              ) : (
                beneficiaries.map((beneficiary) => (
                  <PWDCard
                    key={beneficiary.id}
                    beneficiary={beneficiary}
                    isSelected={selectedBeneficiary?.id === beneficiary.id}
                    onClick={() => setSelectedBeneficiary(beneficiary)}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Selected PWD Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-heading-700 text-lg">PWD Information</CardTitle>
              {selectedBeneficiary && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700"
                    onClick={() => setIsEditModalOpen(true)}
                  >
                    <div className="mr-1"><FiEdit size={14} /></div>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setIsDeleteModalOpen(true)}
                  >
                    <div className="mr-1"><FiTrash2 size={14} /></div>
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {selectedBeneficiary ? (
              <PWDInfo
                beneficiary={selectedBeneficiary}
                getProgramNames={getProgramNames}
              />
            ) : (
              <div className="text-center text-gray-500 py-12">
                <FiHeart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Select a PWD to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Modal */}
      <AddPWDModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(data) => handleAddBeneficiary(data)}
        existingBeneficiaries={beneficiaries}
        onEdit={(beneficiaryId) => {
          const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
          if (beneficiary) {
            setSelectedBeneficiary(beneficiary);
            setIsEditModalOpen(true);
            setIsAddModalOpen(false);
          }
        }}
      />

      {/* Edit Modal */}
      {selectedBeneficiary && (
        <EditPWDModal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onEdit={(data: PWDInput) => handleEditBeneficiary(selectedBeneficiary.id, data)}
          initialData={selectedBeneficiary}
        />
      )}

      {/* Delete Modal */}
      {selectedBeneficiary && (
        <DeletePWDModal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={async () => {
            try {
              setIsDeleting(true);
              await handleDeleteBeneficiary(selectedBeneficiary.id);
              setIsDeleteModalOpen(false);
            } catch (error) {
              // Error is handled by the hook
            } finally {
              setIsDeleting(false);
            }
          }}
          beneficiaryName={`${selectedBeneficiary.firstName} ${selectedBeneficiary.lastName}`}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

