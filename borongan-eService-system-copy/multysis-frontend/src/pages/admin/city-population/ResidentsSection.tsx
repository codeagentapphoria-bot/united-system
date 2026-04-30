/**
 * ResidentsSection.tsx
 *
 * Master-detail residents list for City Population admin.
 * Read-only view — no edit functionality.
 * No DashboardLayout wrapper — parent AdminCityPopulation provides it.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge, LoadingRows, EmptyState } from './shared';
import { residentService, type Resident } from '@/services/api/resident.service';
import { formatDateWithoutTimezone } from '@/lib/utils';
import {
  FiCalendar,
  FiMapPin,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi';

// ── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-heading-700">{value || '—'}</p>
  </div>
);

// ── Resident Detail Panel ────────────────────────────────────────────────────
const ResidentDetailPanel: React.FC<{ resident: Resident }> = ({ resident }) => {
  const fullName = [resident.firstName, resident.middleName, resident.lastName, resident.extensionName]
    .filter(Boolean)
    .join(' ');

  const address = [
    resident.streetAddress,
    resident.barangay?.name,
    resident.barangay?.municipality?.name,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Tabs defaultValue="personal">
      <TabsList className="mb-4">
        <TabsTrigger value="personal">Personal</TabsTrigger>
        <TabsTrigger value="address">Address</TabsTrigger>
        <TabsTrigger value="contact">Contact &amp; IDs</TabsTrigger>
      </TabsList>

      {/* Personal Info */}
      <TabsContent value="personal" className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            {resident.picturePath ? (
              <img
                src={resident.picturePath}
                alt={fullName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <FiUser size={28} className="text-primary-600" />
            )}
          </div>
          <div>
            <p className="font-semibold text-heading-700 text-lg">{fullName}</p>
            {resident.residentId && (
              <p className="text-xs font-mono text-primary-600">{resident.residentId}</p>
            )}
            <StatusBadge variant={resident.status}>{resident.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</StatusBadge>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Sex" value={resident.sex} />
          <InfoRow label="Civil Status" value={resident.civilStatus} />
          <InfoRow label="Birthdate" value={resident.birthdate ? formatDateWithoutTimezone(resident.birthdate) : undefined} />
          <InfoRow label="Citizenship" value={resident.citizenship} />
          <InfoRow label="Occupation" value={resident.occupation} />
          <InfoRow label="Employment" value={resident.employmentStatus} />
          <InfoRow label="Education" value={resident.educationAttainment} />
          <InfoRow label="Monthly Income" value={resident.monthlyIncome ? `₱${Number(resident.monthlyIncome).toLocaleString()}` : undefined} />
        </div>
        {resident.spouseName && (
          <InfoRow label="Spouse" value={resident.spouseName} />
        )}
      </TabsContent>

      {/* Address */}
      <TabsContent value="address" className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <FiMapPin className="text-primary-500 mt-0.5 flex-shrink-0" size={16} />
          <div>
            <p className="font-medium text-heading-700">Current Address</p>
            <p className="text-gray-600">{address || '—'}</p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Barangay" value={resident.barangay?.name} />
          <InfoRow label="Municipality" value={resident.barangay?.municipality?.name} />
          <InfoRow label="Street" value={resident.streetAddress} />
        </div>
        {(resident.birthRegion || resident.birthProvince || resident.birthMunicipality) && (
          <>
            <Separator />
            <p className="font-medium text-heading-700 text-sm">Place of Birth</p>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Region" value={resident.birthRegion} />
              <InfoRow label="Province" value={resident.birthProvince} />
              <InfoRow label="City/Mun" value={resident.birthMunicipality} />
            </div>
          </>
        )}
      </TabsContent>

      {/* Contact & IDs */}
      <TabsContent value="contact" className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Contact No." value={resident.contactNumber} />
          <InfoRow label="Email" value={resident.email} />
          <InfoRow label="Username" value={resident.username} />
        </div>
        <Separator />
        <p className="font-medium text-heading-700">Identification</p>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="ID Type" value={resident.idType} />
          <InfoRow label="ID Number" value={resident.idDocumentNumber} />
          <InfoRow label="ACR No." value={resident.acrNo} />
        </div>
        <Separator />
        <p className="font-medium text-heading-700">Emergency Contact</p>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Name" value={resident.emergencyContactPerson} />
          <InfoRow label="Number" value={resident.emergencyContactNumber} />
        </div>
        <Separator />
        <p className="font-medium text-heading-700 flex items-center gap-1">
          <FiCalendar size={14} /> Record
        </p>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Registered" value={resident.createdAt ? formatDateWithoutTimezone(resident.createdAt) : undefined} />
          <InfoRow label="Last Updated" value={resident.updatedAt ? formatDateWithoutTimezone(resident.updatedAt) : undefined} />
        </div>
        {resident.applicationRemarks && (
          <div>
            <p className="font-medium text-heading-700 mb-1">Remarks</p>
            <p className="text-gray-600 text-sm">{resident.applicationRemarks}</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

// ── Main Section ─────────────────────────────────────────────────────────────
const LIMIT = 12;

export function ResidentsSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['city-pop', 'residents', currentPage, statusFilter, searchQuery],
    queryFn: () =>
      residentService.listResidents({
        page: currentPage,
        limit: LIMIT,
        search: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const residents = data?.residents ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 1;

  const fullName = (r: Resident) =>
    [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="font-medium text-heading-700">{total}</span>
        <span>{statusFilter !== 'all' ? statusFilter : 'total'} resident{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Content — master-detail grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Left: List */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-heading-700 text-lg">All Residents</CardTitle>

            <div className="relative mt-2">
              <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search name, ID, email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9 mt-2">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
                <SelectItem value="moved_out">Moved Out</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <p className="text-xs text-gray-500 mt-2">
              Page {currentPage} of {totalPages} · {total} total
            </p>
          </CardHeader>

          <CardContent className="flex flex-col gap-2">
            {isLoading ? (
              <LoadingRows cols={1} />
            ) : residents.length === 0 ? (
              <EmptyState
                icon={<FiUser />}
                title="No residents found"
                description="Try adjusting your search or filter."
              />
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {residents.map((r) => (
                  <div key={r.id} className="relative">
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-sm ${
                        selectedResident?.id === r.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'hover:border-primary-300'
                      }`}
                      onClick={() => setSelectedResident(r)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-heading-700 text-sm truncate">
                              {fullName(r)}
                            </p>
                            {r.residentId && (
                              <p className="text-xs font-mono text-gray-500 truncate">
                                {r.residentId}
                              </p>
                            )}
                          </div>
                          <StatusBadge variant={r.status}>
                            {r.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </StatusBadge>
                        </div>
                      </CardContent>
                    </Card>
                    {selectedResident?.id === r.id && (
                      <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden xl:block z-20">
                        <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[12px] border-l-primary-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-3 pt-3 border-t">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Detail */}
        <Card className="xl:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-heading-700 text-lg">Resident Information</CardTitle>
              {selectedResident && (
                <button
                  onClick={() => setSelectedResident(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX size={20} />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedResident ? (
              <ResidentDetailPanel resident={selectedResident} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <FiUser size={48} className="mb-3" />
                <p className="text-sm font-medium text-gray-500">Select a resident to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
