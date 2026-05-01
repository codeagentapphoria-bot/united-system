// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Access Control
import { AccessControlGate } from '@/components/common/AccessControlGate';

// Layout
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Context
import { useAuth } from '@/context/AuthContext';
import { useAllowedPages } from '@/context/AllowedPagesContext';

// Hooks
import { useDashboardStats } from '@/hooks/admin/useDashboardStats';

// Utils
import { cn } from '@/lib/utils';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { allowedPaths } = useAllowedPages();
  const { stats, isLoading: statsLoading } = useDashboardStats();

  // Derive unique systems from allowedPaths
  // Paths look like /admin/city-population/dashboard, /admin/e-government/reports, etc.
  // Extract the system prefix: /admin/{system}/
  const systems = React.useMemo(() => {
    const uniqueSystems = new Set<string>();
    allowedPaths.forEach((path) => {
      // Match /admin/{system}/
      const match = path.match(/^\/admin\/([^/]+)\//);
      if (match) {
        uniqueSystems.add(match[1]);
      }
    });
    return uniqueSystems;
  }, [allowedPaths]);

  const statCards = [
    {
      title: 'Accessible Systems',
      value: systems.size.toLocaleString(),
      subtitle: 'Systems you have access to',
      icon: '🏛️',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Accessible Pages',
      value: allowedPaths.size.toLocaleString(),
      subtitle: 'Pages in your access control',
      icon: '📄',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Total Users',
      value: statsLoading ? '—' : (stats?.totalUsers ?? 0).toLocaleString(),
      subtitle: 'All registered users',
      icon: '👥',
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Total Admins',
      value: statsLoading ? '—' : (stats?.totalAdmins ?? 0).toLocaleString(),
      subtitle: 'Admin accounts',
      icon: '🛡️',
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <DashboardLayout>
      <AccessControlGate pagePath="/admin/dashboard">
        <div className={cn("space-y-6")}>
          {/* Welcome Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Welcome back, {user?.name || 'Admin'}!
              </CardTitle>
              <CardDescription>
                Here is your access control overview.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Access Control Stats Grid */}
          <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4")}>
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Card key={`loading-${index}`}>
                  <CardContent className="pt-6">
                    <div className={cn("flex items-center justify-between")}>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-28 mb-2 animate-pulse"></div>
                        <div className="h-8 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                      </div>
                      <div className={cn("p-3 bg-gray-100 rounded-lg animate-pulse")}>
                        <div className="w-6 h-6"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="pt-6">
                    <div className={cn("flex items-center justify-between")}>
                      <div>
                        <p className={cn("text-sm font-medium text-gray-600")}>{stat.title}</p>
                        <p className={cn("text-2xl font-bold text-gray-900 mt-2")}>{stat.value}</p>
                        <p className={cn("text-sm mt-1 text-gray-500")}>{stat.subtitle}</p>
                      </div>
                      <div className={cn("p-3 rounded-lg flex-shrink-0 ml-2", stat.color)}>
                        <span className="text-xl">{stat.icon}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </AccessControlGate>
    </DashboardLayout>
  );
};
