import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { libreSakayService } from '@/services/api/libre-sakay.service';
import type { Driver, Bus } from './types';
import { StatusBadge, LoadingRows, EmptyState } from './shared';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FiUsers, FiPlus, FiMoreVertical, FiEdit2, FiTrash2, FiTruck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DeleteConfirmModal } from '@/components/modals/libre-sakay/DeleteConfirmModal';
import { DeactivateDriverModal } from '@/components/modals/libre-sakay/DeactivateDriverModal';

// =============================================================================
// DRIVER FORM DIALOG (with password confirmation)
// =============================================================================

function DriverFormDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: unknown) =>
      libreSakayService.createDriver(data as Parameters<typeof libreSakayService.createDriver>[0]),
    onSuccess: () => {
      onSuccess();
      onClose();
      toast({ title: 'Driver created successfully' });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  React.useEffect(() => {
    if (open) {
      setEmail('');
      setName('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
      setPasswordError('');
    }
  }, [open]);

  const handleConfirmPassword = (value: string) => {
    setConfirmPassword(value);
    if (value !== password && value.length > 0) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (confirmPassword.length > 0 && value !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  };

  const isFormValid =
    email && name && phone && password && confirmPassword && !passwordError && password === confirmPassword;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Driver</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => handlePasswordChange(e.target.value)}
              placeholder="Minimum 6 characters"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => handleConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
            {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate({ email, full_name: name, phone, password })}
            disabled={mutation.isPending || !isFormValid}
          >
            {mutation.isPending ? 'Creating...' : 'Create Driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// EDIT DRIVER DIALOG
// =============================================================================

function EditDriverDialog({
  open,
  onClose,
  driver,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  driver: Driver;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(driver.full_name);
  const [phone, setPhone] = useState(driver.phone ?? '');
  const [isActive, setIsActive] = useState(driver.is_active);
  const mutation = useMutation({
    mutationFn: (data: unknown) =>
      libreSakayService.updateDriver(driver.id, data as Parameters<typeof libreSakayService.updateDriver>[1]),
    onSuccess: () => {
      onSuccess();
      onClose();
      toast({ title: 'Driver updated successfully' });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  React.useEffect(() => {
    if (driver) {
      setName(driver.full_name);
      setPhone(driver.phone ?? '');
      setIsActive(driver.is_active);
    }
  }, [driver]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Driver — {driver.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm font-medium">
              Active
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate({ full_name: name, phone, is_active: isActive })}
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
// ASSIGN BUS DIALOG
// =============================================================================

function AssignBusDialog({
  open,
  onClose,
  driver,
}: {
  open: boolean;
  onClose: () => void;
  driver: Driver;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: buses } = useQuery({
    queryKey: queryKeys.libreSakay.buses.list(1, 100),
    queryFn: () => libreSakayService.getBuses(1, 100),
  });
  const assignMutation = useMutation({
    mutationFn: (busId: string) => libreSakayService.assignBusToDriver(driver.id, busId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all });
      toast({ title: 'Bus assigned successfully' });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });
  const unassignMutation = useMutation({
    mutationFn: (busId: string) => libreSakayService.unassignBusFromDriver(driver.id, busId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all });
      toast({ title: 'Bus unassigned successfully' });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const [selectedBusId, setSelectedBusId] = useState('');
  const assignedBusIds = new Set((driver.driver_buses || []).map(db => db.buses?.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Buses — {driver.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(driver.driver_buses || []).map(db => (
            <div key={db.id} className="flex items-center justify-between border rounded p-2">
              <span>{db.buses?.plate_number || 'Unknown'}</span>
              <Button
                size="sm"
                variant="destructive"
                disabled={!db.buses?.id || unassignMutation.isPending}
                onClick={() => {
                  if (db.buses?.id) unassignMutation.mutate(db.buses.id);
                }}
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
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a bus" />
            </SelectTrigger>
            <SelectContent>
              {(buses?.data ?? [])
                .filter((b: Bus) => !assignedBusIds.has(b.id) && b.is_active)
                .map((b: Bus) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.plate_number} ({b.capacity} seats)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              if (selectedBusId) {
                assignMutation.mutate(selectedBusId);
                setSelectedBusId('');
              }
            }}
            disabled={!selectedBusId || assignMutation.isPending}
          >
            Assign
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
// DRIVERS TAB
// =============================================================================

export function DriversTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | undefined>();
  const [assignDriver, setAssignDriver] = useState<Driver | undefined>();

  // Deactivate / Reactivate modal
  const [deactivateModal, setDeactivateModal] = useState<{ open: boolean; driver: Driver | null }>({
    open: false,
    driver: null,
  });

  // Permanent delete modal
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; driver: Driver | null }>({
    open: false,
    driver: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.libreSakay.drivers.list(page),
    queryFn: () => libreSakayService.getDrivers(page, 20),
  });

  // Toggle deactivate/reactivate
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      libreSakayService.updateDriver(id, { is_active: isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all });
      toast({ title: isActive ? 'Driver deactivated' : 'Driver reactivated' });
      setDeactivateModal({ open: false, driver: null });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  // Hard delete (permanent)
  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => libreSakayService.hardDeleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all });
      toast({ title: 'Driver deleted permanently' });
      setDeleteModal({ open: false, driver: null });
    },
    onError: (e: unknown) => {
      toast({ variant: 'destructive', title: 'Error', description: (e as Error).message });
    },
  });

  const drivers = data?.data ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? drivers.length;
  const from = (page - 1) * 20 + 1;
  const to = Math.min(page * 20, total);

  // Derive isDeactivating from the modal driver state before resetting
  const handleDeactivateConfirm = () => {
    const driver = deactivateModal.driver;
    if (!driver) return;
    const isDeactivating = driver.is_active === true;
    toggleMutation.mutate({ id: driver.id, isActive: !isDeactivating });
  };

  const handleDeleteConfirm = () => {
    const driver = deleteModal.driver;
    if (!driver) return;
    hardDeleteMutation.mutate(driver.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? 'Loading...' : `${total} driver${total !== 1 ? 's' : ''} enrolled`}
        </p>
        <Button onClick={() => setShowForm(true)}>
          <FiPlus className="mr-1.5" size={14} /> Add Driver
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Driver Roster</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Assigned Bus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows cols={6} />
            ) : drivers.length === 0 ? (
              <EmptyState
                icon={<FiUsers />}
                title="No drivers yet"
                description="Enroll drivers to assign them to buses and routes."
                action={
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <FiPlus className="mr-1" size={13} /> Add Driver
                  </Button>
                }
              />
            ) : (
              drivers.map(driver => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.full_name}</TableCell>
                  <TableCell className="text-sm text-gray-500">{driver.email}</TableCell>
                  <TableCell>{driver.phone ?? <span className="text-gray-400 text-xs">—</span>}</TableCell>
                  <TableCell>
                    {(driver.driver_buses || [])
                      .map(db => db.buses?.plate_number || 'Unknown')
                      .join(', ') || <span className="text-gray-400 text-xs">None</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge active={driver.is_active} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <FiMoreVertical size={15} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditDriver(driver)}>
                          <FiEdit2 className="mr-2" size={13} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssignDriver(driver)}>
                          <FiTruck className="mr-2" size={13} /> Manage Buses
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {/* Deactivate / Reactivate */}
                        <DropdownMenuItem
                          className={driver.is_active ? 'text-amber-600 focus:text-amber-600' : 'text-green-600 focus:text-green-600'}
                          onClick={() => setDeactivateModal({ open: true, driver })}
                        >
                          {driver.is_active ? 'Deactivate Driver' : 'Reactivate Driver'}
                        </DropdownMenuItem>
                        {/* Permanent delete */}
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteModal({ open: true, driver })}
                        >
                          <FiTrash2 className="mr-2" size={13} /> Delete Permanently
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
            Showing {from}–{to} of {total} drivers
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

      <DriverFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all })}
      />
      {editDriver && (
        <EditDriverDialog
          open={!!editDriver}
          onClose={() => setEditDriver(undefined)}
          driver={editDriver}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: queryKeys.libreSakay.drivers.all })}
        />
      )}
      {assignDriver && (
        <AssignBusDialog
          open={!!assignDriver}
          onClose={() => setAssignDriver(undefined)}
          driver={assignDriver}
        />
      )}

      {/* Deactivate / Reactivate confirmation modal */}
      <DeactivateDriverModal
        open={deactivateModal.open}
        onClose={() => setDeactivateModal({ open: false, driver: null })}
        onConfirm={handleDeactivateConfirm}
        driverName={deactivateModal.driver?.full_name ?? ''}
        isDeactivating={deactivateModal.driver?.is_active === true}
        isLoading={toggleMutation.isPending}
      />

      {/* Permanent delete confirmation modal */}
      <DeleteConfirmModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, driver: null })}
        onConfirm={handleDeleteConfirm}
        itemName={deleteModal.driver?.full_name ?? ''}
        itemType="Driver"
        description="This will permanently remove the driver and cannot be undone."
        isLoading={hardDeleteMutation.isPending}
      />
    </div>
  );
}
