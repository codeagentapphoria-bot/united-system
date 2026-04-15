import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  medicineRequestService,
  type MedicineRequest,
  type MedicineRequestStatus,
} from '@/services/api/medicine-request.service';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// =============================================================================
// STATUS HELPERS
// =============================================================================

const STATUS_LABELS: Record<MedicineRequestStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for Pick-up',
  PICKED_UP: 'Picked Up',
  DONE: 'Done',
};

const STATUS_COLORS: Record<MedicineRequestStatus, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY_FOR_PICKUP: 'bg-purple-100 text-purple-800',
  PICKED_UP: 'bg-indigo-100 text-indigo-800',
  DONE: 'bg-gray-100 text-gray-800',
};

const NEXT_ACTIONS: Record<MedicineRequestStatus, { label: string; status: MedicineRequestStatus }[]> = {
  SUBMITTED: [{ label: 'Start Review', status: 'UNDER_REVIEW' }],
  UNDER_REVIEW: [
    { label: 'Approve', status: 'APPROVED' },
    { label: 'Reject', status: 'REJECTED' },
  ],
  APPROVED: [{ label: 'Mark Preparing', status: 'PREPARING' }],
  REJECTED: [],
  PREPARING: [{ label: 'Mark Ready for Pick-up', status: 'READY_FOR_PICKUP' }],
  READY_FOR_PICKUP: [{ label: 'Mark Picked Up', status: 'PICKED_UP' }],
  PICKED_UP: [{ label: 'Mark Done', status: 'DONE' }],
  DONE: [],
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function residentName(r: MedicineRequest['resident']): string {
  return [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ');
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AdminLibreMedisina: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState<MedicineRequestStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Detail dialog
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // Queries
  const statsQuery = useQuery({
    queryKey: queryKeys.medicineRequests.stats,
    queryFn: medicineRequestService.getStats,
    refetchInterval: 30_000,
  });

  const listQuery = useQuery({
    queryKey: queryKeys.medicineRequests.list({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search,
      page,
    }),
    queryFn: () =>
      medicineRequestService.getAll(
        statusFilter === 'ALL' ? undefined : statusFilter,
        search || undefined,
        page,
        20
      ),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.medicineRequests.detail(selectedId || ''),
    queryFn: () => medicineRequestService.getById(selectedId!),
    enabled: !!selectedId,
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: MedicineRequestStatus; note?: string }) =>
      medicineRequestService.updateStatus(id, status, note),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: queryKeys.medicineRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.medicineRequests.stats });
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.medicineRequests.detail(selectedId) });
      }
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update status',
      });
    },
  });

  const handleStatusChange = (id: string, newStatus: MedicineRequestStatus) => {
    statusMutation.mutate({ id, status: newStatus, note: noteInput || undefined });
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setNoteInput('');
  };

  const stats = statsQuery.data;
  const requests = listQuery.data?.data || [];
  const pagination = listQuery.data?.pagination;
  const detail = detailQuery.data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-colored.svg" alt="Logo" className="h-8 w-auto" />
          <h1 className="text-xl font-semibold text-heading-700">Libre Medisina</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{stats?.total ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats?.pendingReview ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats?.approvedPreparing ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Approved / Preparing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats?.readyForPickup ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Ready for Pick-up</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats?.completed ?? '-'}</p>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by resident name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as MedicineRequestStatus | 'ALL');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resident</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead>Date Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    {listQuery.isLoading ? 'Loading...' : 'No requests found'}
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openDetail(req.id)}
                  >
                    <TableCell className="font-medium">{residentName(req.resident)}</TableCell>
                    <TableCell>{req.resident.barangay?.barangayName || '-'}</TableCell>
                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', STATUS_COLORS[req.status])}>
                        {STATUS_LABELS[req.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{req.note || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(req.id); }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prescription Request</DialogTitle>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              {/* Resident Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Resident</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name: </span>
                    <span className="font-medium">{residentName(detail.resident)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Barangay: </span>
                    <span>{detail.resident.barangay?.barangayName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact: </span>
                    <span>{detail.resident.contactNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email: </span>
                    <span>{detail.resident.email || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Prescription Image */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Prescription</h3>
                <img
                  src={detail.prescriptionPath}
                  alt="Prescription"
                  className="max-w-full rounded border cursor-zoom-in"
                  onClick={() => window.open(detail.prescriptionPath, '_blank')}
                />
              </div>

              {/* Status + Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Status</h3>
                <Badge className={cn('text-sm', STATUS_COLORS[detail.status])}>
                  {STATUS_LABELS[detail.status]}
                </Badge>
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div>Submitted: {formatDate(detail.createdAt)}</div>
                  {detail.reviewedAt && <div>Reviewed: {formatDate(detail.reviewedAt)}</div>}
                  {detail.preparedAt && <div>Prepared: {formatDate(detail.preparedAt)}</div>}
                  {detail.readyAt && <div>Ready: {formatDate(detail.readyAt)}</div>}
                  {detail.pickedUpAt && <div>Picked Up: {formatDate(detail.pickedUpAt)}</div>}
                  {detail.completedAt && <div>Completed: {formatDate(detail.completedAt)}</div>}
                </div>
              </div>

              {/* Note */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-2">Note</h3>
                {detail.note && (
                  <p className="text-sm text-gray-700 mb-2">{detail.note}</p>
                )}
                <Textarea
                  placeholder="Add a note (optional)..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Actions */}
              {NEXT_ACTIONS[detail.status].length > 0 && (
                <div className="flex gap-2 pt-2">
                  {NEXT_ACTIONS[detail.status].map((action) => (
                    <Button
                      key={action.status}
                      variant={action.status === 'REJECTED' ? 'destructive' : 'default'}
                      disabled={statusMutation.isPending}
                      onClick={() => handleStatusChange(detail.id, action.status)}
                    >
                      {statusMutation.isPending ? 'Updating...' : action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
