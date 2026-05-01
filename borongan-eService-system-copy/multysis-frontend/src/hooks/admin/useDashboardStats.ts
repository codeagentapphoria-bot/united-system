import { useCallback, useEffect, useState } from 'react';
import { userService } from '@/services/api/user.service';

interface UseDashboardStatsReturn {
  stats: { totalUsers: number; totalAdmins: number } | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDashboardStats = (): UseDashboardStatsReturn => {
  const [stats, setStats] = useState<{ totalUsers: number; totalAdmins: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await userService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
};
