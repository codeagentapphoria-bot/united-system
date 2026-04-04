// React imports
import React, { useEffect, useState } from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// Custom Components
import {
  AddSoloParentModal,
  DeleteSoloParentModal,
  EditSoloParentModal,
} from '@/components/modals/social-amelioration';
import {
  BeneficiaryCard,
  StatusBadge,
} from './shared';

// Hooks
import { useGovernmentPrograms } from '@/hooks/social-amelioration/useGovernmentPrograms';
import { useBeneficiaryManagement } from '@/hooks/social-amelioration/useSocialAmelioration';
import { useDebounce } from '@/hooks/useDebounce';

// Utils
import { calculateAge, cn, formatDateWithoutTimezone, formatIdType } from '@/lib/utils';

// Constants
import { getRegionName } from '@/constants/regions';

// Icons
import { FiDownload, FiEdit, FiEye, FiHeart, FiPlus, FiSearch, FiTrash2, FiUser } from 'react-icons/fi';

// Solo Parent Card Component - Using shared BeneficiaryCard
const SoloParentCard: React.FC<{
  beneficiary: any;
  isSelected: boolean;
  onClick: () => void;
}> = ({ beneficiary, isSelected, onClick }) => {
  return (
    <BeneficiaryCard
      beneficiary={beneficiary}
      isSelected={isSelected}
      onClick={onClick}
      showAgeClassification={false}
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

  const citizen = beneficiary.citizen || beneficiary;
  const birthDate = citizen.birthDate || beneficiary.dateOfBirth;
  const age = birthDate ? calculateAge(birthDate) : null;

  const assistanceProgramNames = getProgramNames(beneficiary.assistancePrograms);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto")}>
        <DialogHeader>
          <DialogTitle className={cn("text-2xl font-semibold text-primary-600")}>
            Full Information - {citizen.firstName} {citizen.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Profile Picture and Basic Info */}
          <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-28 h-28 rounded-full bg-white border-4 border-primary-200 overflow-hidden shadow-md">
                <img 
                  src={citizen.citizenPicture || beneficiary.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNjAiIHI9IjI1IiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMCAxMjBDMzAgMTAwLjExOCA0NS4xMTggODUgNjUgODVIOThDMTE4Ljg4MiA4NSAxMzQgMTAwLjExOCAxMzQgMTIwVjE1MEgzMFYxMjBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPg=='} 
                  alt={`${citizen.firstName} ${citizen.lastName}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-heading-800 mb-3">
                {citizen.firstName} {citizen.middleName} {citizen.lastName} {citizen.extensionName}
              </h3>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">Solo Parent ID:</span>
                  <span className="text-sm font-bold text-heading-800 font-mono bg-white px-2 py-1 rounded border">{beneficiary.soloParentId}</span>
                </div>
                <StatusBadge status={beneficiary.status} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Solo Parent Information */}
          {(beneficiary.categoryName || beneficiary.category) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Solo Parent Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                    <div className="min-h-[40px] flex items-center">
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.categoryName || beneficiary.category}</p>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Assistance Programs */}
          {assistanceProgramNames.length > 0 && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Assistance Programs</h3>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Programs</label>
                  <div className="min-h-[40px] flex items-center flex-wrap gap-2">
                    {assistanceProgramNames.map((programName, idx) => (
                      <Badge key={idx} className="bg-primary-100 text-primary-700 px-3 py-1">
                        {programName}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Personal Information */}
          {(citizen.lastName || citizen.firstName || citizen.middleName || citizen.extensionName || citizen.gender || birthDate || age) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {citizen.lastName && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.lastName}</p>
                      </div>
                    </div>
                  )}
                  {citizen.firstName && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.firstName}</p>
                      </div>
                    </div>
                  )}
                  {citizen.middleName && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.middleName}</p>
                      </div>
                    </div>
                  )}
                  {citizen.extensionName && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extension Name</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.extensionName}</p>
                      </div>
                    </div>
                  )}
                  {citizen.gender && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">{citizen.gender}</p>
                      </div>
                    </div>
                  )}
                  {birthDate && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                          {birthDate.includes('T') 
                            ? formatDateWithoutTimezone(birthDate, { month: 'long', day: 'numeric', year: 'numeric' })
                            : birthDate}
                        </p>
                      </div>
                    </div>
                  )}
                  {age !== null && age !== undefined && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{age} years old</p>
                      </div>
                    </div>
                  )}
                  {citizen.civilStatus && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Civil Status</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">{citizen.civilStatus}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Address Information */}
          {(citizen.addressRegion || citizen.addressProvince || citizen.addressMunicipality || citizen.addressBarangay || citizen.addressPostalCode || citizen.addressStreetAddress) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {citizen.addressRegion && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{getRegionName(citizen.addressRegion)}</p>
                      </div>
                    </div>
                  )}
                  {citizen.addressProvince && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Province</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.addressProvince}</p>
                      </div>
                    </div>
                  )}
                  {citizen.addressMunicipality && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipality</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.addressMunicipality}</p>
                      </div>
                    </div>
                  )}
                  {citizen.addressBarangay && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Barangay</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.addressBarangay}</p>
                      </div>
                    </div>
                  )}
                  {citizen.addressPostalCode && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Postal Code</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.addressPostalCode}</p>
                      </div>
                    </div>
                  )}
                  {citizen.addressStreetAddress && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Street Address</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.addressStreetAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Place of Birth */}
          {(citizen.birthRegion || citizen.birthProvince || citizen.birthMunicipality || birthDate) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Place of Birth</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {citizen.birthRegion && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{getRegionName(citizen.birthRegion)}</p>
                      </div>
                    </div>
                  )}
                  {citizen.birthProvince && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Province</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.birthProvince}</p>
                      </div>
                    </div>
                  )}
                  {citizen.birthMunicipality && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipality</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.birthMunicipality}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Family Information */}
          {(citizen.motherLastName || citizen.motherFirstName || citizen.motherMiddleName || citizen.fatherLastName || citizen.fatherFirstName || citizen.fatherMiddleName || citizen.spouseName || citizen.emergencyContactPerson) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Family Information</h3>
                <div className="space-y-6">
                  {(citizen.motherLastName || citizen.motherFirstName || citizen.motherMiddleName) && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Mother's Maiden Name</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {citizen.motherLastName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.motherLastName}</p>
                            </div>
                          </div>
                        )}
                        {citizen.motherFirstName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.motherFirstName}</p>
                            </div>
                          </div>
                        )}
                        {citizen.motherMiddleName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.motherMiddleName}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(citizen.fatherLastName || citizen.fatherFirstName || citizen.fatherMiddleName) && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">Father's Name</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {citizen.fatherLastName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.fatherLastName}</p>
                            </div>
                          </div>
                        )}
                        {citizen.fatherFirstName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.fatherFirstName}</p>
                            </div>
                          </div>
                        )}
                        {citizen.fatherMiddleName && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.fatherMiddleName}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(citizen.spouseName || citizen.emergencyContactPerson) && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-800 mb-3">
                        {citizen.civilStatus === 'Single' ? 'Emergency Contact' : 'Spouse and Emergency Contact'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {citizen.spouseName && citizen.civilStatus !== 'Single' && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Spouse Name</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.spouseName}</p>
                            </div>
                          </div>
                        )}
                        {citizen.emergencyContactPerson && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact Person</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.emergencyContactPerson}</p>
                            </div>
                          </div>
                        )}
                        {citizen.emergencyContactNumber && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact Number</label>
                            <div className="min-h-[40px] flex items-center">
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.emergencyContactNumber}</p>
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
          {(citizen.height || citizen.weight || citizen.complexion || citizen.citizenship) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Identity Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {citizen.height && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Height</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.height}</p>
                      </div>
                    </div>
                  )}
                  {citizen.weight && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.weight}</p>
                      </div>
                    </div>
                  )}
                  {citizen.complexion && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Complexion</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.complexion}</p>
                      </div>
                    </div>
                  )}
                  {citizen.citizenship && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Country of Citizenship</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.citizenship}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Educational Information */}
          {(citizen.education || citizen.institution || citizen.gradeYear) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Educational Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {citizen.education && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Highest Educational Attainment</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.education}</p>
                      </div>
                    </div>
                  )}
                  {citizen.institution && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Institution</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.institution}</p>
                      </div>
                    </div>
                  )}
                  {citizen.gradeYear && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade / Year</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.gradeYear}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Valid ID */}
          {(citizen.idType || citizen.proofOfIdentification) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Valid ID</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Type</label>
                    <div className="min-h-[40px] flex items-center">
                      {citizen.idType ? (
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{formatIdType(citizen.idType)}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                      )}
                    </div>
                  </div>
                  {(citizen.proofOfIdentification) && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Image</label>
                      <div className="flex justify-center items-center">
                        <img
                          src={citizen.proofOfIdentification}
                          alt="Valid ID"
                          className="max-w-full max-h-64 rounded-lg border border-gray-200"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Solo Parent Information Component
const SoloParentInfo: React.FC<{
  beneficiary: any;
  getProgramNames: (programIds: string[] | undefined) => string[];
}> = ({ beneficiary, getProgramNames }) => {
  const [isFullInfoModalOpen, setIsFullInfoModalOpen] = useState(false);

  if (!beneficiary) {
    return (
      <div className="text-center text-gray-500 py-12">
        <FiUser className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg">Select a solo parent to view details</p>
      </div>
    );
  }


  const citizen = beneficiary.citizen || beneficiary;
  const birthDate = citizen.birthDate || beneficiary.dateOfBirth;
  const age = birthDate ? calculateAge(birthDate) : null;

  return (
    <>
      <div className="space-y-6">
        {/* Profile Picture and Basic Info */}
        <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            <div 
              className={cn(
                "w-28 h-28 rounded-full bg-white border-4 border-primary-200 overflow-hidden shadow-md transition-shadow",
                (citizen.citizenPicture || beneficiary.profilePicture) ? "cursor-pointer hover:shadow-lg" : ""
              )}
              onClick={() => {
                if (citizen.citizenPicture || beneficiary.profilePicture) {
                  // Could add image modal here if needed
                }
              }}
            >
              {(citizen.citizenPicture || beneficiary.profilePicture) ? (
                <img 
                  src={citizen.citizenPicture || beneficiary.profilePicture || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNjAiIHI9IjI1IiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMCAxMjBDMzAgMTAwLjExOCA0NS4xMTggODUgNjUgODVIOThDMTE4Ljg4MiA4NSAxMzQgMTAwLjExOCAxMzQgMTIwVjE1MEgzMFYxMjBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPg=='} 
                  alt={`${citizen.firstName} ${citizen.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <FiUser size={48} className="text-gray-400" />
                </div>
              )}
            </div>
            {!(citizen.citizenPicture || beneficiary.profilePicture) && (
              <p className="text-xs text-gray-500 text-center mt-2">No image uploaded</p>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-2xl font-bold text-heading-800">
                {citizen.firstName} {citizen.middleName} {citizen.lastName} {citizen.extensionName}
              </h3>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">Solo Parent ID:</span>
                <span className="text-sm font-bold text-heading-800 font-mono bg-white px-2 py-1 rounded border">{beneficiary.soloParentId}</span>
              </div>
              {age !== null && age !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">Age:</span>
                  <span className="text-sm font-bold text-heading-800 bg-white px-2 py-1 rounded border">{age} years old</span>
                </div>
              )}
              <StatusBadge status={beneficiary.status} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Solo Parent Information */}
        {(beneficiary.categoryName || beneficiary.category) && (
            <>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Solo Parent Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                    <div className="min-h-[40px] flex items-center">
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{beneficiary.categoryName || beneficiary.category}</p>
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

        <Separator />

        {/* Assistance Programs */}
        {(() => {
          const assistanceProgramNames = getProgramNames(beneficiary.assistancePrograms);
          
          return assistanceProgramNames.length > 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Assistance Programs</h3>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Programs</label>
                <div className="min-h-[40px] flex items-center flex-wrap gap-2">
                  {assistanceProgramNames.map((programName, idx) => (
                    <Badge key={idx} className="bg-primary-100 text-primary-700 px-3 py-1">
                      {programName}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : null;
        })()}

        <Separator />

        {/* Personal Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {citizen.lastName && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.lastName}</p>
                </div>
              </div>
            )}
            {citizen.firstName && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.firstName}</p>
                </div>
              </div>
            )}
            {citizen.middleName && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.middleName}</p>
                </div>
              </div>
            )}
            {citizen.extensionName && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extension Name</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.extensionName}</p>
                </div>
              </div>
            )}
            {citizen.gender && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">{citizen.gender}</p>
                </div>
              </div>
            )}
            {birthDate && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {birthDate.includes('T') 
                      ? formatDateWithoutTimezone(birthDate, { month: 'long', day: 'numeric', year: 'numeric' })
                      : birthDate}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Contact Information */}
        {(citizen.phoneNumber || citizen.email) && (
          <>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {citizen.phoneNumber && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</label>
                    <div className="min-h-[40px] flex items-center">
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.phoneNumber}</p>
                    </div>
                  </div>
                )}
                {citizen.email && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                    <div className="min-h-[40px] flex items-center">
                      <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{citizen.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

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

// Edit Solo Parent Modal Component
export const SoloParentsTab: React.FC = () => {
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
  } = useBeneficiaryManagement('solo-parents');

  const { allGovernmentPrograms } = useGovernmentPrograms();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<any>(null);
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
            Add Solo Parent
          </Button>
        </div>
      </div>

      {/* Main Content: List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Solo Parents List */}
        <Card className="lg:col-span-1 overflow-visible">
          <CardHeader>
            <CardTitle className="text-heading-700 text-lg">Solo Parents List</CardTitle>
            
            {/* Search */}
            <div className="relative mt-4">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiSearch size={18} />
              </div>
              <Input
                placeholder="Search solo parents..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            
            {/* Total count */}
            <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
              <span>Total: {beneficiaries.length} solo parents</span>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col">
            <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading solo parents...
                </div>
              ) : beneficiaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No solo parents found.
                </div>
              ) : (
                beneficiaries.map((beneficiary) => (
                  <SoloParentCard
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

        {/* Right: Selected Solo Parent Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-heading-700 text-lg">Solo Parent Information</CardTitle>
              {selectedBeneficiary && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700"
                    onClick={() => {
                      setEditingBeneficiary(selectedBeneficiary);
                      setIsEditModalOpen(true);
                    }}
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
              <SoloParentInfo
                beneficiary={selectedBeneficiary}
                getProgramNames={getProgramNames}
              />
            ) : (
              <div className="text-center text-gray-500 py-12">
                <FiHeart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Select a solo parent to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Modal */}
      <AddSoloParentModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(data) => handleAddBeneficiary(data)}
        existingBeneficiaries={beneficiaries}
        onEdit={(beneficiaryId) => {
          const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
          if (beneficiary) {
            setEditingBeneficiary(beneficiary);
            setSelectedBeneficiary(beneficiary);
            setIsEditModalOpen(true);
            setIsAddModalOpen(false);
          }
        }}
      />

      {/* Edit Modal */}
      <EditSoloParentModal
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBeneficiary(null);
        }}
        onEdit={async (data) => {
          if (editingBeneficiary) {
            await handleEditBeneficiary(editingBeneficiary.id, data);
          }
        }}
        initialData={editingBeneficiary}
      />

      {/* Delete Modal */}
      {selectedBeneficiary && (
        <DeleteSoloParentModal
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
