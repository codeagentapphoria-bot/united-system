import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessControlGate } from '@/components/common/AccessControlGate';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useAllowedPages } from '@/context/AllowedPagesContext';
import { useDashboardStats } from '@/hooks/admin/useDashboardStats';
import { cn } from '@/lib/utils';
import {
  FiUsers,
  FiShield,
  FiGrid,
  FiKey,
  FiCheckCircle,
} from 'react-icons/fi';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { allowedPaths } = useAllowedPages();
  const { stats, isLoading: statsLoading } = useDashboardStats();

  const systems = React.useMemo(() => {
    const uniqueSystems = new Set<string>();
    allowedPaths.forEach((path) => {
      const match = path.match(/^\/admin\/([^/]+)\//);
      if (match) uniqueSystems.add(match[1]);
    });
    return uniqueSystems;
  }, [allowedPaths]);

  const today = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <DashboardLayout>
      <AccessControlGate pagePath="/admin/dashboard">
        <div className="space-y-5">

          {/* Page header — name + date */}
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-semibold text-heading-700">
              {user?.name || 'Administrator'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{today}</p>
          </div>

          {/* Condensed metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricBox
              label="Systems accessible"
              value={systems.size}
              icon={<FiGrid size={18} />}
              loading={statsLoading}
            />
            <MetricBox
              label="Pages accessible"
              value={allowedPaths.size}
              icon={<FiKey size={18} />}
              loading={statsLoading}
            />
            <MetricBox
              label="Registered residents"
              value={stats?.totalUsers ?? 0}
              icon={<FiUsers size={18} />}
              loading={statsLoading}
            />
            <MetricBox
              label="Admin accounts"
              value={stats?.totalAdmins ?? 0}
              icon={<FiShield size={18} />}
              loading={statsLoading}
            />
          </div>

          {/* Two-column info section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Accessible systems */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-heading-700 flex items-center gap-2">
                  <FiGrid size={16} className="text-primary-600" />
                  Systems in your access profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <SystemLoadingSkeleton />
                ) : systems.size === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2">
                    No systems assigned yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {Array.from(systems).map((sys) => (
                      <li key={sys} className="flex items-center gap-2 text-sm">
                        <FiCheckCircle
                          size={14}
                          className="text-success-600 flex-shrink-0"
                        />
                        <span className="text-gray-700 capitalize">
                          {sys.replace(/-/g, '\u2014')}
                        </span>
                        <span className="text-gray-400 text-xs ml-auto">
                          /admin/{sys}/*
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Quick reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-heading-700 flex items-center gap-2">
                  <FiShield size={16} className="text-primary-600" />
                  Access control reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span>Total accessible paths</span>
                    <span className="font-semibold text-heading-700">
                      {statsLoading ? '—' : allowedPaths.size}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span>Distinct systems</span>
                    <span className="font-semibold text-heading-700">
                      {statsLoading ? '—' : systems.size}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span>Resident accounts</span>
                    <span className="font-semibold text-heading-700">
                      {statsLoading ? '—' : (stats?.totalUsers ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span>Admin accounts</span>
                    <span className="font-semibold text-heading-700">
                      {statsLoading ? '—' : (stats?.totalAdmins ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AccessControlGate>
    </DashboardLayout>
  );
};

function MetricBox({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {label}
            </p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              loading ? "text-gray-300" : "text-heading-800"
            )}>
              {loading ? '—' : value.toLocaleString()}
            </p>
          </div>
          <div className={cn(
            "p-2 rounded-md mt-0.5",
            loading ? "bg-gray-100" : "bg-primary-50 text-primary-600"
          )}>
            {loading ? (
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            ) : (
              icon
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemLoadingSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-3.5 bg-gray-200 rounded animate-pulse flex-1" />
        </li>
      ))}
    </ul>
  );
}
