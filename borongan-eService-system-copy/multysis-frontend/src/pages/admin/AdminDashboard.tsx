// React imports
import React, { useMemo } from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Custom Components
import { OverviewCards } from '@/components/admin/dashboard/OverviewCards';
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity';
import { ServicePerformance } from '@/components/admin/dashboard/ServicePerformance';
import { SubscriberAnalytics } from '@/components/admin/dashboard/SubscriberAnalytics';
import { TransactionAnalytics } from '@/components/admin/dashboard/TransactionAnalytics';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Context
import { useAuth } from '@/context/AuthContext';
import { DashboardStatisticsProvider } from '@/context/DashboardStatisticsContext';
import { useAdminNotifications } from '@/hooks/notifications/useAdminNotifications';

// Utils
import { adminMenuItems } from '@/config/admin-menu';
import { cn } from '@/lib/utils';
import { FiEdit, FiFileText, FiMessageSquare, FiUsers } from 'react-icons/fi';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { counts, isLoading } = useAdminNotifications();

  const stats = useMemo(() => {
    // ... (rest of the stats logic remains same)
    return [
      { 
        title: 'Pending Applications', 
        value: counts.pendingApplications.toLocaleString(), 
        change: counts.pendingApplications > 0 ? 'Needs attention' : 'All clear', 
        icon: <FiFileText size={24} />,
        color: counts.pendingApplications > 0 ? 'text-yellow-600' : 'text-green-600',
      },
      { 
        title: 'Pending Citizens', 
        value: counts.pendingCitizens.toLocaleString(), 
        change: counts.pendingCitizens > 0 ? 'Awaiting approval' : 'All clear', 
        icon: <FiUsers size={24} />,
        color: counts.pendingCitizens > 0 ? 'text-yellow-600' : 'text-green-600',
      },
      { 
        title: 'Update Requests', 
        value: counts.pendingUpdateRequests.toLocaleString(), 
        change: counts.pendingUpdateRequests > 0 ? 'Needs review' : 'All clear', 
        icon: <FiEdit size={24} />,
        color: counts.pendingUpdateRequests > 0 ? 'text-yellow-600' : 'text-green-600',
      },
      { 
        title: 'Unread Messages', 
        value: counts.unreadMessages.toLocaleString(), 
        change: counts.unreadMessages > 0 ? 'New messages' : 'All read', 
        icon: <FiMessageSquare size={24} />,
        color: counts.unreadMessages > 0 ? 'text-blue-600' : 'text-green-600',
      },
    ];
  }, [counts]);

  return (
    <DashboardStatisticsProvider>
      <DashboardLayout menuItems={adminMenuItems}>
        <div className={cn("space-y-6") }>
          {/* Welcome Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Welcome back, {user?.name || 'Admin'}!
              </CardTitle>
              <CardDescription>
                Here's what's happening with your platform today.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Notification Stats Grid */}
          <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4") }>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, index) => (
                <Card key={`loading-${index}`}>
                  <CardContent className="pt-6">
                    <div className={cn("flex items-center justify-between") }>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                        <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </div>
                      <div className={cn("p-3 bg-gray-100 rounded-lg animate-pulse") }>
                        <div className="w-6 h-6"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="pt-6">
                  <div className={cn("flex items-center justify-between") }>
                    <div>
                      <p className={cn("text-sm font-medium text-gray-600") }>{stat.title}</p>
                      <p className={cn("text-2xl font-bold text-gray-900 mt-2") }>{stat.value}</p>
                        <p className={cn("text-sm mt-1", stat.color)}>{stat.change}</p>
                    </div>
                    <div className={cn("p-3 bg-primary/10 rounded-lg text-primary") }>
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))
            )}
          </div>

          {/* Overview Statistics Cards */}
          <OverviewCards />

          {/* Transaction Analytics */}
          <TransactionAnalytics />

          {/* Service Performance */}
          <ServicePerformance />

          {/* Subscriber Analytics */}
          <SubscriberAnalytics />

          {/* Recent Activity */}
          <RecentActivity />
        </div>
      </DashboardLayout>
    </DashboardStatisticsProvider>
  );
};
