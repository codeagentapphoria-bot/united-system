import api from './auth.service';

export interface DashboardStatistics {
  // Overview
  totalTransactions: number;
  totalTransactionsThisMonth: number;
  totalRevenue: number;
  totalRevenueThisMonth: number;
  totalSubscribers: number;
  totalResidents: number;
  activeServicesCount: number;
  
  // Transaction breakdowns
  transactionsByStatus: Record<string, number>;
  transactionsByPaymentStatus: Record<string, number>;
  transactionsByService: Array<{ serviceCode: string; serviceName: string; count: number; revenue: number }>;
  
  // Trends
  transactionTrends: Array<{ date: string; count: number; revenue: number }>;
  subscriberGrowthTrends: Array<{ date: string; active: number; pending: number }>;
  
  // Citizen status
  citizensByStatus: Record<string, number>;
  
  // Recent activity
  recentTransactions: Array<{
    id: string;
    transactionId: string;
    serviceName: string;
    serviceCode: string;
    residentName: string;
    paymentStatus: string;
    status: string | null;
    paymentAmount: number;
    createdAt: string;
  }>;
  recentCitizens: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    residencyStatus: string;
    createdAt: string;
  }>;
  
  // Social Amelioration
  beneficiaryCounts: {
    seniorCitizens: number;
    pwd: number;
    students: number;
    soloParents: number;
  };
}

export const dashboardService = {
  async getDashboardStatistics(signal?: AbortSignal): Promise<DashboardStatistics> {
    const response = await api.get('/admin/dashboard/statistics', { signal });
    return response.data.data;
  },
};

