import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { libreSakayService } from '@/services/api/libre-sakay.service';
import type { Route, Stop, RouteStopJunction } from './types';
import { StatusBadge, LoadingRows, EmptyState } from './shared';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FiGitBranch, FiMapPin, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// =============================================================================
// ROUTE FORM DIALOG
// =============================================================================

function RouteFormDialog({
  open,
  onClose,
  route,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  route?: Route;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(route?.name ?? '');
  const [desc, setDesc] = useState(route?.description ?? '');
  const mutation = useMutation({
    mutationFn: route
      ? (data: unknown) => libreSakayService.updateRoute(route.id, data as Parameters<typeof libreSakayService.updateRoute>[1])
      : (data: unknown) => libreSakayService.createRoute(data as Parameters<typeof libreSakayService.createRoute>[0]),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  React.useEffect(() => {
    if (route) {
      setName(route.name);
      setDesc(route.description ?? '');
    } else {
      setName('');
      setDesc('');
    }
  }, [route, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{route ? 'Edit Route' : 'Add Route'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate({ name, description: desc || undefined })}
            disabled={mutation.isPending || !name}
          >
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.stops(route.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });
  const removeMutation = useMutation({
    mutationFn: (stopId: string) => libreSakayService.removeStopFromRoute(route.id, stopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.stops(route.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });
  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => libreSakayService.reorderStopsInRoute(route.id, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.stops(route.id) });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });
  const replaceMutation = useMutation({
    mutationFn: ({ oldId, newId }: { oldId: string; newId: string }) =>
      libreSakayService.replaceStopInRoute(route.id, oldId, newId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.stops(route.id) });
      setReplaceStopId(null);
      setNewStopId('');
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const [selectedStopId, setSelectedStopId] = useState('');
  const [replaceStopId, setReplaceStopId] = useState<string | null>(null);
  const [newStopId, setNewStopId] = useState('');
  const assignedStopIds = new Set((routeStops ?? []).map((rs: RouteStopJunction) => rs.stops.id));

  const handleAssign = () => {
    if (!selectedStopId) return;
    assignMutation.mutate(selectedStopId);
    setSelectedStopId('');
  };

  const handleMove = (stopId: string, direction: 'up' | 'down') => {
    const sorted = [...(routeStops ?? [])].sort(
      (a: RouteStopJunction, b: RouteStopJunction) => a.sequence_order - b.sequence_order
    );
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
        <DialogHeader>
          <DialogTitle>Manage Stops — {route.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="text-sm font-medium text-gray-500">
            {isLoading ? 'Loading stops...' : `${routeStops?.length ?? 0} stop(s) assigned`}
          </p>
          {routeStops
            ?.sort((a: RouteStopJunction, b: RouteStopJunction) => a.sequence_order - b.sequence_order)
            .map((rs: RouteStopJunction, idx: number) => (
              <div key={rs.stops.id} className="flex items-center justify-between border rounded p-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{idx + 1}</span>
                  <span className="text-sm">{rs.stops.name}</span>
                  <span className="text-xs text-gray-400">
                    {rs.stops.latitude.toFixed(4)}, {rs.stops.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {replaceStopId === rs.stops.id ? (
                    <>
                      <Select value={newStopId} onValueChange={setNewStopId}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Replacement stop" />
                        </SelectTrigger>
                        <SelectContent>
                          {(allStops ?? [])
                            .filter((s: Stop) => s.id !== rs.stops.id && !assignedStopIds.has(s.id))
                            .map((s: Stop) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => replaceMutation.mutate({ oldId: rs.stops.id, newId: newStopId })}
                        disabled={!newStopId || replaceMutation.isPending}
                      >
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setReplaceStopId(null); setNewStopId(''); }}>
                        ×
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleMove(rs.stops.id, 'up')} disabled={idx === 0}>
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMove(rs.stops.id, 'down')}
                        disabled={idx === (routeStops?.length ?? 0) - 1}
                      >
                        ↓
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReplaceStopId(rs.stops.id)}>
                        Replace
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeMutation.mutate(rs.stop_id)}
                        disabled={removeMutation.isPending}
                      >
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          {!isLoading && (routeStops?.length ?? 0) === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No stops assigned yet.</p>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Select value={selectedStopId} onValueChange={setSelectedStopId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a stop to add" />
            </SelectTrigger>
            <SelectContent>
              {(allStops ?? [])
                .filter((s: Stop) => !assignedStopIds.has(s.id))
                .map((s: Stop) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAssign} disabled={!selectedStopId || assignMutation.isPending}>
            Add
          </Button>
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
// ROUTES TAB
// =============================================================================

export function RoutesTab() {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all });
      toast({ title: 'Route deleted' });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      libreSakayService.updateRoute(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all }),
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const routes = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? routes.length;
  const from = (page - 1) * 20 + 1;
  const to = Math.min(page * 20, total);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? 'Loading...' : `${total} route${total !== 1 ? 's' : ''} configured`}
        </p>
        <Button
          onClick={() => {
            setEditRoute(undefined);
            setShowForm(true);
          }}
        >
          <FiPlus className="mr-1.5" size={14} /> Add Route
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Bus Routes</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Stops</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows cols={5} />
            ) : routes.length === 0 ? (
              <EmptyState
                icon={<FiGitBranch />}
                title="No routes yet"
                description="Define bus routes before assigning buses and stops."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditRoute(undefined);
                      setShowForm(true);
                    }}
                  >
                    <FiPlus className="mr-1" size={13} /> Add Route
                  </Button>
                }
              />
            ) : (
              routes.map(route => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">{route.name}</TableCell>
                  <TableCell className="text-gray-500 text-sm max-w-xs truncate">
                    {route.description ?? <span className="text-gray-400 text-xs italic">No description</span>}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <FiMapPin size={12} className="text-gray-400" />
                      {route.route_stops?.[0]?.count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={route.is_active} />
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
                            setEditRoute(route);
                            setShowForm(true);
                          }}
                        >
                          <FiEdit2 className="mr-2" size={13} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setManageRoute(route)}>
                          <FiMapPin className="mr-2" size={13} /> Manage Stops
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMutation.mutate({ id: route.id, is_active: !route.is_active })}
                        >
                          {route.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => deleteMutation.mutate(route.id)}
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
            Showing {from}–{to} of {total} routes
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

      <RouteFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        route={editRoute}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.routes.all })}
      />
      {manageRoute && (
        <ManageStopsDialog open={!!manageRoute} onClose={() => setManageRoute(undefined)} route={manageRoute} />
      )}
    </div>
  );
}
