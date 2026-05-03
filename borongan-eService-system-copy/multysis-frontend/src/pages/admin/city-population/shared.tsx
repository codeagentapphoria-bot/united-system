// Shared UI primitives for City Population sections
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';

// =============================================================================
// STATUS BADGE
// =============================================================================

export function StatusBadge({ variant, children }: { variant: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    UNDER_REVIEW: 'bg-blue-100 text-blue-800 border-blue-300',
    APPROVED: 'bg-green-100 text-green-800 border-green-300',
    REJECTED: 'bg-red-100 text-red-800 border-red-300',
    REQUIRES_RESUBMISSION: 'bg-orange-100 text-orange-800 border-orange-300',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    deceased: 'bg-red-100 text-red-700',
    moved_out: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[variant] ?? 'bg-gray-100 text-gray-600'}`}>
      {children}
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
    <TableRow style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', alignContent: 'center' }}>
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
// SECTION TITLES
// =============================================================================

export const SECTION_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  registrations: 'Registrations',
  residents: 'Residents',
};
