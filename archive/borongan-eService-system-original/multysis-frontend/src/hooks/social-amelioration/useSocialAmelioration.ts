import { useToast } from '@/hooks/use-toast';
import { useBeneficiarySocket } from '@/hooks/useBeneficiarySocket';
import {
  socialAmeliorationApi,
  type BeneficiaryStatus,
  type OverviewStats,
  type PWDBeneficiary,
  type SeniorBeneficiary,
  type SoloParentBeneficiary,
  type StudentBeneficiary,
  type TrendStat,
} from '@/services/api/social-amelioration.service';
import { governmentProgramService } from '@/services/api/government-program.service';
import { socialAmeliorationSettingApi } from '@/services/api/social-amelioration-setting.service';
import type {
  PWDInput,
  SeniorCitizenInput,
  SoloParentInput,
  StudentInput,
} from '@/validations/beneficiary.schema';
import { useCallback, useEffect, useMemo, useState } from 'react';

type BeneficiaryType = 'senior-citizen' | 'pwd' | 'students' | 'solo-parents';

type BeneficiaryRecord =
  | SeniorBeneficiary
  | PWDBeneficiary
  | StudentBeneficiary
  | SoloParentBeneficiary;

interface EnrichedBeneficiaryFields {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  extensionName?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  contactNumber?: string;
  address?: string;
  addressRegion?: string;
  addressProvince?: string;
  addressMunicipality?: string;
  addressBarangay?: string;
  addressPostalCode?: string;
  addressStreetAddress?: string;
}

export type EnrichedBeneficiary = BeneficiaryRecord & EnrichedBeneficiaryFields;

const EMPTY_STATS: OverviewStats = {
  totalSeniorCitizens: 0,
  totalPWD: 0,
  totalStudents: 0,
  totalSoloParents: 0,
  totalBeneficiaries: 0,
};

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const responseError = error as { response?: { data?: { message?: string } } };
    return responseError.response?.data?.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
};

const normalizeBeneficiary = (record: BeneficiaryRecord): EnrichedBeneficiary => {
  const citizen = record.citizen;
  if (!citizen) {
    return { ...record };
  }

  const existingFields = record as Partial<EnrichedBeneficiaryFields>;

  return {
    ...record,
    firstName: existingFields.firstName ?? citizen.firstName ?? undefined,
    middleName: existingFields.middleName ?? citizen.middleName ?? undefined,
    lastName: existingFields.lastName ?? citizen.lastName ?? undefined,
    extensionName: existingFields.extensionName ?? citizen.extensionName ?? undefined,
    dateOfBirth: existingFields.dateOfBirth ?? citizen.birthDate ?? undefined,
    gender: existingFields.gender ?? citizen.sex ?? undefined,
    phoneNumber: existingFields.phoneNumber ?? citizen.phoneNumber ?? undefined,
    contactNumber: existingFields.contactNumber ?? citizen.phoneNumber ?? undefined,
    address: existingFields.address ?? citizen.address ?? undefined,
    addressRegion: existingFields.addressRegion ?? citizen.addressRegion ?? undefined,
    addressProvince: existingFields.addressProvince ?? citizen.addressProvince ?? undefined,
    addressMunicipality: existingFields.addressMunicipality ?? citizen.addressMunicipality ?? undefined,
    addressBarangay: existingFields.addressBarangay ?? citizen.addressBarangay ?? undefined,
    addressPostalCode: existingFields.addressPostalCode ?? citizen.addressPostalCode ?? undefined,
    addressStreetAddress: existingFields.addressStreetAddress ?? citizen.addressStreetAddress ?? undefined,
  };
};

const formatTrendLabel = (period: string, range: 'daily' | 'monthly' | 'yearly') => {
  if (range === 'daily') {
    const date = new Date(period);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (range === 'yearly') {
    return period;
  }

  const [year, month] = period.split('-').map((value) => parseInt(value, 10));
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export const useSocialAmeliorationData = () => {
  const { toast } = useToast();
  const [dashboardStats, setDashboardStats] = useState<OverviewStats>(EMPTY_STATS);
  const [trendStats, setTrendStats] = useState<TrendStat[]>([]);
  const [trendRange, setTrendRange] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overview, trends] = await Promise.all([
        socialAmeliorationApi.getOverviewStats(),
        socialAmeliorationApi.getTrendStats(trendRange),
      ]);
      setDashboardStats(overview);
      setTrendStats(trends);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error) || 'Failed to load statistics',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, trendRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const chartData = useMemo(
    () =>
      trendStats.map((stat) => ({
        month: formatTrendLabel(stat.period, trendRange),
        period: stat.period,
        seniorCitizens: stat.seniorCitizens,
        pwd: stat.pwd,
        students: stat.students,
        soloParents: stat.soloParents,
      })),
    [trendStats, trendRange]
  );

  return {
    dashboardStats,
    monthlyStats: chartData,
    trendRange,
    setTrendRange,
    refresh: fetchStats,
    isLoading,
  };
};

