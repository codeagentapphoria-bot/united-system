import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccessControlGate } from '@/components/common/AccessControlGate';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useSuperAdminDashboard } from '@/hooks/admin/useDashboardStats';
import { cn } from '@/lib/utils';
import { FiServer, FiUsers, FiChevronRight } from 'react-icons/fi';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading } = useSuperAdminDashboard();

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

          {/* Page header */}
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-semibold text-heading-700">
              {user?.name || 'Administrator'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{today}</p>
          </div>

          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              label="Systems"
              value={data?.totalSystems ?? 0}
              icon={<FiServer size={18} />}
              loading={isLoading}
            />
            <SummaryCard
              label="E-Service Users"
              value={data?.totalEserviceUsers ?? 0}
              icon={<FiUsers size={18} />}
              loading={isLoading}
            />
          </div>

          {/* Systems & Roles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-heading-700 flex items-center gap-2">
                <FiServer size={16} className="text-primary-600" />
                Systems and Assigned Administrators
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SystemLoadingSkeleton />
              ) : !data?.systems?.length ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">
                  No systems configured yet.
                </p>
              ) : (
                <div className="space-y-5">
                  {data.systems.map((sys) => (
                    <div key={sys.name}>
                      {/* System header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-heading-700 capitalize">
                          {sys.name.replace(/-/g, '\u2014')}
                        </span>
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                          {sys.roles.length} role{sys.roles.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Roles and their admins */}
                      <div className="space-y-2 pl-1">
                        {sys.roles.map((role) => (
                          <div
                            key={role.id}
                            className="flex items-start gap-3 text-sm"
                          >
                            <FiChevronRight
                              size={14}
                              className="mt-0.5 text-gray-400 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-700">
                                  {role.name}
                                </span>
                                {role.description && (
                                  <span className="text-xs text-gray-400">
                                    — {role.description}
                                  </span>
                                )}
                                  <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                                  {role.adminCount} admin{role.adminCount !== 1 ? 's' : ''}
                                </span>
                              </div>

                              {/* Admin list */}
                              {role.admins.length > 0 ? (
                                <ul className="mt-1 pl-4 space-y-0.5">
                                  {role.admins.map((admin) => (
                                    <li
                                      key={admin.id}
                                      className="text-gray-600 text-xs flex items-center gap-1.5"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                                      <span className="font-medium">{admin.name}</span>
                                      <span className="text-gray-400">({admin.email})</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-gray-400 italic mt-0.5 pl-4">
                                  No users assigned to this role.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* E-Service Users table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-heading-700 flex items-center gap-2">
                <FiUsers size={16} className="text-primary-600" />
                E-Service User Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {isLoading ? (
                <UserTableSkeleton />
              ) : !data?.eserviceUsers?.length ? (
                <p className="text-sm text-gray-400 italic py-4 text-center">
                  No e-service user accounts found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                          Name
                        </th>
                        <th className="px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                          Email
                        </th>
                        <th className="px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                          Role
                        </th>
                        <th className="px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                          System Roles
                        </th>
                        <th className="px-4 py-2.5 font-medium text-gray-500 text-xs uppercase tracking-wide">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.eserviceUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-gray-50 hover:bg-gray-50/50"
                        >
                          <td className="px-4 py-2.5 text-gray-800 font-medium">
                            {u.name}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                          <td className="px-4 py-2.5">
                            <span
                            className={cn(
                              'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize',
                              u.role === 'admin'
                                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            )}
                          >
                            {u.role}
                          </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {u.roles.length > 0
                              ? u.roles.join(', ')
                              : (
                                <span className="text-gray-400 italic text-xs">
                                  None assigned
                                </span>
                              )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">
                            {new Date(u.createdAt).toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
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
      </AccessControlGate>
    </DashboardLayout>
  );
};

function SummaryCard({
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
              'text-2xl font-bold mt-1',
              loading ? 'text-gray-300' : 'text-heading-800',
            )}>
              {loading ? '—' : value.toLocaleString()}
            </p>
          </div>
          <div className={cn(
            'p-2 rounded-md mt-0.5',
            loading ? 'bg-gray-100' : 'bg-primary-50 text-primary-600',
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
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="space-y-1.5 pl-1">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <div className="h-2 w-2 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-32 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function UserTableSkeleton() {
  return (
    <div className="space-y-2 px-4 py-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="h-3 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
