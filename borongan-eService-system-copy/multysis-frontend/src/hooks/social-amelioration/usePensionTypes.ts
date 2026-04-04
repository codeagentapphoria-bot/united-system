// React imports
import { useState, useEffect } from 'react';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Services
import { socialAmeliorationSettingApi, type SocialAmeliorationSetting } from '@/services/api/social-amelioration-setting.service';

// Types
export interface PensionType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePensionTypeInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePensionTypeInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// Helper to convert API response to PensionType
const mapToPensionType = (setting: SocialAmeliorationSetting): PensionType => ({
  id: setting.id,
  name: setting.name,
  description: setting.description,
  isActive: setting.isActive,
  createdAt: setting.createdAt,
  updatedAt: setting.updatedAt,
});

export const usePensionTypes = () => {
  const [pensionTypes, setPensionTypes] = useState<PensionType[]>([]);
  const [selectedPensionType, setSelectedPensionType] = useState<PensionType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { toast } = useToast();

  // Fetch pension types
  useEffect(() => {
    const fetchPensionTypes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const settings = await socialAmeliorationSettingApi.getSettings({
          type: 'PENSION_TYPE',
        });
        const mappedTypes = settings.map(mapToPensionType);
        setPensionTypes(mappedTypes);
        
        // Auto-select first pension type if available and none is selected
        setSelectedPensionType((prev) => {
          if (prev && mappedTypes.find(pt => pt.id === prev.id)) {
            return prev; // Keep current selection if it still exists
          }
          return mappedTypes.length > 0 ? mappedTypes[0] : null;
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch pension types');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'Failed to fetch pension types',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPensionTypes();
  }, [toast]);

  // Filter pension types
  const filteredPensionTypes = pensionTypes.filter((pensionType) => {
    const matchesSearch = pensionType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (pensionType.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = statusFilter === 'all' || 
                         (statusFilter === 'active' && pensionType.isActive) ||
                         (statusFilter === 'inactive' && !pensionType.isActive);
    return matchesSearch && matchesFilter;
  });

  const createPensionType = async (data: CreatePensionTypeInput): Promise<PensionType> => {
    try {
      const setting = await socialAmeliorationSettingApi.createSetting({
        type: 'PENSION_TYPE',
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
      });
      const newPensionType = mapToPensionType(setting);
      
      setPensionTypes((prev) => [newPensionType, ...prev]);
      toast({
        title: 'Success',
        description: 'Pension type created successfully',
      });
      return newPensionType;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create pension type',
      });
      throw err;
    }
  };

  const updatePensionType = async (id: string, data: UpdatePensionTypeInput): Promise<PensionType> => {
    try {
      const setting = await socialAmeliorationSettingApi.updateSetting(id, data);
      const updatedPensionType = mapToPensionType(setting);
      
      setPensionTypes((prev) =>
        prev.map((pensionType) => (pensionType.id === id ? updatedPensionType : pensionType))
      );
      if (selectedPensionType?.id === id) {
        setSelectedPensionType(updatedPensionType);
      }
      toast({
        title: 'Success',
        description: 'Pension type updated successfully',
      });
      return updatedPensionType;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update pension type',
      });
      throw err;
    }
  };

  const deletePensionType = async (id: string): Promise<void> => {
    try {
      await socialAmeliorationSettingApi.deleteSetting(id);
      setPensionTypes((prev) => {
        const updated = prev.filter((pensionType) => pensionType.id !== id);
        // Auto-select first remaining item if deleted item was selected
        if (selectedPensionType?.id === id) {
          setSelectedPensionType(updated.length > 0 ? updated[0] : null);
        }
        return updated;
      });
      toast({
        title: 'Success',
        description: 'Pension type deleted successfully',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete pension type',
      });
      throw err;
    }
  };

  const activatePensionType = async (id: string): Promise<PensionType> => {
    try {
      const setting = await socialAmeliorationSettingApi.activateSetting(id);
      const activatedPensionType = mapToPensionType(setting);
      setPensionTypes((prev) =>
        prev.map((pensionType) => (pensionType.id === id ? activatedPensionType : pensionType))
      );
      if (selectedPensionType?.id === id) {
        setSelectedPensionType(activatedPensionType);
      }
      toast({
        title: 'Success',
        description: 'Pension type activated successfully',
      });
      return activatedPensionType;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to activate pension type',
      });
      throw err;
    }
  };

  const deactivatePensionType = async (id: string): Promise<PensionType> => {
    try {
      const setting = await socialAmeliorationSettingApi.deactivateSetting(id);
      const deactivatedPensionType = mapToPensionType(setting);
      setPensionTypes((prev) =>
        prev.map((pensionType) => (pensionType.id === id ? deactivatedPensionType : pensionType))
      );
      if (selectedPensionType?.id === id) {
        setSelectedPensionType(deactivatedPensionType);
      }
      toast({
        title: 'Success',
        description: 'Pension type deactivated successfully',
      });
      return deactivatedPensionType;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to deactivate pension type',
      });
      throw err;
    }
  };

  // Get active pension types for dropdowns
  const activePensionTypes = pensionTypes.filter(pt => pt.isActive);

  return {
    pensionTypes: filteredPensionTypes,
    allPensionTypes: pensionTypes,
    activePensionTypes,
    selectedPensionType,
    setSelectedPensionType,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createPensionType,
    updatePensionType,
    deletePensionType,
    activatePensionType,
    deactivatePensionType,
  };
};

