/**
 * AdminSubscribers.tsx  (now: Admin Residents)
 *
 * Previously managed "subscribers" — now displays the unified residents list.
 * Residents are no longer created here; they self-register via the portal.
 * Admins can: view, edit, activate, deactivate, mark deceased, mark moved out.
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { adminMenuItems } from '@/config/admin-menu';
import { useResidents } from '@/hooks/residents/useResidents';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDateWithoutTimezone } from '@/lib/utils';
import { residentService, type Resident } from '@/services/api/resident.service';
import React, { useState } from 'react';
import {
  FiCalendar,
  FiDownload,
  FiEdit,
  FiMapPin,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi';

// ── Status badge helper ───────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  active:    'bg-success-100 text-success-700',
  pending:   'bg-warning-100 text-warning-700',
  inactive:  'bg-neutral-200 text-neutral-700',
  rejected:  'bg-red-100 text-red-700',
  deceased:  'bg-gray-300 text-gray-700',
  moved_out: 'bg-blue-100 text-blue-700',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <Badge className={STATUS_STYLES[status.toLowerCase()] ?? 'bg-neutral-200 text-neutral-700'}>
    {status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
  </Badge>
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
            <StatusBadge status={resident.status} />
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Sex"          value={resident.sex} />
          <InfoRow label="Civil Status" value={resident.civilStatus} />
          <InfoRow label="Birthdate"    value={resident.birthdate ? formatDateWithoutTimezone(resident.birthdate) : undefined} />
          <InfoRow label="Citizenship"  value={resident.citizenship} />
          <InfoRow label="Occupation"   value={resident.occupation} />
          <InfoRow label="Employment"   value={resident.employmentStatus} />
          <InfoRow label="Education"    value={resident.educationAttainment} />
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
          <InfoRow label="Barangay"     value={resident.barangay?.name} />
          <InfoRow label="Municipality" value={resident.barangay?.municipality?.name} />
          <InfoRow label="Street"       value={resident.streetAddress} />
        </div>
        {(resident.birthRegion || resident.birthProvince || resident.birthMunicipality) && (
          <>
            <Separator />
            <p className="font-medium text-heading-700 text-sm">Place of Birth</p>
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="Region"   value={resident.birthRegion} />
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
          <InfoRow label="Email"       value={resident.email} />
          <InfoRow label="Username"    value={resident.username} />
        </div>
        <Separator />
        <p className="font-medium text-heading-700">Identification</p>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="ID Type"    value={resident.idType} />
          <InfoRow label="ID Number"  value={resident.idDocumentNumber} />
          <InfoRow label="ACR No."    value={resident.acrNo} />
        </div>
        <Separator />
        <p className="font-medium text-heading-700">Emergency Contact</p>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Name"   value={resident.emergencyContactPerson} />
          <InfoRow label="Number" value={resident.emergencyContactNumber} />
        </div>
        <Separator />
        <p className="font-medium text-heading-700 flex items-center gap-1">
          <FiCalendar size={14} /> Record
        </p>
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Registered"    value={resident.createdAt ? formatDateWithoutTimezone(resident.createdAt) : undefined} />
          <InfoRow label="Last Updated"  value={resident.updatedAt ? formatDateWithoutTimezone(resident.updatedAt) : undefined} />
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

const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-heading-700">{value || '—'}</p>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export const AdminSubscribers: React.FC = () => {
  const {
    residents,
    isLoading,
    total,
    totalPages,
    currentPage,
    selectedResident,
    setSelectedResident,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    handlePageChange,
    refresh,
  } = useResidents({ limit: 12 });

  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleStatusChange = async (
    action: 'activate' | 'deactivate' | 'deceased' | 'moved-out',
    label: string
  ) => {
    if (!selectedResident) return;
    setIsWorking(true);
    try {
      let updated: Resident;
      if (action === 'activate')   updated = await residentService.activate(selectedResident.id);
      else if (action === 'deactivate') updated = await residentService.deactivate(selectedResident.id);
      else if (action === 'deceased')   updated = await residentService.markDeceased(selectedResident.id);
      else                              updated = await residentService.markMovedOut(selectedResident.id);

      setSelectedResident(updated);
      refresh();
      toast({ title: 'Success', description: `Resident marked as ${label}` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsWorking(false);
    }
  };

  const handleDownload = () => {
    const headers = ['Resident ID', 'Last Name', 'First Name', 'Middle Name', 'Sex', 'Birthdate', 'Barangay', 'Contact', 'Email', 'Status'];
    const rows = residents.map((r) => [
      r.residentId ?? '',
      r.lastName,
      r.firstName,
      r.middleName ?? '',
      r.sex ?? '',
      r.birthdate ?? '',
      r.barangay?.name ?? '',
      r.contactNumber ?? '',
      r.email ?? '',
      r.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `residents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fullName = (r: Resident) =>
    [r.firstName, r.middleName, r.lastName].filter(Boolean).join(' ');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">Residents</h2>
            <p className="text-sm text-gray-500 mt-1">
              Registered residents — {total} total
            </p>
          </div>
          <Button
            variant="outline"
            className="text-primary-600 hover:bg-primary-50"
            onClick={handleDownload}
          >
            <FiDownload size={16} className="mr-2" /> Export CSV
          </Button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

          {/* Left: List */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-heading-700 text-lg">Residents List</CardTitle>

              <div className="relative mt-2">
                <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search name, ID, email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                <p className="text-center py-8 text-gray-500 text-sm">Loading…</p>
              ) : residents.length === 0 ? (
                <p className="text-center py-8 text-gray-500 text-sm">No residents found.</p>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {residents.map((r) => (
                    <div key={r.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-sm',
                          selectedResident?.id === r.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
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
                            <StatusBadge status={r.status} />
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
                    onPageChange={handlePageChange}
                    onPrevious={() => handlePageChange(Math.max(1, currentPage - 1))}
                    onNext={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
                  <div className="flex flex-wrap gap-2">
                    {selectedResident.status === 'active' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => handleStatusChange('deactivate', 'inactive')}
                          disabled={isWorking}
                        >
                          Deactivate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-gray-600 border-gray-200 hover:bg-gray-50"
                          onClick={() => handleStatusChange('deceased', 'deceased')}
                          disabled={isWorking}
                        >
                          Mark Deceased
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={() => handleStatusChange('moved-out', 'moved out')}
                          disabled={isWorking}
                        >
                          Mark Moved Out
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusChange('activate', 'active')}
                        disabled={isWorking}
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-primary-600 hover:bg-primary-50"
                      onClick={() => setIsEditOpen(true)}
                    >
                      <FiEdit size={14} className="mr-1" /> Edit
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="max-h-[680px] overflow-y-auto">
              {selectedResident ? (
                <ResidentDetailPanel resident={selectedResident} />
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <FiUser size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a resident to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image lightbox */}
      {isImageOpen && selectedResident?.picturePath && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setIsImageOpen(false)}
        >
          <div
            className="bg-white rounded-xl p-4 max-w-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setIsImageOpen(false)}
            >
              <FiX size={22} />
            </button>
            <img
              src={selectedResident.picturePath}
              alt={fullName(selectedResident)}
              className="rounded-lg max-h-[75vh] object-cover"
            />
          </div>
        </div>
      )}

      {/* TODO: EditResidentModal — Step 8 will implement inline editing */}
      {isEditOpen && selectedResident && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-heading-700">Edit Resident</h3>
              <button onClick={() => setIsEditOpen(false)}>
                <FiX size={20} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Full resident editing is coming in the next update. For now, use the BIMS portal
              or the resident's own profile to update personal information.
            </p>
            <Button className="w-full" onClick={() => setIsEditOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