export const useBeneficiaryManagement = (type: BeneficiaryType) => {
  const { toast } = useToast();
  const [beneficiaries, setBeneficiaries] = useState<EnrichedBeneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<EnrichedBeneficiary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Map hook type to socket type
  const socketType = useMemo(() => {
    switch (type) {
      case 'senior-citizen':
        return 'SENIOR_CITIZEN' as const;
      case 'pwd':
        return 'PWD' as const;
      case 'students':
        return 'STUDENT' as const;
      case 'solo-parents':
        return 'SOLO_PARENT' as const;
      default:
        return undefined;
    }
  }, [type]);

  // Use socket hook for real-time updates
  const {
    newBeneficiary,
    beneficiaryUpdate,
    beneficiaryDelete,
    clearNewBeneficiary,
    clearBeneficiaryUpdate,
    clearBeneficiaryDelete,
  } = useBeneficiarySocket({
    type: socketType,
    enabled: true,
  });

  const fetchBeneficiaries = useCallback(async () => {
    setIsLoading(true);
    try {
      let response:
        | { data: SeniorBeneficiary[] }
        | { data: PWDBeneficiary[] }
        | { data: StudentBeneficiary[] }
        | { data: SoloParentBeneficiary[] };

      switch (type) {
        case 'senior-citizen':
          response = await socialAmeliorationApi.getSeniorBeneficiaries({ search: searchQuery });
          break;
        case 'pwd':
          response = await socialAmeliorationApi.getPWDBeneficiaries({ search: searchQuery });
          break;
        case 'students':
          response = await socialAmeliorationApi.getStudentBeneficiaries({ search: searchQuery });
          break;
        case 'solo-parents':
          response = await socialAmeliorationApi.getSoloParentBeneficiaries({ search: searchQuery });
          break;
      }

      const normalized = response.data.map((record) => normalizeBeneficiary(record));
      setBeneficiaries(normalized);
      setSelectedBeneficiary((prev) => {
        // Try to keep previous selection if it still exists
        const existing = normalized.find((item) => item.id === prev?.id);
        if (existing) return existing;
        // Otherwise, auto-select the first beneficiary if available
        return normalized.length > 0 ? normalized[0] : null;
      });
      } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
          description: getErrorMessage(error) || 'Failed to load beneficiaries',
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, toast, type]);

  useEffect(() => {
    fetchBeneficiaries();
  }, [fetchBeneficiaries]);

  // Handle new beneficiary from socket
  useEffect(() => {
    if (!newBeneficiary) return;

    const handleNewBeneficiary = async () => {
      try {
        // Refresh the list to include the new beneficiary
        await fetchBeneficiaries();
        toast({
          title: 'New Beneficiary',
          description: 'A new beneficiary has been added.',
        });
        clearNewBeneficiary();
      } catch (error) {
        console.error('Failed to refresh beneficiaries after new beneficiary:', error);
        clearNewBeneficiary();
      }
    };

    handleNewBeneficiary();
  }, [newBeneficiary, fetchBeneficiaries, toast, clearNewBeneficiary]);

  // Handle beneficiary update from socket
  useEffect(() => {
    if (!beneficiaryUpdate) return;

    const handleBeneficiaryUpdate = async () => {
      try {
        // Update the beneficiary in the list incrementally
        setBeneficiaries((prev) => {
          const index = prev.findIndex((b) => b.id === beneficiaryUpdate.beneficiaryId);
          if (index === -1) {
            // Beneficiary not in list, refresh to get it
            fetchBeneficiaries();
            return prev;
          }

          // Update the beneficiary
          const updated = [...prev];
          if (beneficiaryUpdate.status !== undefined) {
            const validStatuses: BeneficiaryStatus[] = ['ACTIVE', 'INACTIVE', 'PENDING'];
            const newStatus = validStatuses.includes(beneficiaryUpdate.status as BeneficiaryStatus)
              ? (beneficiaryUpdate.status as BeneficiaryStatus)
              : updated[index].status;
            updated[index] = { ...updated[index], status: newStatus };
          }
          if (beneficiaryUpdate.programIds !== undefined) {
            // Update program IDs based on type
            if (type === 'senior-citizen') {
              updated[index] = { ...updated[index], governmentPrograms: beneficiaryUpdate.programIds };
            } else if (type === 'pwd') {
              updated[index] = { ...updated[index], governmentPrograms: beneficiaryUpdate.programIds };
            } else if (type === 'students') {
              updated[index] = { ...updated[index], programs: beneficiaryUpdate.programIds };
            } else if (type === 'solo-parents') {
              updated[index] = { ...updated[index], assistancePrograms: beneficiaryUpdate.programIds };
            }
          }

          // Update selected beneficiary if it's the one being updated
          if (selectedBeneficiary?.id === beneficiaryUpdate.beneficiaryId) {
            setSelectedBeneficiary(updated[index]);
          }

          return updated;
        });

        toast({
          title: 'Beneficiary Updated',
          description: 'Beneficiary information has been updated.',
        });
        clearBeneficiaryUpdate();
      } catch (error) {
        console.error('Failed to update beneficiary:', error);
        clearBeneficiaryUpdate();
      }
    };

    handleBeneficiaryUpdate();
  }, [beneficiaryUpdate, selectedBeneficiary, type, toast, clearBeneficiaryUpdate, fetchBeneficiaries]);

  // Handle beneficiary delete from socket
  useEffect(() => {
    if (!beneficiaryDelete) return;

    const handleBeneficiaryDelete = () => {
      // Remove the beneficiary from the list
      setBeneficiaries((prev) => {
        const filtered = prev.filter((b) => b.id !== beneficiaryDelete.beneficiaryId);
        
        // Clear selection if deleted beneficiary was selected
        if (selectedBeneficiary?.id === beneficiaryDelete.beneficiaryId) {
          setSelectedBeneficiary(filtered.length > 0 ? filtered[0] : null);
        }

        return filtered;
      });

      toast({
        title: 'Beneficiary Removed',
        description: 'Beneficiary has been removed.',
      });
      clearBeneficiaryDelete();
    };

    handleBeneficiaryDelete();
  }, [beneficiaryDelete, selectedBeneficiary, toast, clearBeneficiaryDelete]);

  const handleAddBeneficiary = useCallback(
    async (
      data: SeniorCitizenInput | PWDInput | StudentInput | SoloParentInput
    ): Promise<void> => {
      try {
        switch (type) {
          case 'senior-citizen':
            await socialAmeliorationApi.createSeniorBeneficiary(data as SeniorCitizenInput);
            break;
          case 'pwd':
            await socialAmeliorationApi.createPWDBeneficiary(data as PWDInput);
            break;
          case 'students':
            await socialAmeliorationApi.createStudentBeneficiary(data as StudentInput);
            break;
          case 'solo-parents':
            await socialAmeliorationApi.createSoloParentBeneficiary(data as SoloParentInput);
            break;
        }
        toast({
          title: 'Success',
          description: 'Beneficiary saved successfully',
        });
        await fetchBeneficiaries();
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: getErrorMessage(error) || 'Failed to save beneficiary',
        });
        throw error;
      }
    },
    [fetchBeneficiaries, toast, type]
  );

  const handleEditBeneficiary = useCallback(
    async (
      id: string,
      data: SeniorCitizenInput | PWDInput | StudentInput | SoloParentInput
    ): Promise<void> => {
      try {
        switch (type) {
          case 'senior-citizen':
            await socialAmeliorationApi.updateSeniorBeneficiary(id, data as SeniorCitizenInput);
            break;
          case 'pwd':
            await socialAmeliorationApi.updatePWDBeneficiary(id, data as PWDInput);
            break;
          case 'students':
            await socialAmeliorationApi.updateStudentBeneficiary(id, data as StudentInput);
            break;
          case 'solo-parents':
            await socialAmeliorationApi.updateSoloParentBeneficiary(id, data as SoloParentInput);
            break;
        }
        toast({
          title: 'Success',
          description: 'Beneficiary updated successfully',
        });
        await fetchBeneficiaries();
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: getErrorMessage(error) || 'Failed to update beneficiary',
        });
        throw error;
      }
    },
    [fetchBeneficiaries, toast, type]
  );

  const handleActivateBeneficiary = useCallback(
    async (id: string) => {
      try {
        switch (type) {
          case 'senior-citizen':
            await socialAmeliorationApi.updateSeniorBeneficiary(id, { status: 'ACTIVE' });
            break;
          case 'pwd':
            await socialAmeliorationApi.updatePWDBeneficiary(id, { status: 'ACTIVE' });
            break;
          case 'students':
            await socialAmeliorationApi.updateStudentBeneficiary(id, { status: 'ACTIVE' });
            break;
          case 'solo-parents':
            await socialAmeliorationApi.updateSoloParentBeneficiary(id, { status: 'ACTIVE' });
            break;
        }
        toast({
          title: 'Success',
          description: 'Beneficiary activated successfully',
        });
        await fetchBeneficiaries();
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: getErrorMessage(error) || 'Failed to activate beneficiary',
        });
      }
    },
    [fetchBeneficiaries, toast, type]
  );

  const handleDeactivateBeneficiary = useCallback(
    async (id: string) => {
      try {
        switch (type) {
          case 'senior-citizen':
            await socialAmeliorationApi.updateSeniorBeneficiary(id, { status: 'INACTIVE' });
            break;
          case 'pwd':
            await socialAmeliorationApi.updatePWDBeneficiary(id, { status: 'INACTIVE' });
            break;
          case 'students':
            await socialAmeliorationApi.updateStudentBeneficiary(id, { status: 'INACTIVE' });
            break;
          case 'solo-parents':
            await socialAmeliorationApi.updateSoloParentBeneficiary(id, { status: 'INACTIVE' });
            break;
        }
        toast({
          title: 'Success',
          description: 'Beneficiary deactivated successfully',
        });
        await fetchBeneficiaries();
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: getErrorMessage(error) || 'Failed to deactivate beneficiary',
        });
      }
    },
    [fetchBeneficiaries, toast, type]
  );

  const handleDeleteBeneficiary = useCallback(
    async (id: string) => {
      try {
        switch (type) {
          case 'senior-citizen':
            await socialAmeliorationApi.deleteSeniorBeneficiary(id);
            break;
          case 'pwd':
            await socialAmeliorationApi.deletePWDBeneficiary(id);
            break;
          case 'students':
            await socialAmeliorationApi.deleteStudentBeneficiary(id);
            break;
          case 'solo-parents':
            await socialAmeliorationApi.deleteSoloParentBeneficiary(id);
            break;
        }
        toast({
          title: 'Success',
          description: 'Beneficiary removed successfully',
        });
        // Clear selection if deleted beneficiary was selected
        setSelectedBeneficiary((prev) => (prev?.id === id ? null : prev));
        await fetchBeneficiaries();
      } catch (error: unknown) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: getErrorMessage(error) || 'Failed to remove beneficiary',
        });
        throw error;
      }
    },
    [fetchBeneficiaries, toast, type, setSelectedBeneficiary]
  );

  // Helper function to escape CSV values
  const escapeCsvValue = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Helper function to format address
  const formatAddress = (beneficiary: EnrichedBeneficiary): string => {
    const parts: string[] = [];
    if (beneficiary.addressStreetAddress) parts.push(beneficiary.addressStreetAddress);
    if (beneficiary.addressBarangay) parts.push(beneficiary.addressBarangay);
    if (beneficiary.addressMunicipality) parts.push(beneficiary.addressMunicipality);
    if (beneficiary.addressProvince) parts.push(beneficiary.addressProvince);
    if (beneficiary.addressRegion) parts.push(beneficiary.addressRegion);
    if (beneficiary.addressPostalCode) parts.push(beneficiary.addressPostalCode);
    return parts.length > 0 ? parts.join(', ') : (beneficiary.address || '');
  };

  const handleDownloadList = useCallback(async () => {
    try {
      // Fetch the latest data
      let response:
        | { data: SeniorBeneficiary[] }
        | { data: PWDBeneficiary[] }
        | { data: StudentBeneficiary[] }
        | { data: SoloParentBeneficiary[] };

      switch (type) {
        case 'senior-citizen':
          response = await socialAmeliorationApi.getSeniorBeneficiaries({ search: searchQuery });
          break;
        case 'pwd':
          response = await socialAmeliorationApi.getPWDBeneficiaries({ search: searchQuery });
          break;
        case 'students':
          response = await socialAmeliorationApi.getStudentBeneficiaries({ search: searchQuery });
          break;
        case 'solo-parents':
          response = await socialAmeliorationApi.getSoloParentBeneficiaries({ search: searchQuery });
          break;
      }

      const normalizedBeneficiaries = response.data.map((record) => normalizeBeneficiary(record));

      if (normalizedBeneficiaries.length === 0) {
        toast({
          title: 'No Data',
          description: 'No beneficiaries to export.',
        });
        return;
      }

      // Fetch lookup data for mapping IDs to names
      const fetchPromises = [
        governmentProgramService.getAllGovernmentPrograms(),
        type === 'senior-citizen' ? socialAmeliorationSettingApi.getSettings({ type: 'PENSION_TYPE' }) : Promise.resolve([]),
        type === 'pwd' ? socialAmeliorationSettingApi.getSettings({ type: 'DISABILITY_TYPE' }) : Promise.resolve([]),
        type === 'students' ? socialAmeliorationSettingApi.getSettings({ type: 'GRADE_LEVEL' }) : Promise.resolve([]),
        type === 'solo-parents' ? socialAmeliorationSettingApi.getSettings({ type: 'SOLO_PARENT_CATEGORY' }) : Promise.resolve([]),
      ];

      const [governmentPrograms, pensionTypes, disabilityTypes, gradeLevels, soloParentCategories] = await Promise.all(fetchPromises);

      // Create lookup maps
      const programMap = new Map(governmentPrograms.map(p => [p.id, p.name]));
      const pensionTypeMap = new Map(pensionTypes.map(pt => [pt.id, pt.name]));
      const disabilityTypeMap = new Map(disabilityTypes.map(dt => [dt.id, dt.name]));
      const gradeLevelMap = new Map(gradeLevels.map(gl => [gl.id, gl.name]));
      const categoryMap = new Map(soloParentCategories.map(cat => [cat.id, cat.name]));

      // Helper function to map program IDs to names
      const mapProgramIdsToNames = (programIds: string[] | undefined): string => {
        if (!programIds || programIds.length === 0) return '';
        return programIds
          .map(id => programMap.get(id) || id)
          .filter(Boolean)
          .join('; ');
      };

      // Helper function to map pension type IDs to names
      const mapPensionTypeIdsToNames = (pensionTypeIds: string[] | undefined): string => {
        if (!pensionTypeIds || pensionTypeIds.length === 0) return '';
        return pensionTypeIds
          .map(id => pensionTypeMap.get(id) || id)
          .filter(Boolean)
          .join('; ');
      };

      // Helper function to map single ID to name
      const mapIdToName = (id: string | undefined, map: Map<string, string>): string => {
        if (!id) return '';
        return map.get(id) || id;
      };

      let headers: string[] = [];
      let rows: string[][] = [];
      let filename = '';

      switch (type) {
        case 'senior-citizen': {
          headers = [
            'Senior Citizen ID',
            'First Name',
            'Middle Name',
            'Last Name',
            'Extension Name',
            'Date of Birth',
            'Gender',
            'Phone Number',
            'Address',
            'Pension Types',
            'Government Programs',
            'Status',
            'Remarks',
            'Created Date',
          ];
          rows = normalizedBeneficiaries.map((beneficiary) => {
            const seniorBeneficiary = beneficiary as EnrichedBeneficiary & SeniorBeneficiary;
            return [
              seniorBeneficiary.seniorCitizenId || '',
              beneficiary.firstName || '',
              beneficiary.middleName || '',
              beneficiary.lastName || '',
              beneficiary.extensionName || '',
              beneficiary.dateOfBirth || '',
              beneficiary.gender || '',
              beneficiary.phoneNumber || '',
              formatAddress(beneficiary),
              mapPensionTypeIdsToNames(seniorBeneficiary.pensionTypes),
              mapProgramIdsToNames(seniorBeneficiary.governmentPrograms),
              seniorBeneficiary.status || '',
              seniorBeneficiary.remarks || '',
              seniorBeneficiary.createdAt ? new Date(seniorBeneficiary.createdAt).toLocaleDateString() : '',
            ];
          });
          filename = `senior-citizens-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
        case 'pwd': {
          headers = [
            'PWD ID',
            'First Name',
            'Middle Name',
            'Last Name',
            'Extension Name',
            'Date of Birth',
            'Gender',
            'Phone Number',
            'Address',
            'Disability Type',
            'Disability Level',
            'Monetary Allowance',
            'Assisted Device',
            'Donor Device',
            'Government Programs',
            'Status',
            'Remarks',
            'Created Date',
          ];
          rows = normalizedBeneficiaries.map((beneficiary) => {
            const pwdBeneficiary = beneficiary as EnrichedBeneficiary & PWDBeneficiary;
            return [
              pwdBeneficiary.pwdId || '',
              beneficiary.firstName || '',
              beneficiary.middleName || '',
              beneficiary.lastName || '',
              beneficiary.extensionName || '',
              beneficiary.dateOfBirth || '',
              beneficiary.gender || '',
              beneficiary.phoneNumber || '',
              formatAddress(beneficiary),
              mapIdToName(pwdBeneficiary.disabilityType, disabilityTypeMap),
              pwdBeneficiary.disabilityLevel || '',
              pwdBeneficiary.monetaryAllowance ? 'Yes' : 'No',
              pwdBeneficiary.assistedDevice ? 'Yes' : 'No',
              pwdBeneficiary.donorDevice || '',
              mapProgramIdsToNames(pwdBeneficiary.governmentPrograms),
              pwdBeneficiary.status || '',
              pwdBeneficiary.remarks || '',
              pwdBeneficiary.createdAt ? new Date(pwdBeneficiary.createdAt).toLocaleDateString() : '',
            ];
          });
          filename = `pwd-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
        case 'students': {
          headers = [
            'Student ID',
            'First Name',
            'Middle Name',
            'Last Name',
            'Extension Name',
            'Date of Birth',
            'Gender',
            'Phone Number',
            'Address',
            'Grade Level',
            'Programs',
            'Status',
            'Remarks',
            'Created Date',
          ];
          rows = normalizedBeneficiaries.map((beneficiary) => {
            const studentBeneficiary = beneficiary as EnrichedBeneficiary & StudentBeneficiary;
            return [
              studentBeneficiary.studentId || '',
              beneficiary.firstName || '',
              beneficiary.middleName || '',
              beneficiary.lastName || '',
              beneficiary.extensionName || '',
              beneficiary.dateOfBirth || '',
              beneficiary.gender || '',
              beneficiary.phoneNumber || '',
              formatAddress(beneficiary),
              mapIdToName(studentBeneficiary.gradeLevel, gradeLevelMap),
              mapProgramIdsToNames(studentBeneficiary.programs),
              studentBeneficiary.status || '',
              studentBeneficiary.remarks || '',
              studentBeneficiary.createdAt ? new Date(studentBeneficiary.createdAt).toLocaleDateString() : '',
            ];
          });
          filename = `students-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
        case 'solo-parents': {
          headers = [
            'Solo Parent ID',
            'First Name',
            'Middle Name',
            'Last Name',
            'Extension Name',
            'Date of Birth',
            'Gender',
            'Phone Number',
            'Address',
            'Category',
            'Assistance Programs',
            'Status',
            'Remarks',
            'Created Date',
          ];
          rows = normalizedBeneficiaries.map((beneficiary) => {
            const soloParentBeneficiary = beneficiary as EnrichedBeneficiary & SoloParentBeneficiary;
            return [
              soloParentBeneficiary.soloParentId || '',
              beneficiary.firstName || '',
              beneficiary.middleName || '',
              beneficiary.lastName || '',
              beneficiary.extensionName || '',
              beneficiary.dateOfBirth || '',
              beneficiary.gender || '',
              beneficiary.phoneNumber || '',
              formatAddress(beneficiary),
              mapIdToName(soloParentBeneficiary.category, categoryMap),
              mapProgramIdsToNames(soloParentBeneficiary.assistancePrograms),
              soloParentBeneficiary.status || '',
              soloParentBeneficiary.remarks || '',
              soloParentBeneficiary.createdAt ? new Date(soloParentBeneficiary.createdAt).toLocaleDateString() : '',
            ];
          });
          filename = `solo-parents-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
      }

      // Create CSV content
      const csvContent = [
        headers.map(escapeCsvValue).join(','),
        ...rows.map((row) => row.map(escapeCsvValue).join(',')),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download Complete',
        description: `${normalizedBeneficiaries.length} beneficiary record(s) exported successfully.`,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getErrorMessage(error) || 'Failed to export beneficiary list',
      });
    }
  }, [searchQuery, toast, type]);

  return {
    beneficiaries,
    selectedBeneficiary,
    setSelectedBeneficiary,
    searchQuery,
    setSearchQuery,
    handleAddBeneficiary,
    handleEditBeneficiary,
    handleDeleteBeneficiary,
    handleActivateBeneficiary,
    handleDeactivateBeneficiary,
    handleDownloadList,
    isLoading,
    refresh: fetchBeneficiaries,
  };
};
