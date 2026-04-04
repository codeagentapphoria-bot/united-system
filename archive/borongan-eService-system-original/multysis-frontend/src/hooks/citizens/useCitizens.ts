import type { Citizen } from '@/services/api/citizen.service';
import { citizenService } from '@/services/api/citizen.service';
import type { AddCitizenInput, EditCitizenInput } from '@/validations/citizen.schema';
import { addCitizenSchema, editCitizenSchema } from '@/validations/citizen.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCitizenSocket } from '@/hooks/useCitizenSocket';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const IS_MOCK = import.meta.env.VITE_MOCK_API === 'true';

// Mock data fallback
const mockCitizens = [
  {
    id: '1',
    name: 'Juan Dela Cruz',
    firstName: 'Juan',
    middleName: 'Santos',
    lastName: 'Dela Cruz',
    extensionName: 'Jr.',
    residentId: 'RES-2024-001',
    residencyStatus: 'active',
    residencyApplicationRemarks: 'Approved after verification',
    address: '123 Main Street, Barangay Central, Quezon City, Metro Manila',
    isEmployed: true,
    gender: 'Male',
    civilStatus: 'Single',
    citizenship: 'Filipino',
    acrNo: '',
    placeOfBirth: 'Quezon City, Metro Manila',
    dateOfBirth: '1990-05-15',
    profession: 'Software Engineer',
    height: '5\'8"',
    weight: '70 kg',
    proofOfIdentification: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face',
    username: 'juan.delacruz',
    pin: '1234',
    email: 'juan@example.com',
    phoneNumber: '09171234567',
    proofOfResidency: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=500&fit=crop',
    isResident: true,
    isVoter: true,
    status: 'active',
    dateRegistered: '2025-01-15',
  },
  {
    id: '2',
    name: 'Maria Santos',
    firstName: 'Maria',
    middleName: 'Cruz',
    lastName: 'Santos',
    extensionName: '',
    residentId: 'RES-2024-002',
    residencyStatus: 'active',
    residencyApplicationRemarks: 'Approved',
    address: '456 Oak Avenue, Barangay San Miguel, Manila',
    isEmployed: false,
    gender: 'Female',
    civilStatus: 'Married',
    citizenship: 'Filipino',
    acrNo: '',
    placeOfBirth: 'Manila, Metro Manila',
    dateOfBirth: '1985-08-22',
    profession: 'Teacher',
    height: '5\'4"',
    weight: '55 kg',
    proofOfIdentification: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=300&h=300&fit=crop&crop=face',
    username: 'maria.santos',
    pin: '5678',
    email: 'maria@example.com',
    phoneNumber: '09181234567',
    proofOfResidency: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=500&fit=crop',
    isResident: true,
    isVoter: true,
    status: 'active',
    dateRegistered: '2025-01-14',
  },
  {
    id: '3',
    name: 'Pedro Reyes',
    firstName: 'Pedro',
    middleName: 'Lopez',
    lastName: 'Reyes',
    extensionName: 'III',
    residentId: 'RES-2024-003',
    residencyStatus: 'pending',
    residencyApplicationRemarks: 'Under review',
    address: '789 Pine Street, Barangay Santa Cruz, Manila',
    isEmployed: true,
    gender: 'Male',
    civilStatus: 'Single',
    citizenship: 'Filipino',
    acrNo: '',
    placeOfBirth: 'Cebu City, Cebu',
    dateOfBirth: '1992-03-10',
    profession: 'Nurse',
    height: '5\'10"',
    weight: '75 kg',
    proofOfIdentification: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
    username: 'pedro.reyes',
    pin: '9012',
    email: 'pedro@example.com',
    phoneNumber: '09191234567',
    proofOfResidency: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop',
    isResident: false,
    isVoter: false,
    status: 'pending',
    dateRegistered: '2025-01-13',
  },
  {
    id: '4',
    name: 'Ana Garcia',
    firstName: 'Ana',
    middleName: 'Maria',
    lastName: 'Garcia',
    extensionName: '',
    residentId: 'RES-2024-004',
    residencyStatus: 'inactive',
    residencyApplicationRemarks: 'Suspended due to incomplete documents',
    address: '321 Elm Street, Barangay San Antonio, Manila',
    isEmployed: false,
    gender: 'Female',
    civilStatus: 'Widowed',
    citizenship: 'Filipino',
    acrNo: '',
    placeOfBirth: 'Davao City, Davao del Sur',
    dateOfBirth: '1988-11-30',
    profession: 'Retired',
    height: '5\'2"',
    weight: '60 kg',
    proofOfIdentification: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face',
    username: 'ana.garcia',
    pin: '3456',
    email: 'ana@example.com',
    phoneNumber: '09201234567',
    proofOfResidency: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop',
    isResident: true,
    isVoter: false,
    status: 'inactive',
    dateRegistered: '2025-01-12',
  },
  {
    id: '5',
    name: 'John Smith',
    firstName: 'John',
    middleName: 'Michael',
    lastName: 'Smith',
    extensionName: '',
    residentId: 'RES-2024-005',
    residencyStatus: 'active',
    residencyApplicationRemarks: 'Approved with work permit',
    address: '654 Maple Drive, Barangay Makati, Makati City',
    isEmployed: true,
    gender: 'Male',
    civilStatus: 'Single',
    citizenship: 'American',
    acrNo: 'ACR-2024-001',
    placeOfBirth: 'New York, USA',
    dateOfBirth: '1987-12-15',
    profession: 'Business Consultant',
    height: '6\'0"',
    weight: '80 kg',
    proofOfIdentification: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face',
    username: 'john.smith',
    pin: '7890',
    email: 'john@example.com',
    phoneNumber: '09211234567',
    proofOfResidency: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop',
    isResident: true,
    isVoter: true,
    status: 'active',
    dateRegistered: '2025-01-11',
  },
];

