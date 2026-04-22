import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { libreSakayService } from '@/services/api/libre-sakay.service';
import { portalProgramsService } from '@/services/api/portal-programs.service';
import { DONUT_COLORS } from './shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { FiTruck, FiGitBranch, FiUsers, FiActivity, FiUserCheck } from 'react-icons/fi';
import { cn } from '@/lib/utils';

// =============================================================================
// STAT CARD
// =============================================================================

function StatCard({
  title,
  value,
  icon,
  color,
  loading,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'violet' | 'orange';
  loading?: boolean;
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  };
  const { bg, text } = colorMap[color];
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
            {loading ? (
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-3xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div className={`p-3 ${bg} rounded-lg ${text}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// DASHBOARD SECTION
// =============================================================================

const APP_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
};

export function DashboardSection() {
  const { data: dashStats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.libreSakay.dashboardStats,
    queryFn: libreSakayService.getDashboardStats,
    retry: false,
  });

  const { data: fleetStats } = useQuery({
    queryKey: queryKeys.libreSakay.fleet,
    queryFn: libreSakayService.getFleetStats,
    refetchInterval: 30_000,
  });

  const { data: trend } = useQuery({
    queryKey: queryKeys.libreSakay.ridesTrend(7),
    queryFn: () => libreSakayService.getRidesTrend(7),
    retry: false,
  });

  const { data: pendingData } = useQuery({
    queryKey: ['libre-sakay', 'pending-apps'],
    queryFn: () =>
      portalProgramsService.listApplicationsAdmin({
        status: 'pending',
        programId: 'gp-all-libre-sakay',
        limit: 1,
      }),
    retry: false,
  });

  const { data: recentApps, isLoading: recentLoading } = useQuery({
    queryKey: ['libre-sakay', 'recent-apps'],
    queryFn: () =>
      portalProgramsService.listApplicationsAdmin({
        programId: 'gp-all-libre-sakay',
        limit: 5,
      }),
    retry: false,
  });

  const fleetDonutData = fleetStats
    ? [
        { name: 'Moving', value: fleetStats.moving },
        { name: 'Parked', value: fleetStats.parked },
      ]
    : [];

  const trendData = (trend ?? []).map(p => ({
    ...p,
    label: new Date(p.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }),
  }));

  return (
    <div className="space-y-6">
      {/* Row 1: 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Buses"
          value={dashStats?.total_buses ?? fleetStats?.total ?? '-'}
          icon={<FiTruck size={20} />}
          color="blue"
          loading={statsLoading}
        />
        <StatCard
          title="Active Routes"
          value={dashStats?.active_routes ?? '-'}
          icon={<FiGitBranch size={20} />}
          color="green"
          loading={statsLoading}
        />
        <StatCard
          title="Enrolled Drivers"
          value={dashStats?.total_drivers ?? '-'}
          icon={<FiUsers size={20} />}
          color="violet"
          loading={statsLoading}
        />
        <StatCard
          title="Rides Today"
          value={dashStats?.rides_today ?? '-'}
          icon={<FiActivity size={20} />}
          color="orange"
          loading={statsLoading}
        />
        <StatCard
          title="Pending Applications"
          value={pendingData?.pagination.total ?? 0}
          icon={<FiUserCheck size={20} />}
          color="violet"
        />
      </div>

      {/* Row 2: Fleet donut + 7-day bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Live Fleet Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full">
              {(fleetStats?.moving ?? 0) + (fleetStats?.parked ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fleetDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {fleetDonutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: number, name: string) => [`${v} buses`, name]} />
                    <Legend iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No active buses in fleet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Rides — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [v, name === 'rides' ? 'Rides' : 'Passengers']}
                    />
                    <Bar dataKey="rides" fill="#3b82f6" radius={[3, 3, 0, 0]} name="rides" />
                    <Bar dataKey="passengers" fill="#10b981" radius={[3, 3, 0, 0]} name="passengers" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No ride data yet — logs will appear here
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Weekly summary mini cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rides This Week</p>
            <p className="text-2xl font-bold mt-1">{dashStats?.rides_this_week ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Passengers This Week</p>
            <p className="text-2xl font-bold mt-1">{dashStats?.passengers_this_week ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Passengers / Ride</p>
            <p className="text-2xl font-bold mt-1">
              {dashStats?.avg_passengers_per_ride != null ? dashStats.avg_passengers_per_ride.toFixed(1) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Recent Applications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
            <a
              href="/admin/libre-sakay/applications"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All →
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : recentApps?.data.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No applications yet</div>
          ) : (
            <div className="space-y-2">
              {recentApps?.data.map(app => {
                const fullName = [app.resident.firstName, app.resident.middleName, app.resident.lastName]
                  .filter(Boolean)
                  .join(' ');
                const statusConf =
                  APP_STATUS_CONFIG[app.status] ?? { label: app.status, className: 'bg-gray-100 text-gray-600' };
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-heading-700 truncate">{fullName}</p>
                      <p className="text-xs text-gray-500">{app.program.name}</p>
                    </div>
                    <Badge className={cn('text-xs shrink-0', statusConf.className)}>
                      {statusConf.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
