// React imports
import React, { useMemo } from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent } from '@/components/ui/card';

// Hooks
import { useDashboardStatistics } from '@/hooks/admin/useDashboardStatistics';

// Utils
import { cn } from '@/lib/utils';
import { FiFileText, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { LuPhilippinePeso } from 'react-icons/lu';

export const OverviewCards: React.FC = () => {
  const { statistics, isLoading } = useDashboardStatistics();

  const stats = useMemo(() => {
    if (!statistics) {
      return [];
    }

    return [
      {
        title: 'Total Transactions',
        value: statistics.totalTransactions.toLocaleString(),
        subtitle: `${statistics.totalTransactionsThisMonth.toLocaleString()} this month`,
        icon: <FiFileText size={24} />,
        iconColor: 'bg-blue-100 text-blue-600',
      },
      {
        title: 'Total Revenue',
        value: `₱${statistics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        subtitle: `₱${statistics.totalRevenueThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} this month`,
        icon: <LuPhilippinePeso size={24} />,
        iconColor: 'bg-green-100 text-green-600',
      },
      {
        title: 'Total Residents',
        value: (statistics.totalResidents ?? statistics.totalSubscribers ?? 0).toLocaleString(),
        subtitle: 'Registered residents',
        icon: <FiUsers size={24} />,
        iconColor: 'bg-purple-100 text-purple-600',
      },
      {
        title: 'Active Services',
        value: statistics.activeServicesCount.toLocaleString(),
        subtitle: 'Services available',
        icon: <FiTrendingUp size={24} />,
        iconColor: 'bg-orange-100 text-orange-600',
      },
      {
        title: 'Total Beneficiaries',
        value: (
          statistics.beneficiaryCounts.seniorCitizens +
          statistics.beneficiaryCounts.pwd +
          statistics.beneficiaryCounts.students +
          statistics.beneficiaryCounts.soloParents
        ).toLocaleString(),
        subtitle: `${statistics.beneficiaryCounts.seniorCitizens} seniors, ${statistics.beneficiaryCounts.pwd} PWD, ${statistics.beneficiaryCounts.students} students, ${statistics.beneficiaryCounts.soloParents} solo parents`,
        icon: <FiUsers size={24} />,
        iconColor: 'bg-pink-100 text-pink-600',
      },
    ];
  }, [statistics]);

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4')}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={`loading-${index}`}>
            <CardContent className="pt-6">
              <div className={cn('flex items-center justify-between')}>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                </div>
                <div className={cn('p-3 bg-gray-100 rounded-lg animate-pulse')}>
                  <div className="w-6 h-6"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4')}>
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="pt-6">
            <div className={cn('flex items-center justify-between')}>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium text-gray-600')}>{stat.title}</p>
                <p className={cn('text-2xl font-bold text-gray-900 mt-2')}>{stat.value}</p>
                <p className={cn('text-xs text-gray-500 mt-1 truncate')}>{stat.subtitle}</p>
              </div>
              <div className={cn('p-3 rounded-lg flex-shrink-0 ml-2', stat.iconColor)}>
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