export const useCitizens = () => {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const { toast } = useToast();

  // Use socket hook for real-time updates
  const {
    newCitizen,
    citizenUpdate,
    citizenStatusChange,
    clearNewCitizen,
    clearCitizenUpdate,
    clearCitizenStatusChange,
  } = useCitizenSocket({
    statusFilter: statusFilter,
    enabled: true,
  });

  // Fetch citizens from API
  useEffect(() => {
    const fetchCitizens = async () => {
      if (IS_MOCK) {
        // Transform mock data to match Citizen interface
        const transformedMockCitizens = mockCitizens.map((citizen: any) => ({
          id: citizen.id,
          firstName: citizen.firstName,
          middleName: citizen.middleName,
          lastName: citizen.lastName,
          extensionName: citizen.extensionName,
          email: citizen.email,
          phoneNumber: citizen.phoneNumber,
          citizenPicture: citizen.citizenPicture,
          birthDate: citizen.dateOfBirth,
          civilStatus: citizen.civilStatus,
          sex: citizen.gender.toLowerCase(),
          username: citizen.username,
          pin: citizen.pin,
          residentId: citizen.residentId,
          residencyStatus: citizen.residencyStatus.toUpperCase() as 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REJECTED',
          residencyApplicationRemarks: citizen.residencyApplicationRemarks,
          isResident: citizen.isResident,
          isVoter: citizen.isVoter,
          proofOfResidency: citizen.proofOfResidency,
          proofOfIdentification: citizen.proofOfIdentification,
          address: citizen.address,
          isEmployed: citizen.isEmployed,
          citizenship: citizen.citizenship,
          acrNo: citizen.acrNo,
          profession: citizen.profession,
          height: citizen.height,
          weight: citizen.weight,
          citizenPlaceOfBirth: {
            region: citizen.placeOfBirth.split(',')[1]?.trim() || 'NCR',
            province: citizen.placeOfBirth.split(',')[0]?.trim() || 'Metro Manila',
            municipality: citizen.placeOfBirth.split(',')[0]?.trim() || 'Quezon City',
          },
          createdAt: citizen.dateRegistered,
          updatedAt: citizen.dateRegistered,
        }));
        setCitizens(transformedMockCitizens as any);
        setSelectedCitizen(transformedMockCitizens[0] as any);
        setTotalPages(1);
        setTotal(transformedMockCitizens.length);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await citizenService.getAllCitizens(
          currentPage,
          itemsPerPage,
          searchQuery,
          statusFilter
        );
        setCitizens(result.citizens);
        setTotalPages(result.pagination.totalPages);
        setTotal(result.pagination.total);
        
        // Set first citizen as selected if available and none is selected
        setSelectedCitizen((prev) => {
          if (prev && result.citizens.find(c => c.id === prev.id)) {
            return prev; // Keep current selection if it still exists
          }
          return result.citizens.length > 0 ? result.citizens[0] : null;
        });
      } catch (error) {
        console.error('Failed to fetch citizens:', error);
        setCitizens([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCitizens();
  }, [currentPage, searchQuery, statusFilter, refreshTrigger]);

  // Function to refresh citizens list
  const refreshCitizens = () => {
    setRefreshTrigger(prev => prev + 1);
    // Clear selected citizen if it was deleted
    setSelectedCitizen(null);
  };

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Handle new citizen from socket
  useEffect(() => {
    if (!newCitizen) return;

    const handleNewCitizen = () => {
      // Refresh the list to include the new citizen
      refreshCitizens();
      toast({
        title: 'New Citizen Registration',
        description: `${newCitizen.firstName} ${newCitizen.lastName} has registered.`,
      });
      clearNewCitizen();
    };

    handleNewCitizen();
  }, [newCitizen, toast, clearNewCitizen]);

  // Handle citizen update from socket
  useEffect(() => {
    if (!citizenUpdate) return;

    const handleCitizenUpdate = () => {
      // Update the citizen in the list incrementally
      setCitizens((prev) => {
        const index = prev.findIndex((c) => c.id === citizenUpdate.citizenId);
        if (index === -1) {
          // Citizen not in list, refresh to get it
          refreshCitizens();
          return prev;
        }

        // Update the citizen
        const updated = [...prev];
        if (citizenUpdate.firstName !== undefined) {
          updated[index] = { ...updated[index], firstName: citizenUpdate.firstName };
        }
        if (citizenUpdate.middleName !== undefined) {
          updated[index] = { ...updated[index], middleName: citizenUpdate.middleName };
        }
        if (citizenUpdate.lastName !== undefined) {
          updated[index] = { ...updated[index], lastName: citizenUpdate.lastName };
        }
        if (citizenUpdate.extensionName !== undefined) {
          updated[index] = { ...updated[index], extensionName: citizenUpdate.extensionName };
        }
        if (citizenUpdate.status !== undefined) {
          updated[index] = { ...updated[index], residencyStatus: citizenUpdate.status as any };
        }

        // Update selected citizen if it's the one being updated
        if (selectedCitizen?.id === citizenUpdate.citizenId) {
          setSelectedCitizen(updated[index]);
        }

        return updated;
      });

      toast({
        title: 'Citizen Updated',
        description: 'Citizen information has been updated.',
      });
      clearCitizenUpdate();
    };

    handleCitizenUpdate();
  }, [citizenUpdate, selectedCitizen, toast, clearCitizenUpdate]);

  // Handle citizen status change from socket
  useEffect(() => {
    if (!citizenStatusChange) return;

    const handleCitizenStatusChange = () => {
      // Update the citizen status in the list
      setCitizens((prev) => {
        const index = prev.findIndex((c) => c.id === citizenStatusChange.citizenId);
        if (index === -1) {
          // Citizen not in list, refresh to get it
          refreshCitizens();
          return prev;
        }

        // Update the citizen status
        const updated = [...prev];
        updated[index] = { ...updated[index], residencyStatus: citizenStatusChange.newStatus as any };

        // Update selected citizen if it's the one being updated
        if (selectedCitizen?.id === citizenStatusChange.citizenId) {
          setSelectedCitizen(updated[index]);
        }

        return updated;
      });

      const actionMessages: Record<string, string> = {
        approve: 'approved',
        reject: 'rejected',
        activate: 'activated',
        deactivate: 'deactivated',
      };

      toast({
        title: 'Citizen Status Changed',
        description: `Citizen has been ${actionMessages[citizenStatusChange.action] || 'updated'}.`,
      });
      clearCitizenStatusChange();
    };

    handleCitizenStatusChange();
  }, [citizenStatusChange, selectedCitizen, toast, clearCitizenStatusChange]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Transform citizens to match expected format
  const transformedCitizens = citizens.map((citizen) => ({
    ...citizen,
    name: `${citizen.firstName} ${citizen.middleName ? citizen.middleName + ' ' : ''}${citizen.lastName}${citizen.extensionName ? ' ' + citizen.extensionName : ''}`.trim(),
    dateOfBirth: citizen.birthDate,
    dateRegistered: citizen.createdAt,
    gender: citizen.sex.charAt(0).toUpperCase() + citizen.sex.slice(1),
    placeOfBirth: citizen.citizenPlaceOfBirth 
      ? `${citizen.citizenPlaceOfBirth.municipality}, ${citizen.citizenPlaceOfBirth.province}`
      : '',
    proofOfIdentification: citizen.proofOfIdentification,
    status: citizen.residencyStatus.toLowerCase(),
  }));

  // Transform selectedCitizen if it exists
  const transformedSelectedCitizen = selectedCitizen ? {
    ...selectedCitizen,
    name: `${selectedCitizen.firstName} ${selectedCitizen.middleName ? selectedCitizen.middleName + ' ' : ''}${selectedCitizen.lastName}${selectedCitizen.extensionName ? ' ' + selectedCitizen.extensionName : ''}`.trim(),
    dateOfBirth: selectedCitizen.birthDate,
    dateRegistered: selectedCitizen.createdAt,
    gender: selectedCitizen.sex.charAt(0).toUpperCase() + selectedCitizen.sex.slice(1),
    placeOfBirth: selectedCitizen.citizenPlaceOfBirth 
      ? `${selectedCitizen.citizenPlaceOfBirth.municipality}, ${selectedCitizen.citizenPlaceOfBirth.province}`
      : '',
    proofOfIdentification: selectedCitizen.proofOfIdentification,
    status: selectedCitizen.residencyStatus.toLowerCase(),
  } : null;

  return {
    citizens: transformedCitizens,
    filteredCitizens: transformedCitizens,
    paginatedFilteredCitizens: transformedCitizens,
    selectedCitizen: transformedSelectedCitizen,
    setSelectedCitizen,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    // Pagination
    currentPage,
    totalPages,
    total,
    itemsPerPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    isLoading,
    refreshCitizens,
  };
};

export const useAddCitizen = () => {
  const form = useForm<AddCitizenInput>({
    resolver: zodResolver(addCitizenSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      extensionName: '',
      civilStatus: '',
      sex: '',
      birthdate: '',
      region: '',
      province: '',
      municipality: '',
      phoneNumber: '',
      email: '',
      emergencyContactPerson: '',
      emergencyContactNumber: '',
      addressRegion: '',
      addressProvince: '',
      addressMunicipality: '',
      addressBarangay: '',
      addressPostalCode: '',
      addressStreetAddress: '',
      isResident: true,
      isVoter: false,
      username: '',
      pin: '',
      idType: '',
    },
  });

  const handleAddCitizen = async (data: AddCitizenInput) => {
    if (IS_MOCK) {
      console.log('Adding citizen (mock):', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }
    try {
      return await citizenService.createCitizen(data);
    } catch (error) {
      // Re-throw error so modal can handle it
      throw error;
    }
  };

  return {
    form,
    handleAddCitizen,
  };
};

export const useEditCitizen = (initialData?: Partial<EditCitizenInput>, citizenId?: string) => {
  const [previewImage, setPreviewImage] = useState<string | null>(initialData?.citizenPicture || null);
  const [proofOfIdentificationPreview, setProofOfIdentificationPreview] = useState<string | null>(initialData?.proofOfIdentification || null);

  const form = useForm<EditCitizenInput>({
    resolver: zodResolver(editCitizenSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      extensionName: '',
      civilStatus: '',
      sex: '',
      birthdate: '',
      region: '',
      province: '',
      municipality: '',
      isResident: false,
      isVoter: false,
      username: '',
      pin: '',
    },
  });

  // Update form values when initialData changes
  useEffect(() => {
    if (initialData) {
      // Format birthdate for date input (YYYY-MM-DD format)
      let formattedBirthdate = '';
      if (initialData.birthdate) {
        const dateStr = initialData.birthdate.toString();
        // Handle formats like "2003-08-02 00:00:00" or ISO strings
        if (dateStr.includes('T')) {
          formattedBirthdate = dateStr.split('T')[0];
        } else if (dateStr.includes(' ')) {
          formattedBirthdate = dateStr.split(' ')[0];
        } else {
          formattedBirthdate = dateStr;
        }
      }

      form.reset({
        firstName: initialData.firstName || '',
        middleName: initialData.middleName || '',
        lastName: initialData.lastName || '',
        extensionName: initialData.extensionName || '',
        civilStatus: initialData.civilStatus || '',
        sex: initialData.sex || '',
        birthdate: formattedBirthdate,
        region: initialData.region || '',
        province: initialData.province || '',
        municipality: initialData.municipality || '',
        // Contact Information
        phoneNumber: initialData.phoneNumber || '',
        email: initialData.email || '',
        // Spouse and Emergency Contact
        spouseName: initialData.spouseName || '',
        emergencyContactPerson: initialData.emergencyContactPerson || '',
        emergencyContactNumber: initialData.emergencyContactNumber || '',
        // Complete Address
        addressRegion: initialData.addressRegion || '',
        addressProvince: initialData.addressProvince || '',
        addressMunicipality: initialData.addressMunicipality || '',
        addressBarangay: initialData.addressBarangay || '',
        addressPostalCode: initialData.addressPostalCode || '',
        addressStreetAddress: initialData.addressStreetAddress || '',
        address: initialData.address || '', // Legacy field
        // Valid ID
        idType: initialData.idType || '',
        proofOfIdentification: initialData.proofOfIdentification || '',
        // Other fields
        isResident: initialData.isResident ?? false,
        isVoter: initialData.isVoter ?? false,
        username: initialData.username || '',
        pin: initialData.pin || '',
        isEmployed: initialData.isEmployed ?? false,
        citizenship: initialData.citizenship || '',
        acrNo: initialData.acrNo || '',
        profession: initialData.profession || '',
        height: initialData.height || '',
        weight: initialData.weight || '',
      });

      // Set preview images
      setPreviewImage(initialData.citizenPicture || null);
      setProofOfIdentificationPreview(initialData.proofOfIdentification || null);
    } else {
      // Reset form and previews when initialData is cleared
      form.reset();
      setPreviewImage(null);
      setProofOfIdentificationPreview(null);
    }
  }, [initialData, form]);

  const handleEditCitizen = async (data: EditCitizenInput) => {
    if (IS_MOCK || !citizenId) {
      console.log('Editing citizen (mock):', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return;
    }
    return await citizenService.updateCitizen(citizenId, data);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewImage(result);
      };
      reader.readAsDataURL(file);
      // Store file object instead of base64
      form.setValue('citizenPictureFile', file);
    }
  };

  const handleProofOfIdentificationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProofOfIdentificationPreview(result);
      };
      reader.readAsDataURL(file);
      // Store file object instead of base64
      form.setValue('proofOfIdentificationFile', file);
    }
  };

  return {
    form,
    handleEditCitizen,
    previewImage,
    handleImageChange,
    proofOfIdentificationPreview,
    handleProofOfIdentificationChange,
  };
};
