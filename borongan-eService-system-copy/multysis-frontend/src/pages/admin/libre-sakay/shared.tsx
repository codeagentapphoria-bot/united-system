// Shared UI primitives used across all tab sections
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';

// =============================================================================
// STATUS BADGE
// =============================================================================

export function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
      Inactive
    </span>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

export function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3].map(i => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 bg-gray-100 rounded animate-pulse" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell colSpan={99}>
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
          <div className="text-4xl mb-1">{icon}</div>
          <p className="font-medium text-gray-600 text-sm">{title}</p>
          <p className="text-xs">{description}</p>
          {action && <div className="mt-2">{action}</div>}
        </div>
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// SHARED CONSTANTS
// =============================================================================

export const DONUT_COLORS = ['#10b981', '#f59e0b'];

export const RIDE_STATUS_STYLES: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const SECTION_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  fleet: 'Live Fleet',
  buses: 'Buses',
  routes: 'Routes',
  drivers: 'Drivers',
  stops: 'Stops',
  'ride-logs': 'Ride Logs',
  applications: 'Beneficiaries & Application',
  'access-control': 'Access Control',
  verification: 'Verify Resident',
};
