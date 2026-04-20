import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { libreSakayService } from '@/services/api/libre-sakay.service';
import type { RideLog } from './types';
import { RIDE_STATUS_STYLES, LoadingRows, EmptyState } from './shared';
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
  const [routeId, setRouteId] = useState('all');
  const [driverId, setDriverId] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState<{
    from?: string;
    to?: string;
    route_id?: string;
    driver_id?: string;
  }>({});

  const { data: routes } = useQuery({
    queryKey: queryKeys.libreSakay.routes.all,
    queryFn: libreSakayService.getAvailableRoutes,
  });

  const { data: driversData } = useQuery({
    queryKey: queryKeys.libreSakay.drivers.list(1, 100),
    queryFn: () => libreSakayService.getDrivers(1, 100),
  });

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

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      from: fromDate || undefined,
      to: toDate || undefined,
      route_id: routeId === 'all' ? undefined : routeId || undefined,
      driver_id: driverId === 'all' ? undefined : driverId || undefined,
    });
  };

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setRouteId('all');
    setDriverId('all');
    setPage(1);
    setAppliedFilters({});
  };

  const logs: RideLog[] = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? logs.length;
  const from = (page - 1) * 20 + 1;
  const to = Math.min(page * 20, total);

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return '—';
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

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
              <label className="text-xs font-medium text-gray-500 block mb-1">Route</label>
              <Select value={routeId} onValueChange={setRouteId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All routes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All routes</SelectItem>
                  {(routes ?? []).map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Driver</label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All drivers</SelectItem>
                  {(driversData?.data ?? []).map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name}
                    </SelectItem>
                  ))}
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
          <CardTitle className="text-base font-semibold">Ride History</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bus</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Passengers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows cols={8} />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={<FiList />}
                title="No ride logs yet"
                description="Ride logs will appear here as drivers complete routes."
              />
            ) : (
              logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.buses?.plate_number ?? '—'}</TableCell>
                  <TableCell>{log.routes?.name ?? '—'}</TableCell>
                  <TableCell>{log.driver?.full_name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(log.started_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-sm">{formatDuration(log.started_at, log.ended_at)}</TableCell>
                  <TableCell>{log.passenger_count}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${RIDE_STATUS_STYLES[log.status]}`}
                    >
                      {log.status === 'in_progress'
                        ? 'In Progress'
                        : log.status === 'completed'
                          ? 'Completed'
                          : 'Cancelled'}
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
                        <DropdownMenuSeparator />
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
              ))
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
