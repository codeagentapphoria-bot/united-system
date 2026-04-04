// React imports
import { useEffect, useState } from 'react';

// Hooks
import { useRoles } from '@/hooks/roles/useRoles';

// Services
import { userService } from '@/services/api/user.service';

// Types
import type { AdminUser, CreateAdminUserInput, UpdateAdminUserInput } from '@/types/user';

export const useUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const { roles } = useRoles(); // Keep using useRoles hook (roles integration is separate)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const fetchedUsers = await userService.getAllUsers();
        setUsers(fetchedUsers);
        if (fetchedUsers.length > 0 && !selectedUser) {
          setSelectedUser(fetchedUsers[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createUser = async (data: CreateAdminUserInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newUser = await userService.createUser(data);
      setUsers(prev => [...prev, newUser]);
      setSelectedUser(newUser);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create user';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (id: string, data: UpdateAdminUserInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedUser = await userService.updateUser(id, data);
      setUsers(prev => prev.map(user => (user.id === id ? updatedUser : user)));
      
      // Update selected user if it's the one being updated
      if (selectedUser?.id === id) {
        setSelectedUser(updatedUser);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update user';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await userService.deleteUser(id);
      setUsers(prev => {
        const updated = prev.filter(user => user.id !== id);
        
        // Clear selected user if it's the one being deleted
        if (selectedUser?.id === id) {
          setSelectedUser(updated.length > 0 ? updated[0] : null);
        }
        
        return updated;
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete user';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (id: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await userService.changePassword(id, password);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to change password';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedUsers = await userService.getAllUsers();
      setUsers(fetchedUsers);
      // Update selected user if it still exists in the refreshed list
      if (selectedUser) {
        const updatedSelectedUser = fetchedUsers.find(u => u.id === selectedUser.id);
        if (updatedSelectedUser) {
          setSelectedUser(updatedSelectedUser);
        } else if (fetchedUsers.length > 0) {
          setSelectedUser(fetchedUsers[0]);
        } else {
          setSelectedUser(null);
        }
      } else if (fetchedUsers.length > 0) {
        setSelectedUser(fetchedUsers[0]);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to refresh users';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);

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

  return {
    users,
    selectedUser,
    setSelectedUser,
    roles,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    refreshUsers,
    // Pagination
    paginatedUsers,
    currentPage,
    totalPages,
    itemsPerPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
  };
};

