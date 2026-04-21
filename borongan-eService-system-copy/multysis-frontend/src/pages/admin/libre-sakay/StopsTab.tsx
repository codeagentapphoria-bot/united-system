import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { libreSakayService } from '@/services/api/libre-sakay.service';
import type { Stop } from './types';
import { LoadingRows, EmptyState } from './shared';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FiMapPin, FiPlus, FiMoreVertical, FiEdit2, FiTrash2 } from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// =============================================================================
// STOP FORM DIALOG
// =============================================================================

function StopFormDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const mutation = useMutation({
    mutationFn: (data: unknown) => libreSakayService.createStop(data as Parameters<typeof libreSakayService.createStop>[0]),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  React.useEffect(() => {
    if (open) {
      setName('');
      setLat('');
      setLng('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stop</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Latitude</label>
            <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Longitude</label>
            <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate({ name, latitude: parseFloat(lat), longitude: parseFloat(lng) })}
            disabled={mutation.isPending || !name || !lat || !lng}
          >
            {mutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// EDIT STOP DIALOG
// =============================================================================

function EditStopDialog({
  open,
  onClose,
  stop,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  stop: Stop;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(stop.name);
  const [lat, setLat] = useState(stop.latitude.toString());
  const [lng, setLng] = useState(stop.longitude.toString());
  const mutation = useMutation({
    mutationFn: (data: unknown) => libreSakayService.updateStop(stop.id, data as Parameters<typeof libreSakayService.updateStop>[1]),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  React.useEffect(() => {
    if (stop) {
      setName(stop.name);
      setLat(stop.latitude.toString());
      setLng(stop.longitude.toString());
    }
  }, [stop]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Stop — {stop.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Latitude</label>
            <Input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Longitude</label>
            <Input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate({ name, latitude: parseFloat(lat), longitude: parseFloat(lng) })}
            disabled={mutation.isPending || !name || !lat || !lng}
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// STOPS TAB
// =============================================================================

export function StopsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editStop, setEditStop] = useState<Stop | undefined>();
  const [viewRoutesStop, setViewRoutesStop] = useState<Stop | undefined>();

  const { data: stopRoutes } = useQuery({
    queryKey: queryKeys.libreSakay.stops.routes(viewRoutesStop?.id ?? ''),
    queryFn: () => libreSakayService.getRoutesForStop(viewRoutesStop!.id),
    enabled: !!viewRoutesStop,
  });

  const { data: stops, isLoading } = useQuery({
    queryKey: queryKeys.libreSakay.stops.all,
    queryFn: libreSakayService.getAllStops,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => libreSakayService.deleteStop(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.stops.all });
      toast({ title: 'Stop deleted' });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const total = stops?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? 'Loading...' : `${total} stop${total !== 1 ? 's' : ''} defined`}
        </p>
        <Button onClick={() => setShowForm(true)}>
          <FiPlus className="mr-1.5" size={14} /> Add Stop
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Bus Stops</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Coordinates</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows cols={4} />
            ) : !stops?.length ? (
              <EmptyState
                icon={<FiMapPin />}
                title="No stops yet"
                description="Add bus stop locations to assign them to routes."
                action={
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <FiPlus className="mr-1" size={13} /> Add Stop
                  </Button>
                }
              />
            ) : (
              stops.map((stop, idx) => (
                <TableRow key={stop.id}>
                  <TableCell className="text-gray-400 text-xs font-mono">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{stop.name}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">
                    {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <FiMoreVertical size={15} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewRoutesStop(stop)}>
                          <FiMapPin className="mr-2" size={13} /> View Routes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditStop(stop)}>
                          <FiEdit2 className="mr-2" size={13} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => deleteMutation.mutate(stop.id)}
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

      <StopFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.stops.all })}
      />
      {editStop && (
        <EditStopDialog
          open={!!editStop}
          onClose={() => setEditStop(undefined)}
          stop={editStop}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.stops.all })}
        />
      )}
      <Dialog open={!!viewRoutesStop} onOpenChange={() => setViewRoutesStop(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Routes via {viewRoutesStop?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {!stopRoutes && (
              <p className="text-sm text-gray-400 text-center py-4">Loading routes...</p>
            )}
            {stopRoutes?.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No routes pass through this stop.</p>
            )}
            {stopRoutes?.map(r => (
              <div key={r.route_id} className="flex items-center justify-between border rounded p-2">
                <span className="text-sm">{r.route_name ?? 'Unknown route'}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${r.route_is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {r.route_is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRoutesStop(undefined)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
