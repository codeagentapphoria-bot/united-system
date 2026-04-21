import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { libreSakayService } from '@/services/api/libre-sakay.service';
import type { RideLog } from './types';
import { LoadingRows, EmptyState } from './shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FiList, FiMoreVertical, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// =============================================================================
// RIDE LOGS SECTION
// =============================================================================

export function RideLogsSection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState<{
    from?: string;
    to?: string;
    status?: string;
  }>({});


  const { data, isLoading } = useQuery({
    queryKey: queryKeys.libreSakay.rideLogs.list(page, appliedFilters),
    queryFn: () => libreSakayService.getRideLogs(page, 20, appliedFilters),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => libreSakayService.deleteRideLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.rideLogs.all });
      toast({ title: 'Ride log deleted' });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (id: string) => libreSakayService.reviewRideLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.rideLogs.all });
      toast({ title: 'Ride log marked as reviewed' });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      from: fromDate || undefined,
      to: toDate || undefined,
      status: status === 'all' ? undefined : status,
    });
  };

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setStatus('all');
    setPage(1);
    setAppliedFilters({});
  };

  const logs: RideLog[] = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? logs.length;
  const from = (page - 1) * 20 + 1;
  const to = Math.min(page * 20, total);

  const formatDuration = (start: string, end: string | null | undefined) => {
    if (!end) return '—';
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

  const getLogTime = (dateStr: string) => {
    const dt = new Date(dateStr);
    return {
      date: dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }),
      time: dt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' }),
    };
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">From</label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">To</label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Logs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Logs</SelectItem>
                  <SelectItem value="pending_review">Needs Review</SelectItem>
                  <SelectItem value="onboard">Currently Onboard</SelectItem>
                  <SelectItem value="completed">Completed Rides</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button onClick={applyFilters}>Apply</Button>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? 'Loading...' : `${total} ride log${total !== 1 ? 's' : ''}`}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Passenger Ride Logs</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
              <TableRow>
              <TableHead>Passenger</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>Boarded At</TableHead>
              <TableHead>Alighted At</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows cols={6} />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={<FiList />}
                title="No ride logs yet"
                description="Ride logs will appear here as passengers board and alight."
              />
            ) : (
              logs.map(log => {
                const bTime = getLogTime(log.boarded_at);
                const aTime = log.alighted_at ? getLogTime(log.alighted_at) : null;
                const passengerName = log.is_manual ? (log.manual_name || 'Manual Entry') : (log.resident ? `${log.resident.firstName} ${log.resident.lastName}` : 'Unresolved Resident');
                const passengerId = log.is_manual ? log.manual_id : log.resident_id;

                return (
                  <TableRow key={log.id} className="group hover:bg-gray-50/50 transition-colors">
                    {/* Passenger */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{passengerName}</span>
                          {log.is_manual && !log.admin_reviewed && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
                              Review
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                          {passengerId && <span>{passengerId}</span>}
                          {log.is_manual && (
                             <span className="px-1 bg-amber-50 text-amber-600 rounded">MANUAL</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {/* Bus */}
                    <TableCell>
                      <div className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-700">
                        {log.buses?.plate_number ?? '—'}
                      </div>
                    </TableCell>
                    {/* Boarded At */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 leading-tight">
                          {log.boarded_barangay || 'Unknown'}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-0.5">
                          {bTime.date} • {bTime.time}
                        </span>
                      </div>
                    </TableCell>
                    {/* Alighted At */}
                    <TableCell>
                      {aTime ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 leading-tight">
                            {log.alighted_barangay || 'Unknown'}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5">
                            {aTime.date} • {aTime.time}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Still onboard...</span>
                      )}
                    </TableCell>
                    {/* Duration */}
                    <TableCell>
                      <span className={`text-sm font-medium ${log.alighted_at ? 'text-gray-700' : 'text-blue-600 animate-pulse'}`}>
                        {formatDuration(log.boarded_at, log.alighted_at)}
                      </span>
                    </TableCell>
                    {/* Status badge */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          log.alighted_at
                            ? 'bg-green-50 text-green-700 border border-green-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${log.alighted_at ? 'bg-green-500' : 'bg-blue-500 animate-ping'}`} />
                        {log.alighted_at ? 'Completed' : 'Onboard'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <FiMoreVertical size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {log.is_manual && !log.admin_reviewed && (
                            <>
                              <DropdownMenuItem
                                className="text-amber-600 focus:text-amber-600"
                                onClick={() => reviewMutation.mutate(log.id)}
                              >
                                <span className="mr-2">✓</span> Mark Reviewed
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => deleteMutation.mutate(log.id)}
                          >
                            <FiTrash2 className="mr-2" size={13} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {from}–{to} of {total} logs
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <FiChevronLeft size={14} />
            </Button>
            <span className="px-3 py-1.5 text-sm">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <FiChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
