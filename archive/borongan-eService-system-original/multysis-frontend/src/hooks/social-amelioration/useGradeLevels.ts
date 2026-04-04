// React imports
import { useState, useEffect } from 'react';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Services
import { socialAmeliorationSettingApi, type SocialAmeliorationSetting } from '@/services/api/social-amelioration-setting.service';

// Types
export interface GradeLevel {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeLevelInput {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateGradeLevelInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// Helper to convert API response to GradeLevel
const mapToGradeLevel = (setting: SocialAmeliorationSetting): GradeLevel => ({
  id: setting.id,
  name: setting.name,
  description: setting.description,
  isActive: setting.isActive,
  createdAt: setting.createdAt,
  updatedAt: setting.updatedAt,
});

// Legacy mock data removed - unused
export const useGradeLevels = () => {
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<GradeLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { toast } = useToast();

  // Fetch grade levels
  useEffect(() => {
    const fetchGradeLevels = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const settings = await socialAmeliorationSettingApi.getSettings({
          type: 'GRADE_LEVEL',
        });
        const mappedLevels = settings.map(mapToGradeLevel);
        setGradeLevels(mappedLevels);
        
        // Auto-select first grade level if available and none is selected
        setSelectedGradeLevel((prev) => {
          if (prev && mappedLevels.find(gl => gl.id === prev.id)) {
            return prev; // Keep current selection if it still exists
          }
          return mappedLevels.length > 0 ? mappedLevels[0] : null;
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch grade levels');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'Failed to fetch grade levels',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGradeLevels();
  }, [toast]);

  // Filter grade levels
  const filteredGradeLevels = gradeLevels.filter((gradeLevel) => {
    const matchesSearch = gradeLevel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (gradeLevel.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesFilter = statusFilter === 'all' || 
                         (statusFilter === 'active' && gradeLevel.isActive) ||
                         (statusFilter === 'inactive' && !gradeLevel.isActive);
    return matchesSearch && matchesFilter;
  });

  const createGradeLevel = async (data: CreateGradeLevelInput): Promise<GradeLevel> => {
    try {
      const setting = await socialAmeliorationSettingApi.createSetting({
        type: 'GRADE_LEVEL',
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
      });
      const newGradeLevel = mapToGradeLevel(setting);
      
      setGradeLevels((prev) => [newGradeLevel, ...prev]);
      toast({
        title: 'Success',
        description: 'Grade level created successfully',
      });
      return newGradeLevel;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create grade level',
      });
      throw err;
    }
  };

  const updateGradeLevel = async (id: string, data: UpdateGradeLevelInput): Promise<GradeLevel> => {
    try {
      const setting = await socialAmeliorationSettingApi.updateSetting(id, data);
      const updatedGradeLevel = mapToGradeLevel(setting);
      
      setGradeLevels((prev) =>
        prev.map((gradeLevel) => (gradeLevel.id === id ? updatedGradeLevel : gradeLevel))
      );
      if (selectedGradeLevel?.id === id) {
        setSelectedGradeLevel(updatedGradeLevel);
      }
      toast({
        title: 'Success',
        description: 'Grade level updated successfully',
      });
      return updatedGradeLevel;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update grade level',
      });
      throw err;
    }
  };

  const deleteGradeLevel = async (id: string): Promise<void> => {
    try {
      await socialAmeliorationSettingApi.deleteSetting(id);
      setGradeLevels((prev) => {
        const updated = prev.filter((gradeLevel) => gradeLevel.id !== id);
        // Auto-select first remaining item if deleted item was selected
        if (selectedGradeLevel?.id === id) {
          setSelectedGradeLevel(updated.length > 0 ? updated[0] : null);
        }
        return updated;
      });
      toast({
        title: 'Success',
        description: 'Grade level deleted successfully',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete grade level',
      });
      throw err;
    }
  };

  const activateGradeLevel = async (id: string): Promise<GradeLevel> => {
    try {
      const setting = await socialAmeliorationSettingApi.activateSetting(id);
      const activatedGradeLevel = mapToGradeLevel(setting);
      setGradeLevels((prev) =>
        prev.map((gradeLevel) => (gradeLevel.id === id ? activatedGradeLevel : gradeLevel))
      );
      if (selectedGradeLevel?.id === id) {
        setSelectedGradeLevel(activatedGradeLevel);
      }
      toast({
        title: 'Success',
        description: 'Grade level activated successfully',
      });
      return activatedGradeLevel;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to activate grade level',
      });
      throw err;
    }
  };

  const deactivateGradeLevel = async (id: string): Promise<GradeLevel> => {
    try {
      const setting = await socialAmeliorationSettingApi.deactivateSetting(id);
      const deactivatedGradeLevel = mapToGradeLevel(setting);
      setGradeLevels((prev) =>
        prev.map((gradeLevel) => (gradeLevel.id === id ? deactivatedGradeLevel : gradeLevel))
      );
      if (selectedGradeLevel?.id === id) {
        setSelectedGradeLevel(deactivatedGradeLevel);
      }
      toast({
        title: 'Success',
        description: 'Grade level deactivated successfully',
      });
      return deactivatedGradeLevel;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to deactivate grade level',
      });
      throw err;
    }
  };

  // Get active grade levels for dropdowns
  const activeGradeLevels = gradeLevels.filter(gl => gl.isActive);

  return {
    gradeLevels: filteredGradeLevels,
    allGradeLevels: gradeLevels,
    activeGradeLevels,
    selectedGradeLevel,
    setSelectedGradeLevel,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createGradeLevel,
    updateGradeLevel,
    deleteGradeLevel,
    activateGradeLevel,
    deactivateGradeLevel,
  };
};

