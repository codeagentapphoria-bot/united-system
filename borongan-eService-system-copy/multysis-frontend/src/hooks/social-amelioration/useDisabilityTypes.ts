// React imports
import { useState, useEffect } from 'react';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Services
import { socialAmeliorationSettingApi, type SocialAmeliorationSetting } from '@/services/api/social-amelioration-setting.service';

// Types
export interface DisabilityType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisabilityTypeInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDisabilityTypeInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// Helper to convert API response to DisabilityType
const mapToDisabilityType = (setting: SocialAmeliorationSetting): DisabilityType => ({
  id: setting.id,
  name: setting.name,
  description: setting.description,
  isActive: setting.isActive,
  createdAt: setting.createdAt,
  updatedAt: setting.updatedAt,
});

export const useDisabilityTypes = () => {
  const [disabilityTypes, setDisabilityTypes] = useState<DisabilityType[]>([]);
  const [selectedDisabilityType, setSelectedDisabilityType] = useState<DisabilityType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { toast } = useToast();

  // Fetch disability types
  useEffect(() => {
    const fetchDisabilityTypes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const settings = await socialAmeliorationSettingApi.getSettings({
          type: 'DISABILITY_TYPE',
        });
        const mappedTypes = settings.map(mapToDisabilityType);
        setDisabilityTypes(mappedTypes);
        
        // Auto-select first disability type if available and none is selected
        setSelectedDisabilityType((prev) => {
          if (prev && mappedTypes.find(dt => dt.id === prev.id)) {
            return prev; // Keep current selection if it still exists
          }
          return mappedTypes.length > 0 ? mappedTypes[0] : null;
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch disability types');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'Failed to fetch disability types',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDisabilityTypes();
  }, [toast]);

  // Filter disability types
  const filteredDisabilityTypes = disabilityTypes.filter((disabilityType) => {
    const matchesSearch = disabilityType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (disabilityType.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = statusFilter === 'all' || 
                         (statusFilter === 'active' && disabilityType.isActive) ||
                         (statusFilter === 'inactive' && !disabilityType.isActive);
    return matchesSearch && matchesFilter;
  });

  const createDisabilityType = async (data: CreateDisabilityTypeInput): Promise<DisabilityType> => {
    try {
      const setting = await socialAmeliorationSettingApi.createSetting({
        type: 'DISABILITY_TYPE',
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
      });
      const newDisabilityType = mapToDisabilityType(setting);
      
      setDisabilityTypes((prev) => [newDisabilityType, ...prev]);
      toast({
        title: 'Success',
        description: 'Disability type created successfully',
      });
      return newDisabilityType;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create disability type',
      });
      throw err;
    }
  };

  const updateDisabilityType = async (id: string, data: UpdateDisabilityTypeInput): Promise<DisabilityType> => {
    try {
      const setting = await socialAmeliorationSettingApi.updateSetting(id, data);
      const updatedDisabilityType = mapToDisabilityType(setting);
      
      setDisabilityTypes((prev) =>
        prev.map((disabilityType) => (disabilityType.id === id ? updatedDisabilityType : disabilityType))
      );
      if (selectedDisabilityType?.id === id) {
        setSelectedDisabilityType(updatedDisabilityType);
      }
      toast({
        title: 'Success',
        description: 'Disability type updated successfully',
      });
      return updatedDisabilityType;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update disability type',
      });
      throw err;
    }
  };

  const deleteDisabilityType = async (id: string): Promise<void> => {
    try {
      await socialAmeliorationSettingApi.deleteSetting(id);
      setDisabilityTypes((prev) => {
        const updated = prev.filter((disabilityType) => disabilityType.id !== id);
        // Auto-select first remaining item if deleted item was selected
        if (selectedDisabilityType?.id === id) {
          setSelectedDisabilityType(updated.length > 0 ? updated[0] : null);
        }
        return updated;
      });
      toast({
        title: 'Success',
        description: 'Disability type deleted successfully',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete disability type',
      });
      throw err;
    }
  };

  const activateDisabilityType = async (id: string): Promise<DisabilityType> => {
    try {
      const setting = await socialAmeliorationSettingApi.activateSetting(id);
      const activatedDisabilityType = mapToDisabilityType(setting);
      setDisabilityTypes((prev) =>
        prev.map((disabilityType) => (disabilityType.id === id ? activatedDisabilityType : disabilityType))
      );
      if (selectedDisabilityType?.id === id) {
        setSelectedDisabilityType(activatedDisabilityType);
      }
      toast({
        title: 'Success',
        description: 'Disability type activated successfully',
      });
      return activatedDisabilityType;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to activate disability type',
      });
      throw err;
    }
  };

  const deactivateDisabilityType = async (id: string): Promise<DisabilityType> => {
    try {
      const setting = await socialAmeliorationSettingApi.deactivateSetting(id);
      const deactivatedDisabilityType = mapToDisabilityType(setting);
      setDisabilityTypes((prev) =>
        prev.map((disabilityType) => (disabilityType.id === id ? deactivatedDisabilityType : disabilityType))
      );
      if (selectedDisabilityType?.id === id) {
        setSelectedDisabilityType(deactivatedDisabilityType);
      }
      toast({
        title: 'Success',
        description: 'Disability type deactivated successfully',
      });
      return deactivatedDisabilityType;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to deactivate disability type',
      });
      throw err;
    }
  };

  // Get active disability types for dropdowns
  const activeDisabilityTypes = disabilityTypes.filter(dt => dt.isActive);

  return {
    disabilityTypes: filteredDisabilityTypes,
    allDisabilityTypes: disabilityTypes,
    activeDisabilityTypes,
    selectedDisabilityType,
    setSelectedDisabilityType,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createDisabilityType,
    updateDisabilityType,
    deleteDisabilityType,
    activateDisabilityType,
    deactivateDisabilityType,
  };
};

