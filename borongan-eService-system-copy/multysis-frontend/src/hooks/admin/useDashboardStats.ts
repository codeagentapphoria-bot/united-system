import { useCallback, useEffect, useState } from 'react';
import { userService } from '@/services/api/user.service';

export interface SystemAdmin {
  id: string;
  name: string;
  email: string;
}

export interface RoleWithAdmins {
  id: string;
  name: string;
  description: string | null;
  adminCount: number;
  admins: SystemAdmin[];
}

export interface SystemWithAdmins {
  name: string;
  roles: RoleWithAdmins[];
}

export interface EserviceUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  roles: string[];
}

export interface SuperAdminDashboard {
  systems: SystemWithAdmins[];
  eserviceUsers: EserviceUserRow[];
  totalSystems: number;
  totalEserviceUsers: number;
}

interface UseSuperAdminDashboardReturn {
  data: SuperAdminDashboard | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSuperAdminDashboard = (): UseSuperAdminDashboardReturn => {
  const [data, setData] = useState<SuperAdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await userService.getDashboardStats();
      setData(result as unknown as SuperAdminDashboard);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refetch: fetch };
};
