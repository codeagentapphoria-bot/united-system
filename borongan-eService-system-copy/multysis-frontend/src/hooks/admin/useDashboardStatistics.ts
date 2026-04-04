import { useDashboardStatisticsContext } from '@/context/DashboardStatisticsContext';
import type { DashboardStatistics } from '@/services/api/dashboard.service';

interface UseDashboardStatisticsOptions {
  autoFetch?: boolean; // Kept for backward compatibility but functionality is now in Provider
}

interface UseDashboardStatisticsReturn {
  statistics: DashboardStatistics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDashboardStatistics = (
  _options: UseDashboardStatisticsOptions = {}
): UseDashboardStatisticsReturn => {
  return useDashboardStatisticsContext();
};

