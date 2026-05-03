import React from 'react';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingRows, EmptyState } from './shared';
import { Button } from '@/components/ui/button';
import { FiEye, FiUserX, FiUserCheck, FiTrash2 } from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BeneficiaryListItem } from '@/services/api/libre-sakay-beneficiary.service';

interface BeneficiariesTableProps {
  data: BeneficiaryListItem[];
  isLoading: boolean;
  onView: (id: string) => void;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onRemove: (id: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
}

const CATEGORY_LABELS: Record<string, string> = {
  SENIOR_CITIZEN: 'Senior Citizen',
  PWD: 'PWD',
  STUDENT: 'Student',
  SOLO_PARENT: 'Solo Parent',
};

const ENROLLMENT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function EnrollmentStatusBadge({ status, suspendedAt }: { status: string; suspendedAt?: string | null }) {
  const isSuspended = !!suspendedAt;
  const label = isSuspended ? 'Suspended' : status === 'INACTIVE' ? 'Inactive' : status === 'ACTIVE' ? 'Active' : status === 'PENDING' ? 'Pending' : status.charAt(0) + status.slice(1).toLowerCase();
  const style = isSuspended
    ? 'bg-amber-100 text-amber-700'
    : ENROLLMENT_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

function ApplicationStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${APPLICATION_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function BeneficiariesTable({
  data,
  isLoading,
  onView,
  onSuspend,
  onActivate,
  onRemove,
  emptyTitle = 'No beneficiaries found',
  emptyDescription = 'No beneficiaries match the current filter.',
  emptyIcon = <FiUserX />,
}: BeneficiariesTableProps) {
  if (isLoading) {
    return (
      <>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Res. ID</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Barangay</TableHead>
            <TableHead>Enrollment</TableHead>
            <TableHead>Application</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <LoadingRows cols={8} />
        </TableBody>
      </>
    );
  }

  if (data.length === 0) {
    return (
      <>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Res. ID</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Barangay</TableHead>
            <TableHead>Enrollment</TableHead>
            <TableHead>Application</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        </TableBody>
      </>
    );
  }

  return (
    <>
      <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Res. ID</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Barangay</TableHead>
            <TableHead>Enrollment</TableHead>
            <TableHead>Application</TableHead>
            <TableHead>Registered</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(b => (
          <TableRow key={b.id}>
            <TableCell className="font-medium">{b.fullName}</TableCell>
            <TableCell className="text-sm text-gray-500">{b.residentIdNumber}</TableCell>
            <TableCell>
              <span className="text-sm">{CATEGORY_LABELS[b.category] ?? b.category}</span>
            </TableCell>
            <TableCell className="text-sm text-gray-500">{b.barangay}</TableCell>
            <TableCell>
              <EnrollmentStatusBadge status={b.enrollmentStatus} suspendedAt={b.suspendedAt} />
            </TableCell>
            <TableCell>
              <ApplicationStatusBadge status={b.applicationStatus} />
            </TableCell>
            <TableCell className="text-sm text-gray-500">
              {new Date(b.enrolledAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <FiUserCheck className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView(b.id)}>
                    <FiEye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  {b.enrollmentStatus === 'ACTIVE' ? (
                    <DropdownMenuItem onClick={() => onSuspend(b.id)}>
                      <FiUserX className="mr-2 h-4 w-4" />
                      Suspend
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => onActivate(b.id)}>
                      <FiUserCheck className="mr-2 h-4 w-4" />
                      Activate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onRemove(b.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <FiTrash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}
