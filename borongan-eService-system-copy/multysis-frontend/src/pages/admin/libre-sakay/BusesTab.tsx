import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { libreSakayService } from '@/services/api/libre-sakay.service';
import type { Bus } from './types';
import { StatusBadge, LoadingRows, EmptyState } from './shared';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FiTruck, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiUsers, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// =============================================================================
// BUS FORM DIALOG
// =============================================================================

function BusFormDialog({
  open,
  onClose,
  bus,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  bus?: Bus;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [plate, setPlate] = useState(bus?.plate_number ?? '');
  const [capacity, setCapacity] = useState(bus?.capacity?.toString() ?? '50');
  const [routeId, setRouteId] = useState(bus?.route_id ?? 'none');
  const mutation = useMutation({
    mutationFn: bus
      ? (data: unknown) => libreSakayService.updateBus(bus.id, data as Parameters<typeof libreSakayService.updateBus>[1])
      : (data: unknown) => libreSakayService.createBus(data as Parameters<typeof libreSakayService.createBus>[0]),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const { data: routes } = useQuery({
    queryKey: queryKeys.libreSakay.routes.all,
    queryFn: libreSakayService.getAvailableRoutes,
  });

  React.useEffect(() => {
    if (bus) {
      setPlate(bus.plate_number);
      setCapacity(bus.capacity.toString());
      setRouteId(bus.route_id ?? 'none');
    } else {
      setPlate('');
      setCapacity('50');
      setRouteId('none');
    }
  }, [bus, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bus ? 'Edit Bus' : 'Add Bus'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Plate Number</label>
            <Input value={plate} onChange={e => setPlate(e.target.value)} placeholder="ABC 1234" />
          </div>
          <div>
            <label className="text-sm font-medium">Capacity</label>
            <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Route</label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger>
                <SelectValue placeholder="No route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No route</SelectItem>
                {routes?.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              mutation.mutate({
                plate_number: plate,
                capacity: parseInt(capacity),
                route_id: routeId === 'none' ? undefined : routeId || undefined,
              })
            }
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// ASSIGN DRIVER DIALOG
// =============================================================================

function AssignDriverDialog({
  open,
  onClose,
  bus,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  bus: Bus;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const { data: drivers } = useQuery({
    queryKey: queryKeys.libreSakay.drivers.all,
    queryFn: () => libreSakayService.getAvailableDrivers(),
  });
  const assignMutation = useMutation({
    mutationFn: (driverId: string) => libreSakayService.assignDriverToBus(bus.id, driverId),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });
  const unassignMutation = useMutation({
    mutationFn: (driverId: string) => libreSakayService.unassignDriverFromBus(bus.id, driverId),
    onSuccess: () => {
      onSuccess();
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const assignedDriverIds = new Set((bus?.driver_buses || []).map(db => db.profiles?.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Drivers — {bus.plate_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {(bus?.driver_buses || []).map(db => (
            <div key={db.id} className="flex items-center justify-between border rounded p-2">
              <span>
                {db.profiles?.full_name || 'Unknown'} ({db.profiles?.phone || 'N/A'})
              </span>
              <Button
                size="sm"
                variant="destructive"
                disabled={!db.profiles?.id || unassignMutation.isPending}
                onClick={() => {
                  if (db.profiles?.id) unassignMutation.mutate(db.profiles.id);
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers
                  ?.filter(d => !assignedDriverIds.has(d.id))
                  .map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.full_name} ({d.phone})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => selectedDriverId && assignMutation.mutate(selectedDriverId)}
              disabled={!selectedDriverId || assignMutation.isPending}
            >
              Assign
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// BUSES TAB
// =============================================================================

export function BusesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [editBus, setEditBus] = useState<Bus | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [assignBus, setAssignBus] = useState<Bus | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.libreSakay.buses.list(page),
    queryFn: () => libreSakayService.getBuses(page, 20),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => libreSakayService.deleteBus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.buses.all });
      toast({ title: 'Bus deleted' });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const buses = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? buses.length;
  const from = (page - 1) * 20 + 1;
  const to = Math.min(page * 20, total);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? 'Loading...' : `${total} bus${total !== 1 ? 'es' : ''} registered`}
        </p>
        <Button
          onClick={() => {
            setEditBus(undefined);
            setShowForm(true);
          }}
        >
          <FiPlus className="mr-1.5" size={14} /> Add Bus
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Fleet Registry</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Driver(s)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows cols={6} />
            ) : buses.length === 0 ? (
              <EmptyState
                icon={<FiTruck />}
                title="No buses yet"
                description="Add your first bus to start managing the fleet."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditBus(undefined);
                      setShowForm(true);
                    }}
                  >
                    <FiPlus className="mr-1" size={13} /> Add Bus
                  </Button>
                }
              />
            ) : (
              buses.map(bus => (
                <TableRow key={bus.id}>
                  <TableCell className="font-medium">{bus.plate_number}</TableCell>
                  <TableCell>{bus.capacity} seats</TableCell>
                  <TableCell>{bus.routes?.name ?? <span className="text-gray-400 text-xs">Unassigned</span>}</TableCell>
                  <TableCell>
                    {(bus.driver_buses || []).length > 0 ? (
                      (bus.driver_buses || []).map(db => db.profiles?.full_name || 'Unknown').join(', ')
                    ) : (
                      <span className="text-gray-400 text-xs">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={bus.is_active} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <FiMoreVertical size={15} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditBus(bus);
                            setShowForm(true);
                          }}
                        >
                          <FiEdit2 className="mr-2" size={13} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssignBus(bus)}>
                          <FiUsers className="mr-2" size={13} /> Manage Drivers
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => deleteMutation.mutate(bus.id)}
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
            Showing {from}–{to} of {total} buses
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

      <BusFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        bus={editBus}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.buses.all })}
      />
      {assignBus && (
        <AssignDriverDialog
          open={!!assignBus}
          onClose={() => setAssignBus(undefined)}
          bus={assignBus}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.buses.all })}
        />
      )}
    </div>
  );
}
