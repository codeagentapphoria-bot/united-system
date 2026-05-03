import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FiDownload, FiUserX, FiUserCheck, FiUser } from 'react-icons/fi';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { libreSakayBeneficiaryService } from '@/services/api/libre-sakay-beneficiary.service';
import type { BeneficiaryListItem } from '@/services/api/libre-sakay-beneficiary.service';
import { BeneficiariesTable } from './BeneficiariesTable';
import { BeneficiaryDetailsModal } from './BeneficiaryDetailsModal';
import { RemoveBeneficiaryDialog } from './RemoveBeneficiaryDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardHeader } from '@/components/ui/card';

type FilterTab = 'all' | 'active' | 'suspended';

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

function SuspendActivateDialog({
  open,
  onClose,
  beneficiary,
  action,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  beneficiary: BeneficiaryListItem | null;
  action: 'suspend' | 'activate';
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      action === 'suspend'
        ? libreSakayBeneficiaryService.suspend(beneficiary!.id)
        : libreSakayBeneficiaryService.activate(beneficiary!.id),
    onSuccess: () => {
      const now = new Date().toISOString();
      const newStatus: 'ACTIVE' | 'INACTIVE' = action === 'suspend' ? 'INACTIVE' : 'ACTIVE';
      const newSuspendedAt = action === 'suspend' ? now : null;

      // Directly read and update every cached beneficiary query by exact key
      for (const key of queryClient.getQueryCache().getAll().map(q => q.queryKey)) {
        if (Array.isArray(key) && key[0] === 'libreSakay' && key[1] === 'beneficiaries') {
          queryClient.setQueryData(key, (old: any) => {
            if (!old) return old;
            if (Array.isArray(old)) {
              return old.map((b: BeneficiaryListItem) =>
                b.id === beneficiary!.id
                  ? { ...b, enrollmentStatus: newStatus, suspendedAt: newSuspendedAt }
                  : b
              );
            }
            if (old?.data) {
              return {
                ...old,
                data: old.data.map((b: BeneficiaryListItem) =>
                  b.id === beneficiary!.id
                    ? { ...b, enrollmentStatus: newStatus, suspendedAt: newSuspendedAt }
                    : b
                ),
              };
            }
            return old;
          });
        }
      }

      toast({ title: `Beneficiary ${action === 'suspend' ? 'suspended' : 'activated'} successfully` });
      onSuccess();
      onClose();
    },
    onError: (e: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === 'suspend' ? (
              <>
                <FiUserX className="text-amber-500" />
                Suspend Beneficiary
              </>
            ) : (
              <>
                <FiUserCheck className="text-green-600" />
                Activate Beneficiary
              </>
            )}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {action === 'suspend'
              ? `Are you sure you want to suspend ${beneficiary?.fullName}? They will lose access to the Libre Sakay program.`
              : `Are you sure you want to activate ${beneficiary?.fullName}? They will regain access to the Libre Sakay program.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant={action === 'suspend' ? 'destructive' : 'default'}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={action === 'activate' ? 'bg-green-600 hover:bg-green-700' : undefined}
          >
            {mutation.isPending
              ? 'Processing...'
              : action === 'suspend'
              ? 'Suspend'
              : 'Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BeneficiariesTab() {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [suspendActivate, setSuspendActivate] = useState<{ id: string; action: 'suspend' | 'activate' } | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const LIMIT = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.libreSakay.beneficiaries.list(filter, page, search),
    queryFn: () =>
      libreSakayBeneficiaryService.list({
        filter,
        page,
        limit: LIMIT,
        search: search || undefined,
      }),
    placeholderData: prev => prev,
  });

  const beneficiaryMap = new Map((data?.data ?? []).map(b => [b.id, b]));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleView = (id: string) => {
    setSelectedId(id);
    setDetailsOpen(true);
  };

  const handleSuspend = (id: string) => {
    setSuspendActivate({ id, action: 'suspend' });
  };

  const handleActivate = (id: string) => {
    setSuspendActivate({ id, action: 'activate' });
  };

  const handleRemove = (id: string) => {
    setRemoveId(id);
  };

  const handleExport = () => {
    libreSakayBeneficiaryService.exportAsBlob(filter);
  };

  const totalPages = data?.pagination.totalPages ?? 1;
  const total = data?.pagination.total ?? 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {FILTER_TABS.map(tab => (
            <Button
              key={tab.value}
              size="sm"
              variant={filter === tab.value ? 'default' : 'outline'}
              onClick={() => { setFilter(tab.value); setPage(1); }}
              className={filter === tab.value ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            placeholder="Search by name or resident ID..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            >
              Clear
            </Button>
          )}
        </form>

        {/* Export */}
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FiDownload className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {isLoading ? 'Loading...' : `${total} beneficiary${total !== 1 ? 'ies' : ''} ${filter === 'all' ? 'enrolled' : filter === 'active' ? 'active' : 'suspended'}`}
            </p>
          </div>
        </CardHeader>
        <Table>
          <BeneficiariesTable
            data={data?.data ?? []}
            isLoading={isLoading}
            onView={handleView}
            onSuspend={handleSuspend}
            onActivate={handleActivate}
            onRemove={handleRemove}
            emptyTitle="No beneficiaries found"
            emptyDescription="Beneficiaries enrolled in the Libre Sakay program will appear here."
            emptyIcon={<FiUser />}
          />
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} — {data?.pagination.total ?? 0} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isFetching}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <BeneficiaryDetailsModal
        id={selectedId}
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setSelectedId(null); }}
      />

      {suspendActivate && (
        <SuspendActivateDialog
          open
          onClose={() => setSuspendActivate(null)}
          beneficiary={beneficiaryMap.get(suspendActivate.id) ?? null}
          action={suspendActivate.action}
          onSuccess={() => setSuspendActivate(null)}
        />
      )}

      <RemoveBeneficiaryDialog
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        beneficiaryId={removeId}
        beneficiaryName={
          removeId ? beneficiaryMap.get(removeId)?.fullName ?? null : null
        }
        onSuccess={() => {
      queryClient.refetchQueries({ queryKey: queryKeys.libreSakay.beneficiaries.all });
          setRemoveId(null);
        }}
      />
    </div>
  );
}
