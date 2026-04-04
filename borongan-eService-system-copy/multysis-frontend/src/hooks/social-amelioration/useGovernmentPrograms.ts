// React imports
import { useEffect, useState } from 'react';

// Hooks
import { useToast } from '@/hooks/use-toast';
import { useGovernmentProgramSocket } from '@/hooks/useGovernmentProgramSocket';

// Services
import { governmentProgramService, type CreateGovernmentProgramInput, type GovernmentProgram, type UpdateGovernmentProgramInput } from '@/services/api/government-program.service';

// Re-export types for external use
export type { CreateGovernmentProgramInput, GovernmentProgram, UpdateGovernmentProgramInput };

export const useGovernmentPrograms = () => {
  const [governmentPrograms, setGovernmentPrograms] = useState<GovernmentProgram[]>([]);
  const [selectedGovernmentProgram, setSelectedGovernmentProgram] = useState<GovernmentProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { toast } = useToast();

  // Use socket hook for real-time updates
  const {
    newProgram,
    programUpdate,
    programDelete,
    clearNewProgram,
    clearProgramUpdate,
    clearProgramDelete,
  } = useGovernmentProgramSocket({ enabled: true });

  // Fetch government programs
  useEffect(() => {
    const fetchGovernmentPrograms = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const type = typeFilter === 'all' ? undefined : typeFilter;
        const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
        
        const programs = await governmentProgramService.getAllGovernmentPrograms(
          searchQuery || undefined,
          type,
          isActive
        );
        
        setGovernmentPrograms(programs);
        
        // Set first program as selected if available
        if (programs.length > 0 && !selectedGovernmentProgram) {
          setSelectedGovernmentProgram(programs[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch government programs');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'Failed to fetch government programs',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGovernmentPrograms();
  }, [searchQuery, typeFilter, statusFilter]);

  // Handle new program from socket
  useEffect(() => {
    if (!newProgram) return;

    const handleNewProgram = () => {
      // Add new program to the list
      setGovernmentPrograms((prev) => {
        // Check if program already exists (avoid duplicates)
        if (prev.find((p) => p.id === newProgram.id)) {
          return prev;
        }
        return [newProgram as GovernmentProgram, ...prev];
      });

      toast({
        title: 'New Government Program',
        description: `${newProgram.name} has been added.`,
      });
      clearNewProgram();
    };

    handleNewProgram();
  }, [newProgram, toast, clearNewProgram]);

  // Handle program update from socket
  useEffect(() => {
    if (!programUpdate) return;

    const handleProgramUpdate = () => {
      // Update the program in the list incrementally
      setGovernmentPrograms((prev) => {
        const index = prev.findIndex((p) => p.id === programUpdate.programId);
        if (index === -1) {
          // Program not in list, refresh to get it
          const fetchGovernmentPrograms = async () => {
            try {
              const type = typeFilter === 'all' ? undefined : typeFilter;
              const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
              const programs = await governmentProgramService.getAllGovernmentPrograms(
                searchQuery || undefined,
                type,
                isActive
              );
              setGovernmentPrograms(programs);
            } catch (err) {
              console.error('Failed to refresh programs:', err);
            }
          };
          fetchGovernmentPrograms();
          return prev;
        }

        // Update the program
        const updated = [...prev];
        if (programUpdate.name !== undefined) {
          updated[index] = { ...updated[index], name: programUpdate.name };
        }
        if (programUpdate.description !== undefined) {
          updated[index] = { ...updated[index], description: programUpdate.description };
        }
        if (programUpdate.type !== undefined) {
          updated[index] = { ...updated[index], type: programUpdate.type };
        }
        if (programUpdate.isActive !== undefined) {
          updated[index] = { ...updated[index], isActive: programUpdate.isActive };
        }

        // Update selected program if it's the one being updated
        if (selectedGovernmentProgram?.id === programUpdate.programId) {
          setSelectedGovernmentProgram(updated[index]);
        }

        return updated;
      });

      toast({
        title: 'Government Program Updated',
        description: 'Program information has been updated.',
      });
      clearProgramUpdate();
    };

    handleProgramUpdate();
  }, [programUpdate, selectedGovernmentProgram, typeFilter, statusFilter, searchQuery, toast, clearProgramUpdate]);

  // Handle program delete from socket
  useEffect(() => {
    if (!programDelete) return;

    const handleProgramDelete = () => {
      // Remove the program from the list
      setGovernmentPrograms((prev) => {
        const filtered = prev.filter((p) => p.id !== programDelete.programId);
        
        // Clear selection if deleted program was selected
        if (selectedGovernmentProgram?.id === programDelete.programId) {
          setSelectedGovernmentProgram(filtered.length > 0 ? filtered[0] : null);
        }

        return filtered;
      });

      toast({
        title: 'Government Program Deleted',
        description: 'Program has been removed.',
      });
      clearProgramDelete();
    };

    handleProgramDelete();
  }, [programDelete, selectedGovernmentProgram, toast, clearProgramDelete]);

  // Filter government programs (client-side filtering for immediate UI feedback)
  const filteredGovernmentPrograms = governmentPrograms.filter((program) => {
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (program.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = typeFilter === 'all' || program.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && program.isActive) ||
                         (statusFilter === 'inactive' && !program.isActive);
    return matchesSearch && matchesType && matchesStatus;
  });

  const createGovernmentProgram = async (data: CreateGovernmentProgramInput): Promise<GovernmentProgram> => {
    try {
      const newProgram = await governmentProgramService.createGovernmentProgram(data);
      
      setGovernmentPrograms((prev) => [newProgram, ...prev]);
      toast({
        title: 'Success',
        description: 'Government program created successfully',
      });
      return newProgram;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create government program',
      });
      throw err;
    }
  };

  const updateGovernmentProgram = async (id: string, data: UpdateGovernmentProgramInput): Promise<GovernmentProgram> => {
    try {
      const updatedProgram = await governmentProgramService.updateGovernmentProgram(id, data);
      
      setGovernmentPrograms((prev) =>
        prev.map((program) => (program.id === id ? updatedProgram : program))
      );
      if (selectedGovernmentProgram?.id === id) {
        setSelectedGovernmentProgram(updatedProgram);
      }
      toast({
        title: 'Success',
        description: 'Government program updated successfully',
      });
      return updatedProgram;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update government program',
      });
      throw err;
    }
  };

  const deleteGovernmentProgram = async (id: string): Promise<void> => {
    try {
      await governmentProgramService.deleteGovernmentProgram(id);
      
      setGovernmentPrograms((prev) => prev.filter((program) => program.id !== id));
      if (selectedGovernmentProgram?.id === id) {
        setSelectedGovernmentProgram(null);
      }
      toast({
        title: 'Success',
        description: 'Government program deleted successfully',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete government program',
      });
      throw err;
    }
  };

  const activateGovernmentProgram = async (id: string): Promise<GovernmentProgram> => {
    try {
      const activatedProgram = await governmentProgramService.activateGovernmentProgram(id);
      
      setGovernmentPrograms((prev) =>
        prev.map((program) => (program.id === id ? activatedProgram : program))
      );
      if (selectedGovernmentProgram?.id === id) {
        setSelectedGovernmentProgram(activatedProgram);
      }
      toast({
        title: 'Success',
        description: 'Government program activated successfully',
      });
      return activatedProgram;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to activate government program',
      });
      throw err;
    }
  };

  const deactivateGovernmentProgram = async (id: string): Promise<GovernmentProgram> => {
    try {
      const deactivatedProgram = await governmentProgramService.deactivateGovernmentProgram(id);
      
      setGovernmentPrograms((prev) =>
        prev.map((program) => (program.id === id ? deactivatedProgram : program))
      );
      if (selectedGovernmentProgram?.id === id) {
        setSelectedGovernmentProgram(deactivatedProgram);
      }
      toast({
        title: 'Success',
        description: 'Government program deactivated successfully',
      });
      return deactivatedProgram;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to deactivate government program',
      });
      throw err;
    }
  };

  // Get active government programs filtered by type (for use in forms)
  const getActiveProgramsByType = (type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT'): GovernmentProgram[] => {
    return governmentPrograms.filter(
      program => program.isActive && (program.type === type || program.type === 'ALL')
    );
  };

  // Get all active programs
  const activeGovernmentPrograms = governmentPrograms.filter(p => p.isActive);

  return {
    governmentPrograms: filteredGovernmentPrograms,
    allGovernmentPrograms: governmentPrograms,
    activeGovernmentPrograms,
    getActiveProgramsByType,
    selectedGovernmentProgram,
    setSelectedGovernmentProgram,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    createGovernmentProgram,
    updateGovernmentProgram,
    deleteGovernmentProgram,
    activateGovernmentProgram,
    deactivateGovernmentProgram,
  };
};

