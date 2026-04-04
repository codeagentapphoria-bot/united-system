// React imports
import { useEffect, useState } from 'react';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Services
import { socialAmeliorationSettingApi, type SocialAmeliorationSetting } from '@/services/api/social-amelioration-setting.service';

// Types
export interface SoloParentCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSoloParentCategoryInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateSoloParentCategoryInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// Helper to convert API response to SoloParentCategory
const mapToSoloParentCategory = (setting: SocialAmeliorationSetting): SoloParentCategory => ({
  id: setting.id,
  name: setting.name,
  description: setting.description,
  isActive: setting.isActive,
  createdAt: setting.createdAt,
  updatedAt: setting.updatedAt,
});

// Legacy mock data removed - unused
export const useSoloParentCategories = () => {
  const [soloParentCategories, setSoloParentCategories] = useState<SoloParentCategory[]>([]);
  const [selectedSoloParentCategory, setSelectedSoloParentCategory] = useState<SoloParentCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { toast } = useToast();

  // Fetch solo parent categories
  useEffect(() => {
    const fetchSoloParentCategories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const settings = await socialAmeliorationSettingApi.getSettings({
          type: 'SOLO_PARENT_CATEGORY',
        });
        const mappedCategories = settings.map(mapToSoloParentCategory);
        setSoloParentCategories(mappedCategories);
        
        // Auto-select first category if available and none is selected
        setSelectedSoloParentCategory((prev) => {
          if (prev && mappedCategories.find(cat => cat.id === prev.id)) {
            return prev; // Keep current selection if it still exists
          }
          return mappedCategories.length > 0 ? mappedCategories[0] : null;
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch solo parent categories');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'Failed to fetch solo parent categories',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSoloParentCategories();
  }, [toast]);

  // Filter solo parent categories
  const filteredSoloParentCategories = soloParentCategories.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = statusFilter === 'all' || 
                         (statusFilter === 'active' && category.isActive) ||
                         (statusFilter === 'inactive' && !category.isActive);
    return matchesSearch && matchesFilter;
  });

  const createSoloParentCategory = async (data: CreateSoloParentCategoryInput): Promise<SoloParentCategory> => {
    try {
      const setting = await socialAmeliorationSettingApi.createSetting({
        type: 'SOLO_PARENT_CATEGORY',
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
      });
      const newCategory = mapToSoloParentCategory(setting);
      
      setSoloParentCategories((prev) => [newCategory, ...prev]);
      toast({
        title: 'Success',
        description: 'Solo parent category created successfully',
      });
      return newCategory;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create solo parent category',
      });
      throw err;
    }
  };

  const updateSoloParentCategory = async (id: string, data: UpdateSoloParentCategoryInput): Promise<SoloParentCategory> => {
    try {
      const setting = await socialAmeliorationSettingApi.updateSetting(id, data);
      const updatedCategory = mapToSoloParentCategory(setting);
      
      setSoloParentCategories((prev) =>
        prev.map((category) => (category.id === id ? updatedCategory : category))
      );
      if (selectedSoloParentCategory?.id === id) {
        setSelectedSoloParentCategory(updatedCategory);
      }
      toast({
        title: 'Success',
        description: 'Solo parent category updated successfully',
      });
      return updatedCategory;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update solo parent category',
      });
      throw err;
    }
  };

  const deleteSoloParentCategory = async (id: string): Promise<void> => {
    try {
      await socialAmeliorationSettingApi.deleteSetting(id);
      setSoloParentCategories((prev) => {
        const updated = prev.filter((category) => category.id !== id);
        // Auto-select first remaining item if deleted item was selected
        if (selectedSoloParentCategory?.id === id) {
          setSelectedSoloParentCategory(updated.length > 0 ? updated[0] : null);
        }
        return updated;
      });
      toast({
        title: 'Success',
        description: 'Solo parent category deleted successfully',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete solo parent category',
      });
      throw err;
    }
  };

  const activateSoloParentCategory = async (id: string): Promise<SoloParentCategory> => {
    try {
      const setting = await socialAmeliorationSettingApi.activateSetting(id);
      const activatedCategory = mapToSoloParentCategory(setting);
      setSoloParentCategories((prev) =>
        prev.map((category) => (category.id === id ? activatedCategory : category))
      );
      if (selectedSoloParentCategory?.id === id) {
        setSelectedSoloParentCategory(activatedCategory);
      }
      toast({
        title: 'Success',
        description: 'Solo parent category activated successfully',
      });
      return activatedCategory;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to activate solo parent category',
      });
      throw err;
    }
  };

  const deactivateSoloParentCategory = async (id: string): Promise<SoloParentCategory> => {
    try {
      const setting = await socialAmeliorationSettingApi.deactivateSetting(id);
      const deactivatedCategory = mapToSoloParentCategory(setting);
      setSoloParentCategories((prev) =>
        prev.map((category) => (category.id === id ? deactivatedCategory : category))
      );
      if (selectedSoloParentCategory?.id === id) {
        setSelectedSoloParentCategory(deactivatedCategory);
      }
      toast({
        title: 'Success',
        description: 'Solo parent category deactivated successfully',
      });
      return deactivatedCategory;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to deactivate solo parent category',
      });
      throw err;
    }
  };

  // Get active categories for dropdowns
  const activeSoloParentCategories = soloParentCategories.filter(cat => cat.isActive);

  return {
    soloParentCategories: filteredSoloParentCategories,
    allSoloParentCategories: soloParentCategories,
    activeSoloParentCategories,
    selectedSoloParentCategory,
    setSelectedSoloParentCategory,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createSoloParentCategory,
    updateSoloParentCategory,
    deleteSoloParentCategory,
    activateSoloParentCategory,
    deactivateSoloParentCategory,
  };
};

