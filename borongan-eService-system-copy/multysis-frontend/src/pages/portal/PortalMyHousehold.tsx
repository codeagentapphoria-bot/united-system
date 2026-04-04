/**
 * PortalMyHousehold.tsx
 *
 * Resident portal page: self-register a household (2-step form) and manage
 * family members after registration.
 *
 * Step 1 — Household Information: all fields from the households table.
 * Step 2 — Family Members: add members by Resident ID before submitting.
 *
 * All API calls go through the shared `api` axios instance (E-Services backend,
 * VITE_API_BASE_URL) so the resident's auth cookie is always in scope.
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { HouseholdLocation } from '@/components/portal/HouseholdMapPicker';

// Lazy-load the map to avoid SSR/bundle issues with Leaflet
const HouseholdMapPicker = lazy(() => import('@/components/portal/HouseholdMapPicker'));

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api/auth.service';
import { PortalHeader } from '@/components/layout/PortalHeader';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RELATIONSHIPS = [
  'Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Grandchild',
  'In-law', 'Aunt/Uncle', 'Niece/Nephew', 'Cousin', 'Other',
];

const HOUSING_TYPES   = ['Permanent', 'Semi-permanent', 'Makeshift', 'Informal Settler'];
const STRUCTURE_TYPES = ['Concrete', 'Hollow Blocks', 'Wood', 'Bamboo', 'Mixed'];
const WATER_SOURCES   = ['Faucet / NAWASA', 'Deep Well', 'Spring', 'Communal Water', 'Bought from vendor'];
const TOILET_TYPES    = ['Flush toilet (water-sealed)', 'Pit privy', 'Communal toilet', 'None'];

const HOUSEHOLD_STEPS = [
  { num: 1, title: 'Household Information', desc: 'Address and housing details' },
  { num: 2, title: 'Family Members',        desc: 'Add members to your household' },
];

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const householdInfoSchema = z.object({
  houseNumber:    z.string().optional(),
  street:         z.string().optional(),
  housingType:    z.string().optional(),
  structureType:  z.string().optional(),
  electricity:    z.string().optional(), // "Yes" | "No"
  waterSource:    z.string().optional(),
  toiletFacility: z.string().optional(),
  area:           z.string().optional(), // numeric string, sqm
});

const addMemberSchema = z.object({
  residentId:         z.string().min(1, 'Resident ID is required'),
  relationshipToHead: z.string().optional(),
  familyGroup:        z.string().optional(),
});

const postRegAddMemberSchema = z.object({
  memberResidentId:   z.string().min(1, 'Resident ID is required'),
  relationshipToHead: z.string().optional(),
  familyGroup:        z.string().optional(),
});

type HouseholdInfoData    = z.infer<typeof householdInfoSchema>;
type AddMemberFormData    = z.infer<typeof addMemberSchema>;
type PostRegAddMemberData = z.infer<typeof postRegAddMemberSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingMember {
  residentId:         string;
  relationshipToHead: string;
  familyGroup:        string;
}

// ---------------------------------------------------------------------------
// Helper: group pending members by family group name
// ---------------------------------------------------------------------------
function groupByFamily(members: PendingMember[]): Record<string, PendingMember[]> {
  return members.reduce<Record<string, PendingMember[]>>((acc, m) => {
    const key = m.familyGroup || 'Main Family';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const PortalMyHousehold: React.FC = () => {
  const { user }  = useAuth();
  const { toast } = useToast();

  // Registration flow state
  const [step, setStep]                     = useState<1 | 2>(1);
  const [savedInfo, setSavedInfo]           = useState<HouseholdInfoData | null>(null);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<HouseholdLocation | null>(null);
  const [householdImagePath, setHouseholdImagePath] = useState<string | null>(null);
  const [householdImagePreview, setHouseholdImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Post-registration state
  const [household, setHousehold]           = useState<any>(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberOpen, setAddMemberOpen]   = useState(false);

  const residentId = (user as any)?.id;
  const isActive   = (user as any)?.status === 'active';

  // Step 1 form
  const infoForm = useForm<HouseholdInfoData>({
    resolver: zodResolver(householdInfoSchema),
    defaultValues: {},
  });

  // Step 2 inline add-member form
  const addMemberForm = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { residentId: '', relationshipToHead: '', familyGroup: 'Main Family' },
  });

  // Post-registration add-member dialog form
  const postRegForm = useForm<PostRegAddMemberData>({
    resolver: zodResolver(postRegAddMemberSchema),
    defaultValues: { memberResidentId: '', relationshipToHead: '', familyGroup: 'Main Family' },
  });

  useEffect(() => {
    if (!residentId || !isActive) { setIsLoading(false); return; }
    loadHousehold();
  }, [residentId]);

  // -------------------------------------------------------------------------
  // Image upload
  // -------------------------------------------------------------------------
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHouseholdImagePreview(URL.createObjectURL(file));
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/households/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHouseholdImagePath(res.data.data.path);
    } catch {
      toast({ variant: 'destructive', title: 'Image upload failed' });
      setHouseholdImagePath(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------
  const loadHousehold = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/portal/household/my');
      setHousehold(response.data.data);
    } catch {
      setHousehold(null);
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Step 1 → Step 2
  // -------------------------------------------------------------------------
  const handleStep1Submit = (data: HouseholdInfoData) => {
    setSavedInfo(data);
    setStep(2);
  };

  // -------------------------------------------------------------------------
  // Step 2: add a pending member to the local list
  // -------------------------------------------------------------------------
  const handleAddPendingMember = (data: AddMemberFormData) => {
    const group = (data.familyGroup || 'Main Family').trim();

    if (pendingMembers.some((m) => m.residentId === data.residentId)) {
      toast({ variant: 'destructive', title: 'Duplicate', description: 'That Resident ID is already in the list.' });
      return;
    }

    setPendingMembers((prev) => [
      ...prev,
      {
        residentId:         data.residentId.trim(),
        relationshipToHead: data.relationshipToHead || '',
        familyGroup:        group,
      },
    ]);
    addMemberForm.reset({ residentId: '', relationshipToHead: '', familyGroup: group });
  };

  const removePendingMember = (rid: string) => {
    setPendingMembers((prev) => prev.filter((m) => m.residentId !== rid));
  };

  // -------------------------------------------------------------------------
  // Final registration submit
  // -------------------------------------------------------------------------
  const handleRegisterHousehold = async () => {
    if (!savedInfo) return;
    setIsSubmitting(true);

    const grouped         = groupByFamily(pendingMembers);
    const familiesPayload = Object.entries(grouped).map(([groupName, members]) => ({
      groupName,
      members: members.map((m) => ({
        residentId:         m.residentId,
        relationshipToHead: m.relationshipToHead || null,
      })),
    }));

    try {
      await api.post('/portal/household', {
        houseNumber:    savedInfo.houseNumber    || null,
        street:         savedInfo.street         || null,
        housingType:    savedInfo.housingType    || null,
        structureType:  savedInfo.structureType  || null,
        electricity:    savedInfo.electricity === 'Yes',
        waterSource:    savedInfo.waterSource    || null,
        toiletFacility: savedInfo.toiletFacility || null,
        area:                 savedInfo.area ? parseFloat(savedInfo.area) : null,
        geom:                 selectedLocation ?? null,
        barangayId:           (user as any)?.barangay?.id ?? null,
        householdImagePath:   householdImagePath ?? null,
        families:             familiesPayload,
      });
      toast({ title: 'Household registered successfully!' });
      loadHousehold();
    } catch (error: any) {
      const message = error.response?.data?.message ?? error.message;
      toast({ variant: 'destructive', title: 'Registration failed', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Post-registration: add a member via dialog
  // -------------------------------------------------------------------------
  const handlePostRegAddMember = async (data: PostRegAddMemberData) => {
    if (!household?.id) return;
    setIsAddingMember(true);
    try {
      const response = await api.post(`/portal/household/${household.id}/members`, {
        memberResidentId:   data.memberResidentId,
        relationshipToHead: data.relationshipToHead || null,
        familyGroup:        (data.familyGroup || 'Main Family').trim(),
      });
      toast({ title: 'Member added', description: response.data.member?.name });
      setAddMemberOpen(false);
      postRegForm.reset({ memberResidentId: '', relationshipToHead: '', familyGroup: 'Main Family' });
      loadHousehold();
    } catch (error: any) {
      const message = error.response?.data?.message ?? error.message;
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setIsAddingMember(false);
    }
  };

  // -------------------------------------------------------------------------
  // Post-registration: remove a member
  // -------------------------------------------------------------------------
  const handleRemoveMember = async (memberId: string) => {
    if (!household?.id) return;
    try {
      await api.delete(`/portal/household/${household.id}/members/${memberId}`);
      toast({ title: 'Member removed' });
      loadHousehold();
    } catch (error: any) {
      const message = error.response?.data?.message ?? error.message;
      toast({ variant: 'destructive', title: 'Error', description: message });
    }
  };

  // -------------------------------------------------------------------------
  // Guards
  // -------------------------------------------------------------------------
  if (!isActive) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <PortalHeader />
        <div className="max-w-2xl mx-auto py-8 px-4 w-full">
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <p className="text-yellow-800">
                Your account must be active to register a household. Please wait for your
                registration to be approved.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <PortalHeader />
        <div className="text-center py-12 text-gray-400">Loading household...</div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: existing household
  // -------------------------------------------------------------------------
  if (household) {
    const isHead = household.house_head === residentId;

    const memberCount = household.families?.reduce(
      (acc: number, f: any) => acc + (f.members?.length ?? 0), 0
    ) ?? 0;

    return (
      <div className="min-h-screen flex flex-col bg-neutral-50">
        <PortalHeader />
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT SIDEBAR */}
          <aside className="hidden md:flex w-72 lg:w-80 flex-col flex-shrink-0 bg-gradient-to-br from-primary-700 to-primary-900 text-white p-8 overflow-y-auto">
            <div className="mb-8">
              <img src="/logo-white.svg" alt="LGU" className="h-10 w-auto mb-4" onError={(e) => { (e.target as HTMLImageElement).src = '/logo-colored.svg'; }} />
              <h1 className="text-xl font-bold leading-tight">My Household</h1>
              <p className="text-primary-200 text-sm mt-1">Manage your household information and members.</p>
            </div>

            <div className="space-y-4 flex-1">
              {/* Address summary */}
              <div className="bg-white/10 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-300">Address</p>
                {household.house_number && <p>{household.house_number} {household.street}</p>}
                {!household.house_number && household.street && <p>{household.street}</p>}
                <p>{household.barangay_name}</p>
                <p className="text-primary-200">{household.municipality_name}</p>
              </div>

              {/* Stats */}
              <div className="bg-white/10 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-300">Household</p>
                <div className="flex justify-between">
                  <span className="text-primary-200">Members</span>
                  <span className="font-bold">{memberCount}</span>
                </div>
                {household.housing_type && (
                  <div className="flex justify-between">
                    <span className="text-primary-200">Type</span>
                    <span>{household.housing_type}</span>
                  </div>
                )}
                {household.area != null && (
                  <div className="flex justify-between">
                    <span className="text-primary-200">Area</span>
                    <span>{household.area} sqm</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 bg-white/10 rounded-xl p-4 text-xs text-primary-200 leading-relaxed">
              <p className="font-semibold text-white mb-1">💡 Tip</p>
              <p>As house head, you can add or remove members at any time using the button on the right.</p>
            </div>
          </aside>

          {/* RIGHT CONTENT */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
              {/* Mobile header */}
              <div className="md:hidden">
                <div className="flex items-center gap-3 mb-1">
                  <img src="/logo-colored.svg" alt="LGU" className="h-8 w-auto" />
                  <h1 className="font-bold text-gray-800">My Household</h1>
                </div>
              </div>

              <div className="pb-4 border-b">
                <h2 className="text-xl font-bold text-gray-800">My Household</h2>
                <p className="text-sm text-gray-500">{household.barangay_name}, {household.municipality_name}</p>
              </div>

        {/* Household Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Household Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <InfoRow label="House / Lot No."  value={household.house_number} />
              <InfoRow label="Street"            value={household.street} />
              <InfoRow label="Barangay"          value={household.barangay_name} />
              <InfoRow label="Municipality"      value={household.municipality_name} />
              <InfoRow label="Housing Type"      value={household.housing_type} />
              <InfoRow label="Structure Type"    value={household.structure_type} />
              <InfoRow
                label="Electricity"
                value={
                  household.electricity === true  ? 'Yes' :
                  household.electricity === false ? 'No'  : undefined
                }
              />
              <InfoRow label="Water Source"    value={household.water_source} />
              <InfoRow label="Toilet Facility" value={household.toilet_facility} />
              {household.area != null && (
                <InfoRow label="Area" value={`${household.area} sqm`} />
              )}
            </div>
            {household.geom_lat != null && household.geom_lng != null && (
              <Suspense fallback={<div className="h-48 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">Loading map…</div>}>
                <HouseholdMapPicker
                  barangayId={household.barangay_id}
                  value={{ lat: Number(household.geom_lat), lng: Number(household.geom_lng) }}
                  onChange={() => {}}
                  readOnly
                />
              </Suspense>
            )}
            {(() => {
              try {
                const images = typeof household.household_image_path === 'string'
                  ? JSON.parse(household.household_image_path)
                  : household.household_image_path;
                if (Array.isArray(images) && images.length > 0) {
                  return (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Photo</p>
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') ?? ''}${images[0]}`}
                        alt="Household"
                        className="h-48 w-full rounded-md object-cover border"
                      />
                    </div>
                  );
                }
              } catch { /* ignore */ }
              return null;
            })()}
          </CardContent>
        </Card>

        {/* Family Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Family Members</CardTitle>
              <CardDescription className="text-xs">
                {isHead
                  ? 'As house head you can add and remove members.'
                  : 'You can remove yourself from this household.'}
              </CardDescription>
            </div>
            {isHead && (
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">+ Add Member</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Family Member</DialogTitle>
                  </DialogHeader>
                  <Form {...postRegForm}>
                    <form
                      className="space-y-4"
                      onSubmit={postRegForm.handleSubmit(handlePostRegAddMember)}
                    >
                      <FormField
                        control={postRegForm.control}
                        name="memberResidentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resident ID *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. BIMS-2025-0000002"
                                className="font-mono"
                              />
                            </FormControl>
                            <p className="text-xs text-gray-400">
                              Enter the Resident ID of the person to add.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={postRegForm.control}
                        name="relationshipToHead"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship to House Head</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select relationship" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {RELATIONSHIPS.map((r) => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={postRegForm.control}
                        name="familyGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Family Group</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. Main Family" />
                            </FormControl>
                            <p className="text-xs text-gray-400">
                              Leave as "Main Family" or type a group name.
                            </p>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isAddingMember}>
                        {isAddingMember ? 'Adding...' : 'Add Member'}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>

          <CardContent>
            {!household.families || household.families.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No family members yet.{isHead ? ' Use the button above to add members.' : ''}
              </p>
            ) : (
              <div className="space-y-5">
                {household.families.map((family: any) => (
                  <div key={family.family_id}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {family.family_group}
                    </p>
                    <div className="space-y-2">
                      {(family.members || []).map((m: any) => (
                        <div
                          key={m.member_id}
                          className="flex items-center justify-between border rounded-md px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{m.resident_name}</p>
                            <p className="text-xs text-gray-500">
                              {m.relationship || 'Member'}
                              <span className="mx-1">·</span>
                              <span className="font-mono">
                                {m.member_resident_id || m.member_id}
                              </span>
                            </p>
                          </div>
                          {(isHead || m.member_id === residentId) && (
                            <button
                              onClick={() => handleRemoveMember(m.member_id)}
                              className="text-xs text-red-500 hover:text-red-700 ml-2"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: registration form (step 1 or step 2)
  // -------------------------------------------------------------------------
  const currentHouseholdStep = HOUSEHOLD_STEPS[step - 1];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <PortalHeader />
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <aside className="hidden md:flex w-72 lg:w-80 flex-col flex-shrink-0 bg-gradient-to-br from-primary-700 to-primary-900 text-white p-8 overflow-y-auto">
          <div className="mb-8">
            <img src="/logo-white.svg" alt="LGU" className="h-10 w-auto mb-4" onError={(e) => { (e.target as HTMLImageElement).src = '/logo-colored.svg'; }} />
            <h1 className="text-xl font-bold leading-tight">Household Registration</h1>
            <p className="text-primary-200 text-sm mt-1">Complete both steps to register your household.</p>
          </div>

          {/* Step list */}
          <nav className="space-y-2 flex-1">
            {HOUSEHOLD_STEPS.map(s => {
              const isDone    = step > s.num;
              const isCurrent = step === s.num;
              return (
                <div
                  key={s.num}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 transition-colors ${
                    isCurrent ? 'bg-white/20' : isDone ? 'opacity-70' : 'opacity-40'
                  }`}
                >
                  <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isDone    ? 'bg-green-400 text-green-900' :
                    isCurrent ? 'bg-white text-primary-700'  :
                                'bg-white/20 text-white'
                  }`}>
                    {isDone ? '✓' : s.num}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isCurrent ? 'text-white' : 'text-primary-100'}`}>{s.title}</p>
                    <p className="text-xs text-primary-300">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Bottom tip */}
          <div className="mt-8 bg-white/10 rounded-xl p-4 text-xs text-primary-200 leading-relaxed">
            <p className="font-semibold text-white mb-1">💡 What happens next?</p>
            <p>Your household will be linked to your barangay record and visible to the barangay administrator.</p>
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">

            {/* Mobile step header */}
            <div className="md:hidden mb-6">
              <div className="flex items-center gap-3 mb-3">
                <img src="/logo-colored.svg" alt="LGU" className="h-8 w-auto" />
                <div>
                  <h1 className="font-bold text-gray-800">Household Registration</h1>
                  <p className="text-xs text-gray-500">Step {step} of 2 — {currentHouseholdStep.title}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {HOUSEHOLD_STEPS.map(s => (
                  <div key={s.num} className={`flex-1 h-1 rounded-full ${step >= s.num ? 'bg-primary-600' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>

            {/* Step heading */}
            <div className="mb-6 pb-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">{currentHouseholdStep.title}</h2>
              <p className="text-sm text-gray-500">{currentHouseholdStep.desc}</p>
            </div>

      {/* ------------------------------------------------------------------ */}
      {/* STEP 1: Household Information                                        */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <Form {...infoForm}>
              <form
                className="space-y-4"
                onSubmit={infoForm.handleSubmit(handleStep1Submit)}
              >
                {/* Address */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Address
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={infoForm.control}
                    name="houseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>House / Lot No.</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. 12" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={infoForm.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Rizal St." />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Housing Details */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Housing Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={infoForm.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area (sqm)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="0" placeholder="e.g. 60" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={infoForm.control}
                    name="housingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Housing Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HOUSING_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={infoForm.control}
                    name="structureType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Structure Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STRUCTURE_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Utilities */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Utilities
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={infoForm.control}
                    name="electricity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Electricity</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={infoForm.control}
                    name="waterSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Water Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {WATER_SOURCES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={infoForm.control}
                  name="toiletFacility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Toilet Facility</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TOILET_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Location */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Household Location
                </p>
                <Suspense fallback={<div className="h-72 rounded-md border bg-muted flex items-center justify-center text-sm text-muted-foreground">Loading map…</div>}>
                  <HouseholdMapPicker
                    barangayId={(user as any)?.barangay?.id ?? null}
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                  />
                </Suspense>

                <Separator />

                {/* Household Photo */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Household Photo
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Photo of Household (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isUploadingImage}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50"
                  />
                  {isUploadingImage && (
                    <p className="text-xs text-muted-foreground">Uploading image...</p>
                  )}
                  {householdImagePreview && (
                    <img
                      src={householdImagePreview}
                      alt="Household preview"
                      className="h-40 w-full rounded-md object-cover border"
                    />
                  )}
                </div>

                <Button type="submit" className="w-full mt-2">
                  Next: Add Family Members
                </Button>
              </form>
        </Form>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2: Family Members                                               */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary of step 1 */}
          <Card className="bg-muted/40">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Household Info (Step 1)
              </CardTitle>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-primary hover:underline"
              >
                Edit
              </button>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {savedInfo?.houseNumber    && <span><b>House No.:</b> {savedInfo.houseNumber}</span>}
              {savedInfo?.street         && <span><b>Street:</b> {savedInfo.street}</span>}
              {savedInfo?.housingType    && <span><b>Housing:</b> {savedInfo.housingType}</span>}
              {savedInfo?.structureType  && <span><b>Structure:</b> {savedInfo.structureType}</span>}
              {savedInfo?.electricity    && <span><b>Electricity:</b> {savedInfo.electricity}</span>}
              {savedInfo?.waterSource    && <span><b>Water:</b> {savedInfo.waterSource}</span>}
              {savedInfo?.toiletFacility && <span><b>Toilet:</b> {savedInfo.toiletFacility}</span>}
              {savedInfo?.area           && <span><b>Area:</b> {savedInfo.area} sqm</span>}
              {selectedLocation && (
                <span className="col-span-2">
                  <b>Location:</b>{' '}
                  <span className="font-mono">{selectedLocation.lat.toFixed(5)}, {selectedLocation.lng.toFixed(5)}</span>
                </span>
              )}
              {householdImagePreview && (
                <div className="col-span-2 mt-1">
                  <b className="block mb-1">Photo:</b>
                  <img
                    src={householdImagePreview}
                    alt="Household"
                    className="h-28 rounded-md object-cover border"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add member inline form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 2 — Family Members</CardTitle>
              <CardDescription>
                Add family members using their Resident ID (e.g. BIMS-2025-0000002). You can
                also skip this and add them after registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Form {...addMemberForm}>
                <form
                  className="space-y-3"
                  onSubmit={addMemberForm.handleSubmit(handleAddPendingMember)}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={addMemberForm.control}
                      name="residentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resident ID *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. BIMS-2025-0000002"
                              className="font-mono text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addMemberForm.control}
                      name="relationshipToHead"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship to Head</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RELATIONSHIPS.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={addMemberForm.control}
                    name="familyGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family Group</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Main Family" />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Use the same name to group members together (e.g. "Main Family",
                          "Extended Family").
                        </p>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    + Add to List
                  </Button>
                </form>
              </Form>

              {/* Pending member list */}
              {pendingMembers.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Members to be added ({pendingMembers.length})
                  </p>
                  <div className="space-y-4">
                    {Object.entries(groupByFamily(pendingMembers)).map(([group, members]) => (
                      <div key={group}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          <Badge variant="secondary" className="text-xs">{group}</Badge>
                        </p>
                        <div className="space-y-1.5">
                          {members.map((m) => (
                            <div
                              key={m.residentId}
                              className="flex items-center justify-between border rounded px-3 py-1.5 text-sm"
                            >
                              <span className="font-mono text-xs">{m.residentId}</span>
                              <span className="text-muted-foreground text-xs mx-2">
                                {m.relationshipToHead || '—'}
                              </span>
                              <button
                                type="button"
                                onClick={() => removePendingMember(m.residentId)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={handleRegisterHousehold}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Register Household'}
            </Button>
          </div>
        </div>
      )}
          </div>
        </main>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// InfoRow: labeled field for the household detail view
// ---------------------------------------------------------------------------
const InfoRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <p>
      <span className="font-medium text-gray-700">{label}:</span>{' '}
      <span className="text-gray-600">{value}</span>
    </p>
  );
};
