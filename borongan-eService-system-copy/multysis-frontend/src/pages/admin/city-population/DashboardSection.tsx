/**
 * DashboardSection.tsx
 *
 * City Population overview — stat cards + resident trends + recent activity.
 * No DashboardLayout wrapper — parent AdminCityPopulation provides it.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardService } from '@/services/api/dashboard.service';
import { residentService } from '@/services/api/resident.service';
import { formatDateWithoutTimezone } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { FiUsers, FiUserCheck, FiUserPlus, FiActivity } from 'react-icons/fi';

// ── Stat Card ─────────────────────────────────────────────────────────────────
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

// ── Dashboard Section ─────────────────────────────────────────────────────────

export function DashboardSection() {
  // Total residents from the shared dashboard stats
  const { data: dashStats, isLoading: dashLoading } = useQuery({
    queryKey: ['city-pop', 'dashboard-stats'],
    queryFn: dashboardService.getDashboardStatistics,
    retry: false,
  });

  // Active residents (status = active)
  const { data: activeData } = useQuery({
    queryKey: ['city-pop', 'active-residents', 1],
    queryFn: () => residentService.listResidents({ status: 'active', limit: 1 }),
    retry: false,
  });

  // Pending registrations (status = pending)
  const { data: pendingData } = useQuery({
    queryKey: ['city-pop', 'pending-residents', 1],
    queryFn: () => residentService.listResidents({ status: 'pending', limit: 1 }),
    retry: false,
  });

  // Recent registrations (last 7)
  const { data: recentData } = useQuery({
    queryKey: ['city-pop', 'recent-residents'],
    queryFn: () => residentService.listResidents({ limit: 7 }),
    retry: false,
  });

  const recentResidents = recentData?.residents ?? [];

  // Build subscriber growth trend chart data
  const growthData = dashStats?.subscriberGrowthTrends?.slice(-7).map(p => ({
    ...p,
    label: new Date(p.date).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    }),
  })) ?? [];

  // Residents by status chart data
  const statusData = dashStats?.citizensByStatus
    ? Object.entries(dashStats.citizensByStatus).map(([status, count]) => ({
        status: status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        count,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Row 1: 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Residents"
          value={dashStats?.totalResidents ?? '-'}
          icon={<FiUsers size={20} />}
          color="blue"
          loading={dashLoading}
        />
        <StatCard
          title="Active"
          value={activeData?.pagination.total ?? 0}
          icon={<FiUserCheck size={20} />}
          color="green"
        />
        <StatCard
          title="Pending"
          value={pendingData?.pagination.total ?? 0}
          icon={<FiActivity size={20} />}
          color="orange"
        />
        <StatCard
          title="New (This Month)"
          value={dashStats?.totalResidents
            ? (() => {
                // Approximate: total - last month total from growth trends
                const trends = dashStats?.subscriberGrowthTrends ?? [];
                if (trends.length < 2) return trends.length === 1 ? trends[0].active : 0;
                const last = trends[trends.length - 1]?.active ?? 0;
                const prev = trends[trends.length - 2]?.active ?? last;
                return Math.max(0, last - prev);
              })()
            : '-'}
          icon={<FiUserPlus size={20} />}
          color="violet"
          loading={dashLoading}
        />
      </div>

      {/* Row 2: Growth trend + Status breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Subscriber Growth Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Resident Growth — Last 7 Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full">
              {growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip formatter={(v: number) => [v, 'Active']} />
                    <Line
                      type="monotone"
                      dataKey="active"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Active"
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Pending"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No growth data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Residents by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Resident Count by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52 w-full">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip formatter={(v: number) => [v, 'Count']} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  No status data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recent Registrations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          {recentResidents.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No residents registered yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Resident ID</th>
                    <th className="pb-2 font-medium">Sex</th>
                    <th className="pb-2 font-medium">Barangay</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentResidents.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-2.5 font-medium text-heading-700">
                        {[r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ')}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-gray-500">
                        {r.residentId ?? '—'}
                      </td>
                      <td className="py-2.5 text-gray-600">{r.sex ?? '—'}</td>
                      <td className="py-2.5 text-gray-600">{r.barangay?.name ?? '—'}</td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : r.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : r.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {r.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs">
                        {r.createdAt ? formatDateWithoutTimezone(r.createdAt) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
