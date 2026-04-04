/**
 * PortalProfile.tsx — v3
 *
 * Resident portal: view + edit personal profile.
 * Fetches from GET /api/residents/me and updates via PUT /api/residents/me.
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { LoginPrompt } from '@/components/portal/LoginPrompt';
import { MyApplications } from '@/components/portal/MyApplications';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { residentService, type Resident } from '@/services/api/resident.service';
import {
  getRegions,
  getProvincesByRegion as getPHProvinces,
  getMunicipalitiesByProvince as getPHMunicipalities,
} from '@/constants/philippine-addresses';
import { formatDateWithoutTimezone } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useMyProfile } from '@/hooks/residents/useMyProfile';
import { useMyHousehold } from '@/hooks/portal/useMyHousehold';
import { useMyClassifications } from '@/hooks/portal/useMyClassifications';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  FiCalendar,
  FiEdit2,
  FiFileText,
  FiHome,
  FiMail,
  FiPhone,
  FiUser,
  FiMapPin,
  FiBriefcase,
  FiBook,
  FiHeart,
  FiShield,
  FiSave,
  FiX,
  FiUsers,
  FiExternalLink,
} from 'react-icons/fi';

// ── Constants ──────────────────────────────────────────────────────────────────
const EMPLOYMENT_STATUS_OPTIONS = ['employed', 'self_employed', 'unemployed', 'student', 'retired', 'ofw'];
const EDUCATION_OPTIONS = [
  'no_formal_education', 'elementary', 'high_school', 'senior_high_school',
  'vocational', 'college', 'post_graduate',
];
// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success-100 text-success-700',
  pending: 'bg-warning-100 text-warning-700',
  inactive: 'bg-neutral-200 text-neutral-700',
  rejected: 'bg-red-100 text-red-700',
  deceased: 'bg-gray-300 text-gray-700',
  moved_out: 'bg-blue-100 text-blue-700',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <Badge className={STATUS_STYLES[status.toLowerCase()] ?? 'bg-neutral-200 text-neutral-700'}>
    {status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
  </Badge>
);

// ── Info row ───────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ icon?: React.ReactNode; label: string; value?: string | null }> = ({
  icon, label, value,
}) => (
  <div className="flex items-start gap-3">
    {icon && <span className="text-primary-500 mt-0.5 flex-shrink-0">{icon}</span>}
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-heading-700">{value || '—'}</p>
    </div>
  </div>
);

// ── Field helpers ──────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1">
    <Label className="text-xs text-gray-500">{label}</Label>
    {children}
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}> = ({ label, value, onChange, options, placeholder = 'Select' }) => (
  <Field label={label}>
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Field>
);

// ── Edit form state type ───────────────────────────────────────────────────────
interface EditForm {
  // Personal
  sex: string;
  civilStatus: string;
  birthdate: string;
  citizenship: string;
  spouseName: string;
  isVoter: boolean;
  indigenousPerson: boolean;
  // Place of birth
  birthRegion: string;
  birthProvince: string;
  birthMunicipality: string;
  // Employment & education
  occupation: string;
  profession: string;
  employmentStatus: string;
  isEmployed: boolean;
  educationAttainment: string;
  monthlyIncome: string;
  height: string;
  weight: string;
  // Emergency contact
  emergencyContactPerson: string;
  emergencyContactNumber: string;
  // ID
  idType: string;
  idDocumentNumber: string;
  acrNo: string;
}

const toForm = (r: Resident): EditForm => ({
  sex: r.sex ?? '',
  civilStatus: r.civilStatus ?? '',
  birthdate: r.birthdate ? r.birthdate.split('T')[0] : '',
  citizenship: r.citizenship ?? '',
  spouseName: r.spouseName ?? '',
  isVoter: r.isVoter ?? false,
  indigenousPerson: r.indigenousPerson ?? false,
  birthRegion: r.birthRegion ?? '',
  birthProvince: r.birthProvince ?? '',
  birthMunicipality: r.birthMunicipality ?? '',
  occupation: r.occupation ?? '',
  profession: r.profession ?? '',
  employmentStatus: r.employmentStatus ?? '',
  isEmployed: r.isEmployed ?? false,
  educationAttainment: r.educationAttainment ?? '',
  monthlyIncome: r.monthlyIncome != null ? String(r.monthlyIncome) : '',
  height: r.height ?? '',
  weight: r.weight ?? '',
  emergencyContactPerson: r.emergencyContactPerson ?? '',
  emergencyContactNumber: r.emergencyContactNumber ?? '',
  idType: r.idType ?? '',
  idDocumentNumber: r.idDocumentNumber ?? '',
  acrNo: r.acrNo ?? '',
});

// ── Household types ────────────────────────────────────────────────────────────
interface HouseholdMember {
  member_id: string;
  member_resident_id: string;
  relationship: string;
  resident_name: string;
}
interface HouseholdFamily {
  family_id: number;
  family_group: string;
  family_head: string;
  members: HouseholdMember[];
}

interface Classification {
  id: number;
  classification_type: string;
  type_name: string | null;
  type_color: string | null;
}

// ── Label formatter ────────────────────────────────────────────────────────────
const fmt = (v?: string | null) =>
  v ? v.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : undefined;

export const PortalProfile: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: resident, isLoading } = useMyProfile();
  const { data: household, isLoading: isHouseholdLoading } = useMyHousehold();
  const { data: classifications } = useMyClassifications();

  const [editOpen, setEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);

  const openEdit = () => {
    if (resident) {
      setForm(toForm(resident));
      setEditOpen(true);
    }
  };

  const set = (key: keyof EditForm) => (val: string | boolean) =>
    setForm((prev) => prev ? { ...prev, [key]: val } : prev);

  const handleSave = async () => {
    if (!form) return;
    setIsSaving(true);
    try {
      const payload: Record<string, any> = {
        ...form,
        monthlyIncome: form.monthlyIncome !== '' ? parseFloat(form.monthlyIncome) : null,
      };
      for (const k of Object.keys(payload)) {
        if (payload[k] === '') payload[k] = null;
      }
      await residentService.updateMyProfile(payload);
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile.household });
      setEditOpen(false);
      toast({ title: 'Profile updated', description: 'Your information has been saved.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <PortalLayout><LoginPrompt description="Please log in to view your profile." /></PortalLayout>;
  }
  if (isLoading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading your profile…</div>
      </PortalLayout>
    );
  }
  if (!resident) {
    return (
      <PortalLayout>
        <Card className="max-w-lg mx-auto mt-8">
          <CardContent className="py-10 text-center text-gray-500">
            <FiUser size={48} className="mx-auto mb-4 text-primary-300" />
            <p className="font-medium text-heading-700 mb-1">Profile not yet available</p>
            <p className="text-sm">Your registration may still be under review.</p>
          </CardContent>
        </Card>
      </PortalLayout>
    );
  }

  const fullName = [resident.firstName, resident.middleName, resident.lastName, resident.extensionName]
    .filter(Boolean).join(' ');
  const address = [resident.streetAddress, resident.barangay?.name, resident.barangay?.municipality?.name]
    .filter(Boolean).join(', ');

  return (
    <PortalLayout>
      <div className="max-w-4xl mx-auto space-y-6 px-4 py-12">

        {/* Header */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {resident.picturePath
                  ? <img src={resident.picturePath} alt={fullName} className="w-full h-full object-cover" />
                  : <FiUser size={40} className="text-primary-500" />}
              </div>
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-bold text-heading-800">{fullName}</h2>
                {resident.residentId && (
                  <p className="font-mono text-sm text-primary-600 mt-0.5">{resident.residentId}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                  <StatusBadge status={resident.status} />
                  {resident.username && (
                    <Badge variant="outline" className="text-xs font-mono">@{resident.username}</Badge>
                  )}
                </div>
                {address && (
                  <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5 justify-center sm:justify-start">
                    <FiHome size={13} /> {address}
                  </p>
                )}
                <div className="flex gap-4 mt-2 text-sm justify-center sm:justify-start">
                  <button
                    onClick={() => navigate('/portal/my-household')}
                    className="flex items-center gap-1 text-primary-600 hover:underline"
                  >
                    <FiHome size={13} /> My Household
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="personal">
          <TabsList>
            <TabsTrigger value="personal"><FiUser size={14} className="mr-1.5" /> Personal</TabsTrigger>
            <TabsTrigger value="contact"><FiPhone size={14} className="mr-1.5" /> Contact</TabsTrigger>
            <TabsTrigger value="household"><FiHome size={14} className="mr-1.5" /> Household</TabsTrigger>
            <TabsTrigger value="applications"><FiFileText size={14} className="mr-1.5" /> Applications</TabsTrigger>
          </TabsList>

          {/* ── Personal Tab ── */}
          <TabsContent value="personal" className="space-y-4">

            {/* Edit button — covers all personal sections */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5">
                <FiEdit2 size={13} /> Edit Personal Information
              </Button>
            </div>

            {/* Personal Information */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FiUser size={15} /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow icon={<FiCalendar size={14} />} label="Date of Birth"
                  value={resident.birthdate ? formatDateWithoutTimezone(resident.birthdate, { dateStyle: 'long' }) : undefined} />
                <InfoRow label="Sex" value={fmt(resident.sex)} />
                <InfoRow label="Civil Status" value={fmt(resident.civilStatus)} />
                <InfoRow label="Citizenship" value={resident.citizenship} />
                <InfoRow icon={<FiHeart size={14} />} label="Spouse Name" value={resident.spouseName} />
                <InfoRow label="Registered Voter"
                  value={resident.isVoter === true ? 'Yes' : resident.isVoter === false ? 'No' : undefined} />
                <InfoRow label="Indigenous Person"
                  value={resident.indigenousPerson === true ? 'Yes' : resident.indigenousPerson === false ? 'No' : undefined} />
              </CardContent>
            </Card>

            {/* Place of Birth */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><FiMapPin size={15} /> Place of Birth</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <InfoRow label="Region" value={resident.birthRegion} />
                <InfoRow label="Province" value={resident.birthProvince} />
                <InfoRow label="City / Municipality" value={resident.birthMunicipality} />
              </CardContent>
            </Card>

            {/* Employment & Education */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><FiBriefcase size={15} /> Employment & Education</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow label="Occupation" value={resident.occupation} />
                <InfoRow label="Profession" value={resident.profession} />
                <InfoRow label="Employment Status" value={fmt(resident.employmentStatus)} />
                <InfoRow label="Employed"
                  value={resident.isEmployed === true ? 'Yes' : resident.isEmployed === false ? 'No' : undefined} />
                <InfoRow icon={<FiBook size={14} />} label="Education Attainment" value={fmt(resident.educationAttainment)} />
                <InfoRow label="Monthly Income"
                  value={resident.monthlyIncome != null ? `₱${Number(resident.monthlyIncome).toLocaleString()}` : undefined} />
              </CardContent>
            </Card>

            {/* Physical */}
            {(resident.height || resident.weight) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Physical Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <InfoRow label="Height" value={resident.height} />
                  <InfoRow label="Weight" value={resident.weight} />
                </CardContent>
              </Card>
            )}

            {/* Classification & Programs (from BIMS) */}
            {(classifications?.length ?? 0) > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FiShield size={15} /> Classification & Programs
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {classifications.map((c: Classification) => (
                    <Badge
                      key={c.id}
                      style={
                        c.type_color
                          ? { backgroundColor: c.type_color + '22', color: c.type_color, borderColor: c.type_color + '44' }
                          : undefined
                      }
                      variant="outline"
                    >
                      {c.type_name ?? fmt(c.classification_type)}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Contact Tab ── */}
          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><FiPhone size={15} /> Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow icon={<FiPhone size={14} />} label="Contact Number" value={resident.contactNumber} />
                <InfoRow icon={<FiMail size={14} />} label="Email Address" value={resident.email} />
                <InfoRow icon={<FiMapPin size={14} />} label="Street Address" value={resident.streetAddress} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><FiHeart size={15} /> Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow label="Name" value={resident.emergencyContactPerson} />
                <InfoRow label="Contact Number" value={resident.emergencyContactNumber} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><FiShield size={15} /> Identification</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow label="ID Type" value={resident.idType} />
                <InfoRow label="ID Number" value={resident.idDocumentNumber} />
                {resident.acrNo && <InfoRow label="ACR No." value={resident.acrNo} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Household Tab ── */}
          <TabsContent value="household" className="space-y-4">
            {isHouseholdLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                Loading household data…
              </div>
            ) : household === null ? (
              <Card>
                <CardContent className="py-10 text-center space-y-4">
                  <FiHome size={44} className="mx-auto text-primary-300" />
                  <div>
                    <p className="font-medium text-heading-700 mb-1">No household registered yet</p>
                    <p className="text-sm text-gray-500">
                      Register your household to link family members and manage your residence information.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate('/portal/my-household')}
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    <FiHome size={15} className="mr-2" /> Register Household
                  </Button>
                </CardContent>
              </Card>
            ) : household ? (
              <>
                {/* Household Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FiHome size={15} /> Household Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <InfoRow label="House Number" value={household.house_number} />
                    <InfoRow label="Street" value={household.street} />
                    <InfoRow label="Barangay" value={household.barangay_name} />
                    <InfoRow label="Municipality" value={household.municipality_name} />
                    <InfoRow label="Housing Type" value={fmt(household.housing_type)} />
                    <InfoRow label="Electricity" value={household.electricity ? 'Yes' : 'No'} />
                    <InfoRow label="Water Source" value={fmt(household.water_source)} />
                    <InfoRow label="Toilet Facility" value={fmt(household.toilet_facility)} />
                  </CardContent>
                </Card>

                {/* Family Members */}
                {(household?.families?.length ?? 0) > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FiUsers size={15} /> Family Members
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {household.families.map((fam: HouseholdFamily) => (
                        <div key={fam.family_id}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            {fam.family_group}
                          </p>
                          <div className="space-y-2">
                            {fam.members.map((m: HouseholdMember) => (
                              <div
                                key={m.member_id}
                                className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                              >
                                <div>
                                  <span className="font-medium text-heading-700">{m.resident_name}</span>
                                  <span className="ml-2 text-gray-500 text-xs">{m.relationship}</span>
                                </div>
                                <span className="font-mono text-xs text-gray-400">{m.member_resident_id}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => navigate('/portal/my-household')}
                    className="flex items-center gap-1.5 text-sm text-primary-600 hover:underline"
                  >
                    Manage Household <FiExternalLink size={13} />
                  </button>
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* ── Applications Tab ── */}
          <TabsContent value="applications">
            <MyApplications />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Personal Information</DialogTitle>
          </DialogHeader>

          {!form ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
              <svg className="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading your information…
            </div>
          ) : (
            <>
              <div className="space-y-6 py-2">

                {/* Personal Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Date of Birth">
                      <Input value={form.birthdate} onChange={(e) => set('birthdate')(e.target.value)}
                        type="date" max={new Date().toISOString().split('T')[0]} className="h-9 text-sm" />
                    </Field>
                    <SelectField label="Sex" value={form.sex}
                      onChange={(v) => set('sex')(v)} options={['male', 'female']} />
                    <SelectField label="Civil Status" value={form.civilStatus}
                      onChange={(v) => set('civilStatus')(v)}
                      options={['single', 'married', 'widowed', 'separated', 'divorced', 'live_in', 'annulled']} />
                    <Field label="Citizenship">
                      <Input value={form.citizenship} onChange={(e) => set('citizenship')(e.target.value)}
                        placeholder="e.g. Filipino" className="h-9 text-sm" />
                    </Field>
                    <Field label="Spouse Name">
                      <Input value={form.spouseName} onChange={(e) => set('spouseName')(e.target.value)}
                        placeholder="Full name" className="h-9 text-sm" />
                    </Field>
                    <Field label="Registered Voter">
                      <Select value={form.isVoter ? 'true' : 'false'} onValueChange={(v) => set('isVoter')(v === 'true')}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Indigenous Person">
                      <Select value={form.indigenousPerson ? 'true' : 'false'} onValueChange={(v) => set('indigenousPerson')(v === 'true')}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>

                {/* Place of Birth */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Place of Birth</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Region */}
                    <Field label="Region">
                      <Select
                        value={form.birthRegion || ''}
                        onValueChange={(v) => {
                          set('birthRegion')(v);
                          set('birthProvince')('');
                          set('birthMunicipality')('');
                        }}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {getRegions().map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    {/* Province — depends on region */}
                    <Field label="Province">
                      <Select
                        value={form.birthProvince || ''}
                        onValueChange={(v) => {
                          set('birthProvince')(v);
                          set('birthMunicipality')('');
                        }}
                        disabled={!form.birthRegion}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={form.birthRegion ? 'Select province' : 'Select region first'} />
                        </SelectTrigger>
                        <SelectContent>
                          {getPHProvinces(form.birthRegion).map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    {/* City / Municipality — depends on region + province */}
                    <Field label="City / Municipality">
                      <Select
                        value={form.birthMunicipality || ''}
                        onValueChange={(v) => set('birthMunicipality')(v)}
                        disabled={!form.birthRegion || !form.birthProvince}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={!form.birthProvince ? 'Select province first' : 'Select city/municipality'} />
                        </SelectTrigger>
                        <SelectContent>
                          {getPHMunicipalities(form.birthRegion, form.birthProvince).map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>

                {/* Employment & Education */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Employment & Education</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Occupation">
                      <Input value={form.occupation} onChange={(e) => set('occupation')(e.target.value)}
                        placeholder="e.g. Teacher" className="h-9 text-sm" />
                    </Field>
                    <Field label="Profession">
                      <Input value={form.profession} onChange={(e) => set('profession')(e.target.value)}
                        placeholder="e.g. Registered Nurse" className="h-9 text-sm" />
                    </Field>
                    <SelectField label="Employment Status" value={form.employmentStatus}
                      onChange={(v) => set('employmentStatus')(v)} options={EMPLOYMENT_STATUS_OPTIONS} />
                    <Field label="Employed">
                      <Select value={form.isEmployed ? 'true' : 'false'} onValueChange={(v) => set('isEmployed')(v === 'true')}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <SelectField label="Education Attainment" value={form.educationAttainment}
                      onChange={(v) => set('educationAttainment')(v)} options={EDUCATION_OPTIONS} />
                    <Field label="Monthly Income (₱)">
                      <Input value={form.monthlyIncome} onChange={(e) => set('monthlyIncome')(e.target.value)}
                        type="number" min="0" placeholder="0.00" className="h-9 text-sm" />
                    </Field>
                    <Field label="Height">
                      <Input value={form.height} onChange={(e) => set('height')(e.target.value)}
                        placeholder="e.g. 165cm" className="h-9 text-sm" />
                    </Field>
                    <Field label="Weight">
                      <Input value={form.weight} onChange={(e) => set('weight')(e.target.value)}
                        placeholder="e.g. 60kg" className="h-9 text-sm" />
                    </Field>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Name">
                      <Input value={form.emergencyContactPerson} onChange={(e) => set('emergencyContactPerson')(e.target.value)}
                        placeholder="Full name" className="h-9 text-sm" />
                    </Field>
                    <Field label="Contact Number">
                      <Input value={form.emergencyContactNumber} onChange={(e) => set('emergencyContactNumber')(e.target.value)}
                        placeholder="09XXXXXXXXX" className="h-9 text-sm" />
                    </Field>
                  </div>
                </div>

                {/* Identification */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Identification</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="ID Type">
                      <Input value={form.idType} onChange={(e) => set('idType')(e.target.value)}
                        placeholder="e.g. PhilSys National ID" className="h-9 text-sm" />
                    </Field>
                    <Field label="ID Number">
                      <Input value={form.idDocumentNumber} onChange={(e) => set('idDocumentNumber')(e.target.value)}
                        placeholder="ID number" className="h-9 text-sm" />
                    </Field>
                    <Field label="ACR No.">
                      <Input value={form.acrNo} onChange={(e) => set('acrNo')(e.target.value)}
                        placeholder="ACR number (if applicable)" className="h-9 text-sm" />
                    </Field>
                  </div>
                </div>

              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t">
                <Button variant="outline" onClick={() => setEditOpen(false)} className="gap-1.5">
                  <FiX size={14} /> Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
                  <FiSave size={14} /> {isSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
};
