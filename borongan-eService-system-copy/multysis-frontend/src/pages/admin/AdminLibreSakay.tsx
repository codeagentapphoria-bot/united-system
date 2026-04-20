import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import {
  libreSakayService,
  type Bus,
  type Route,
  type Driver,
  type Stop,
  type RouteStopJunction,
} from '@/services/api/libre-sakay.service';

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
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FleetMap } from '@/components/admin/FleetMap';

// =============================================================================
// FLEET STATS
// =============================================================================

function FleetTab() {
  const { data: stats } = useQuery({
    queryKey: queryKeys.libreSakay.fleet,
    queryFn: libreSakayService.getFleetStats,
    refetchInterval: 30_000,
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <p className="text-3xl font-bold">{stats?.total ?? '-'}</p>
          <p className="text-sm text-gray-500 mt-1">Total Buses</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <p className="text-3xl font-bold text-green-600">{stats?.moving ?? '-'}</p>
          <p className="text-sm text-gray-500 mt-1">Moving</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{stats?.parked ?? '-'}</p>
          <p className="text-sm text-gray-500 mt-1">Parked</p>
        </CardContent>
      </Card>
      <div className="col-span-3">
        <FleetMap />
      </div>
    </div>
  );
}

// =============================================================================
// BUSES TAB
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
  const [routeId, setRouteId] = useState(bus?.route_id ?? '');
  const mutation = useMutation({
    mutationFn: bus
      ? (data: any) => libreSakayService.updateBus(bus.id, data)
      : (data: any) => libreSakayService.createBus(data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  const { data: routes } = useQuery({
    queryKey: queryKeys.libreSakay.routes.all,
    queryFn: libreSakayService.getAvailableRoutes,
  });

  React.useEffect(() => {
    if (bus) { setPlate(bus.plate_number); setCapacity(bus.capacity.toString()); setRouteId(bus.route_id ?? ''); }
    else { setPlate(''); setCapacity('50'); setRouteId(''); }
  }, [bus, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{bus ? 'Edit Bus' : 'Add Bus'}</DialogTitle></DialogHeader>
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
              <SelectTrigger><SelectValue placeholder="No route" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">No route</SelectItem>
                {routes?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ plate_number: plate, capacity: parseInt(capacity), route_id: routeId || undefined })} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDriverDialog({ open, onClose, bus, onSuccess }: { open: boolean; onClose: () => void; bus: Bus; onSuccess: () => void }) {
  const { toast } = useToast();
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const { data: drivers } = useQuery({
    queryKey: queryKeys.libreSakay.drivers.all,
    queryFn: () => libreSakayService.getAvailableDrivers(),
  });
  const assignMutation = useMutation({
    mutationFn: (driverId: string) => libreSakayService.assignDriverToBus(bus.id, driverId),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });
  const unassignMutation = useMutation({
    mutationFn: (driverId: string) => libreSakayService.unassignDriverFromBus(bus.id, driverId),
    onSuccess: () => { onSuccess(); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  const assignedDriverIds = new Set((bus?.driver_buses || []).map(db => db.profiles?.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Manage Drivers — {bus.plate_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {(bus?.driver_buses || []).map(db => (
            <div key={db.id} className="flex items-center justify-between border rounded p-2">
              <span>{db.profiles?.full_name || 'Unknown'} ({db.profiles?.phone || 'N/A'})</span>
              <Button
                size="sm"
                variant="destructive"
                disabled={!db.profiles?.id || unassignMutation.isPending}
                onClick={() => { if (db.profiles?.id) unassignMutation.mutate(db.profiles.id); }}
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>
                {drivers?.filter(d => !assignedDriverIds.has(d.id)).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name} ({d.phone})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => selectedDriverId && assignMutation.mutate(selectedDriverId)} disabled={!selectedDriverId || assignMutation.isPending}>Assign</Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BusesTab() {
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.buses.all }); toast({ title: 'Bus deleted' }); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  const buses = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditBus(undefined); setShowForm(true); }}>+ Add Bus</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
              buses.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">No buses found</TableCell></TableRow> :
              buses.map(bus => (
                <TableRow key={bus.id}>
                  <TableCell className="font-medium">{bus.plate_number}</TableCell>
                  <TableCell>{bus.capacity}</TableCell>
                  <TableCell>{bus.routes?.name ?? '-'}</TableCell>
                  <TableCell>
                    {(bus.driver_buses || []).length > 0 ? (bus.driver_buses || []).map(db => db.profiles?.full_name || 'Unknown').join(', ') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={bus.is_active ? 'default' : 'secondary'}>
                      {bus.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditBus(bus); setShowForm(true); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => setAssignBus(bus)}>Drivers</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(bus.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="py-2 text-sm">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <BusFormDialog open={showForm} onClose={() => setShowForm(false)} bus={editBus} onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.buses.all })} />
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

// =============================================================================
// ROUTES TAB
// =============================================================================

function RouteFormDialog({ open, onClose, route, onSuccess }: { open: boolean; onClose: () => void; route?: Route; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(route?.name ?? '');
  const [desc, setDesc] = useState(route?.description ?? '');
  const mutation = useMutation({
    mutationFn: route
      ? (data: any) => libreSakayService.updateRoute(route.id, data)
      : (data: any) => libreSakayService.createRoute(data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  React.useEffect(() => {
    if (route) { setName(route.name); setDesc(route.description ?? ''); }
    else { setName(''); setDesc(''); }
  }, [route, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{route ? 'Edit Route' : 'Add Route'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Name</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Description</label><Textarea value={desc} onChange={e => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ name, description: desc || undefined })} disabled={mutation.isPending || !name}>{mutation.isPending ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MANAGE STOPS DIALOG
// =============================================================================

function ManageStopsDialog({
  open,
  onClose,
  route,
}: {
  open: boolean;
  onClose: () => void;
  route: Route;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allStops } = useQuery({
    queryKey: queryKeys.libreSakay.stops.all,
    queryFn: libreSakayService.getAllStops,
  });
  const { data: routeStops, isLoading } = useQuery({
    queryKey: queryKeys.libreSakay.routes.stops(route.id),
    queryFn: () => libreSakayService.getRouteStops(route.id),
    enabled: !!route.id,
  });
  const assignMutation = useMutation({
    mutationFn: (stopId: string) => libreSakayService.assignStopToRoute(route.id, stopId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.stops(route.id) }); queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all }); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });
  const removeMutation = useMutation({
    mutationFn: (stopId: string) => libreSakayService.removeStopFromRoute(route.id, stopId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.stops(route.id) }); queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all }); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });
  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => libreSakayService.reorderStopsInRoute(route.id, orderedIds),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.stops(route.id) }); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  const [selectedStopId, setSelectedStopId] = useState('');
  const assignedStopIds = new Set((routeStops ?? []).map((rs: RouteStopJunction) => rs.stops.id));

  const handleAssign = () => {
    if (!selectedStopId) return;
    assignMutation.mutate(selectedStopId);
    setSelectedStopId('');
  };

  const handleMove = (stopId: string, direction: 'up' | 'down') => {
    const sorted = [...(routeStops ?? [])].sort((a: RouteStopJunction, b: RouteStopJunction) => a.sequence_order - b.sequence_order);
    const idx = sorted.findIndex((rs: RouteStopJunction) => rs.stops.id === stopId);
    if (idx === -1) return;
    const newSorted = [...sorted];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newSorted.length) return;
    [newSorted[idx], newSorted[swapIdx]] = [newSorted[swapIdx], newSorted[idx]];
    reorderMutation.mutate(newSorted.map((rs: RouteStopJunction) => rs.stop_id));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Manage Stops — {route.name}</DialogTitle></DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="text-sm font-medium text-gray-500">
            {isLoading ? 'Loading stops...' : `${routeStops?.length ?? 0} stop(s) assigned`}
          </p>
          {routeStops?.sort((a: RouteStopJunction, b: RouteStopJunction) => a.sequence_order - b.sequence_order).map((rs: RouteStopJunction, idx: number) => (
            <div key={rs.stops.id} className="flex items-center justify-between border rounded p-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{idx + 1}</span>
                <span className="text-sm">{rs.stops.name}</span>
                <span className="text-xs text-gray-400">
                  {rs.stops.latitude.toFixed(4)}, {rs.stops.longitude.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleMove(rs.stops.id, 'up')} disabled={idx === 0}>↑</Button>
                <Button size="sm" variant="ghost" onClick={() => handleMove(rs.stops.id, 'down')} disabled={idx === (routeStops?.length ?? 0) - 1}>↓</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeMutation.mutate(rs.stop_id)} disabled={removeMutation.isPending}>Remove</Button>
              </div>
            </div>
          ))}
          {!isLoading && (routeStops?.length ?? 0) === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No stops assigned yet.</p>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Select value={selectedStopId} onValueChange={setSelectedStopId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select a stop to add" /></SelectTrigger>
            <SelectContent>
              {(allStops ?? [])
                .filter((s: Stop) => !assignedStopIds.has(s.id))
                .map((s: Stop) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAssign} disabled={!selectedStopId || assignMutation.isPending}>Add</Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoutesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [editRoute, setEditRoute] = useState<Route | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [manageRoute, setManageRoute] = useState<Route | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.libreSakay.routes.list(page),
    queryFn: () => libreSakayService.getRoutes(page, 20),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => libreSakayService.deleteRoute(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all }); toast({ title: 'Route deleted' }); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => libreSakayService.updateRoute(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all }),
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  const routes = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditRoute(undefined); setShowForm(true); }}>+ Add Route</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Stops</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow> :
              routes.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8">No routes found</TableCell></TableRow> :
              routes.map(route => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">{route.name}</TableCell>
                  <TableCell>{route.description ?? '-'}</TableCell>
                  <TableCell>{route.route_stops?.[0]?.count ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={route.is_active ? 'default' : 'secondary'}>{route.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: route.id, is_active: !route.is_active })}>
                      {route.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditRoute(route); setShowForm(true); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => setManageRoute(route)}>Stops</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(route.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="py-2 text-sm">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
      <RouteFormDialog open={showForm} onClose={() => setShowForm(false)} route={editRoute} onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all })} />
      {manageRoute && (
        <ManageStopsDialog
          open={!!manageRoute}
          onClose={() => setManageRoute(undefined)}
          route={manageRoute}
        />
      )}
    </div>
  );
}

// =============================================================================
// DRIVERS TAB
// =============================================================================

function DriverFormDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: (data: any) => libreSakayService.createDriver(data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  React.useEffect(() => { if (open) { setEmail(''); setName(''); setPhone(''); setPassword(''); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Email</label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Full Name</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Phone</label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Password</label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ email, full_name: name, phone, password })} disabled={mutation.isPending || !email || !name || !phone || !password}>{mutation.isPending ? 'Creating...' : 'Create Driver'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDriverDialog({ open, onClose, driver, onSuccess }: { open: boolean; onClose: () => void; driver: Driver; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(driver.full_name);
  const [phone, setPhone] = useState(driver.phone ?? '');
  const [isActive, setIsActive] = useState(driver.is_active);
  const mutation = useMutation({
    mutationFn: (data: any) => libreSakayService.updateDriver(driver.id, data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  React.useEffect(() => {
    if (driver) { setName(driver.full_name); setPhone(driver.phone ?? ''); setIsActive(driver.is_active); }
  }, [driver]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Driver — {driver.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Full Name</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Phone</label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
            <label htmlFor="is_active" className="text-sm font-medium">Active</label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ full_name: name, phone, is_active: isActive })} disabled={mutation.isPending || !name}>{mutation.isPending ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignBusDialog({ open, onClose, driver }: { open: boolean; onClose: () => void; driver: Driver }) {
  const { toast } = useToast();
  const { data: buses } = useQuery({
    queryKey: queryKeys.libreSakay.buses.list(1, 100),
    queryFn: () => libreSakayService.getBuses(1, 100),
  });
  const assignMutation = useMutation({
    mutationFn: (busId: string) => libreSakayService.assignBusToDriver(driver.id, busId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all }); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });
  const unassignMutation = useMutation({
    mutationFn: (busId: string) => libreSakayService.unassignBusFromDriver(driver.id, busId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all }); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  const queryClient = useQueryClient();
  const [selectedBusId, setSelectedBusId] = useState('');
  const assignedBusIds = new Set((driver.driver_buses || []).map(db => db.buses?.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Manage Buses — {driver.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {(driver.driver_buses || []).map(db => (
            <div key={db.id} className="flex items-center justify-between border rounded p-2">
              <span>{db.buses?.plate_number || 'Unknown'}</span>
              <Button
                size="sm"
                variant="destructive"
                disabled={!db.buses?.id || unassignMutation.isPending}
                onClick={() => { if (db.buses?.id) unassignMutation.mutate(db.buses.id); }}
              >
                Remove
              </Button>
            </div>
          ))}
          {(driver.driver_buses || []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">No buses assigned.</p>
          )}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Select value={selectedBusId} onValueChange={setSelectedBusId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select a bus" /></SelectTrigger>
            <SelectContent>
              {(buses?.data ?? [])
                .filter((b: Bus) => !assignedBusIds.has(b.id) && b.is_active)
                .map((b: Bus) => (
                  <SelectItem key={b.id} value={b.id}>{b.plate_number} ({b.capacity} seats)</SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { if (selectedBusId) { assignMutation.mutate(selectedBusId); setSelectedBusId(''); } }} disabled={!selectedBusId || assignMutation.isPending}>Assign</Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DriversTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | undefined>();
  const [assignDriver, setAssignDriver] = useState<Driver | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.libreSakay.drivers.list(page),
    queryFn: () => libreSakayService.getDrivers(page, 20),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => libreSakayService.deleteDriver(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all }); toast({ title: 'Driver deactivated' }); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  const drivers = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ Add Driver</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Assigned Buses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow> :
              drivers.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8">No drivers found</TableCell></TableRow> :
              drivers.map(driver => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.full_name}</TableCell>
                  <TableCell>{driver.email}</TableCell>
                  <TableCell>{driver.phone ?? '-'}</TableCell>
                  <TableCell>{(driver.driver_buses || []).map(db => db.buses?.plate_number || 'Unknown').join(', ') || '-'}</TableCell>
                  <TableCell><Badge variant={driver.is_active ? 'default' : 'secondary'}>{driver.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setEditDriver(driver)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => setAssignDriver(driver)}>Buses</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(driver.id)}>Deactivate</Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="py-2 text-sm">Page {pagination.page} of {pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
      <DriverFormDialog open={showForm} onClose={() => setShowForm(false)} onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all })} />
      {editDriver && <EditDriverDialog open={!!editDriver} onClose={() => setEditDriver(undefined)} driver={editDriver} onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all })} />}
      {assignDriver && <AssignBusDialog open={!!assignDriver} onClose={() => setAssignDriver(undefined)} driver={assignDriver} />}
    </div>
  );
}

// =============================================================================
// STOPS TAB
// =============================================================================

function StopFormDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const mutation = useMutation({
    mutationFn: (data: any) => libreSakayService.createStop(data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  React.useEffect(() => { if (open) { setName(''); setLat(''); setLng(''); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Stop</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Name</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Latitude</label><Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Longitude</label><Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ name, latitude: parseFloat(lat), longitude: parseFloat(lng) })} disabled={mutation.isPending || !name || !lat || !lng}>{mutation.isPending ? 'Creating...' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditStopDialog({ open, onClose, stop, onSuccess }: { open: boolean; onClose: () => void; stop: Stop; onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(stop.name);
  const [lat, setLat] = useState(stop.latitude.toString());
  const [lng, setLng] = useState(stop.longitude.toString());
  const mutation = useMutation({
    mutationFn: (data: any) => libreSakayService.updateStop(stop.id, data),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  React.useEffect(() => {
    if (stop) { setName(stop.name); setLat(stop.latitude.toString()); setLng(stop.longitude.toString()); }
  }, [stop]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Stop — {stop.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium">Name</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Latitude</label><Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} /></div>
          <div><label className="text-sm font-medium">Longitude</label><Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate({ name, latitude: parseFloat(lat), longitude: parseFloat(lng) })} disabled={mutation.isPending || !name || !lat || !lng}>{mutation.isPending ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StopsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editStop, setEditStop] = useState<Stop | undefined>();

  const { data: stops, isLoading } = useQuery({
    queryKey: queryKeys.libreSakay.stops.all,
    queryFn: libreSakayService.getAllStops,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => libreSakayService.deleteStop(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.stops.all }); toast({ title: 'Stop deleted' }); },
    onError: (e: any) => { toast({ variant: 'destructive', title: 'Error', description: e.message }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ Add Stop</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Latitude</TableHead>
              <TableHead>Longitude</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow> :
              !stops?.length ? <TableRow><TableCell colSpan={4} className="text-center py-8">No stops found</TableCell></TableRow> :
              stops.map(stop => (
                <TableRow key={stop.id}>
                  <TableCell className="font-medium">{stop.name}</TableCell>
                  <TableCell>{stop.latitude.toFixed(6)}</TableCell>
                  <TableCell>{stop.longitude.toFixed(6)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => setEditStop(stop)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(stop.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
      <StopFormDialog open={showForm} onClose={() => setShowForm(false)} onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.stops.all })} />
      {editStop && <EditStopDialog open={!!editStop} onClose={() => setEditStop(undefined)} stop={editStop} onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.stops.all })} />}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export const AdminLibreSakay: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo-colored.svg" alt="Logo" className="h-8 w-auto" />
          <h1 className="text-xl font-semibold text-heading-700">Libre Sakay</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <Tabs defaultValue="fleet" className="space-y-4">
          <TabsList>
            <TabsTrigger value="fleet">Fleet</TabsTrigger>
            <TabsTrigger value="routes">Routes</TabsTrigger>
            <TabsTrigger value="buses">Buses</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="stops">Stops</TabsTrigger>
          </TabsList>
          <TabsContent value="fleet"><FleetTab /></TabsContent>
          <TabsContent value="routes"><RoutesTab /></TabsContent>
          <TabsContent value="buses"><BusesTab /></TabsContent>
          <TabsContent value="drivers"><DriversTab /></TabsContent>
          <TabsContent value="stops"><StopsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};