/**
 * RegistrationApprovalsPage.jsx
 *
 * BIMS admin page to review and process resident registration requests
 * that come in from the portal.
 *
 * Actions: Approve, Reject, Mark Under Review, Request Resubmission
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import ResidentClassificationsForm from "@/features/barangay/residents/components/ResidentClassificationsForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, Check, X, RefreshCw, FileText } from "lucide-react";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending:               "bg-yellow-100 text-yellow-800",
  under_review:          "bg-blue-100 text-blue-800",
  approved:              "bg-green-100 text-green-800",
  rejected:              "bg-red-100 text-red-800",
  requires_resubmission: "bg-orange-100 text-orange-800",
};

const statusLabel = (s) =>
  (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function RegistrationApprovalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus,    setFilterStatus]    = useState("pending"); // "all" = no filter
  const [search,          setSearch]          = useState("");
  const [adminNotes,      setAdminNotes]      = useState("");
  const [actionType,      setActionType]      = useState(null); // 'approve' | 'reject' | 'resubmit'
  const [page,            setPage]            = useState(1);
  const [perPage,         setPerPage]         = useState(10);
  const [lightboxSrc,     setLightboxSrc]     = useState(null);
  const [classifyResident, setClassifyResident] = useState(null);
  const [classifySaving,  setClassifySaving]  = useState(false);
  const [municipalityId,  setMunicipalityId]  = useState(null);

  // Resolve municipalityId from user context
  useEffect(() => {
    if (!user) return;
    if (user.target_type === "municipality") {
      setMunicipalityId(user.target_id);
    } else if (user.target_type === "barangay" && user.target_id) {
      apiClient
        .get(`/${user.target_id}/barangay`)
        .then((res) => {
          const b = res.data?.data || res.data;
          const mId = b?.municipality_id || b?.municipalityId;
          if (mId) setMunicipalityId(mId);
        })
        .catch(() => {});
    }
  }, [user]);

  const { data, isLoading } = useQuery({
    queryKey: ["registrationRequests", filterStatus, search, page, perPage],
    queryFn: () =>
      apiClient
        .get("/portal-registration/requests", {
          params: {
            status:     filterStatus === "all" ? undefined : filterStatus || undefined,
            search:     search || undefined,
            barangayId: user?.target_type === "barangay" ? user.target_id : undefined,
            page,
            limit: perPage,
          },
        })
        .then((r) => r.data.data),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action, notes }) =>
      apiClient.post(`/portal-registration/requests/${id}/review`, {
        action,
        adminNotes: notes,
      }),
    onSuccess: (_, { action }) => {
      toast({ title: action === "approve" ? "Registration Approved" : "Registration Rejected" });
      queryClient.invalidateQueries({ queryKey: ["registrationRequests"] });
      if (action === "approve" && selectedRequest?.resident) {
        setClassifyResident(selectedRequest.resident);
      }
      setSelectedRequest(null);
      setAdminNotes("");
      setActionType(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || error.message,
      });
    },
  });

  const underReviewMutation = useMutation({
    mutationFn: (id) =>
      apiClient.patch(`/portal-registration/requests/${id}/under-review`),
    onSuccess: () => {
      toast({ title: "Marked as Under Review" });
      queryClient.invalidateQueries({ queryKey: ["registrationRequests"] });
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: ({ id, notes }) =>
      apiClient.post(`/portal-registration/requests/${id}/request-docs`, {
        adminNotes: notes,
      }),
    onSuccess: () => {
      toast({ title: "Resubmission requested" });
      queryClient.invalidateQueries({ queryKey: ["registrationRequests"] });
      setSelectedRequest(null);
      setAdminNotes("");
      setActionType(null);
    },
  });

  const handleAction = () => {
    if (!selectedRequest || !actionType) return;
    if (actionType === "approve" || actionType === "reject") {
      reviewMutation.mutate({ id: selectedRequest.id, action: actionType, notes: adminNotes });
    } else if (actionType === "resubmit") {
      resubmitMutation.mutate({ id: selectedRequest.id, notes: adminNotes });
    }
  };

  const handleClassificationSave = async (formValues) => {
    if (!classifyResident) return;
    const newClassifications = formValues.classifications || [];
    if (newClassifications.length === 0) { setClassifyResident(null); return; }
    setClassifySaving(true);
    try {
      await Promise.all(
        newClassifications.map((c) =>
          apiClient.post("/classification", {
            residentId:            classifyResident.id,
            classificationType:    c.type,
            classificationDetails: c.details || null,
          })
        )
      );
      toast({ title: "Classifications saved" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to save classifications",
        description: err.response?.data?.message || err.message,
      });
    } finally {
      setClassifySaving(false);
      setClassifyResident(null);
    }
  };

  const requests   = data?.requests   || [];
  const pagination = data?.pagination || {};

  const isActionable = (status) => ["pending", "under_review"].includes(status);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Registration Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and process resident registration requests from the portal.
          </p>
        </div>
        <span className="text-sm text-gray-400 self-center shrink-0">
          {pagination?.total ?? 0} total
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="requires_resubmission">Requires Resubmission</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search by name or username…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-9 flex-1 min-w-[200px]"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500 font-medium">No registration requests found</p>
              <p className="text-sm text-gray-400 mt-1">
                {(filterStatus && filterStatus !== "all") || search ? "Try clearing the filters." : "Portal registration requests will appear here."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Barangay</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const r = req.resident;
                  const fullName = r
                    ? `${r.last_name}, ${r.first_name}${r.middle_name ? " " + r.middle_name.charAt(0) + "." : ""}`
                    : "—";
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{fullName}</TableCell>
                      <TableCell className="text-gray-500 text-sm">@{r?.username || "—"}</TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {r?.barangay?.barangay_name || "—"}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm whitespace-nowrap">
                        {req.created_at
                          ? new Date(req.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${STATUS_STYLE[req.status] || "bg-gray-100 text-gray-600"}`}>
                          {statusLabel(req.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedRequest(req); setActionType(null); }}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {req.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => underReviewMutation.mutate(req.id)}
                              disabled={underReviewMutation.isPending}
                              title="Mark under review"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {isActionable(req.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => { setSelectedRequest(req); setActionType("approve"); }}
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {isActionable(req.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => { setSelectedRequest(req); setActionType("reject"); }}
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-xs sm:text-sm text-gray-500">
          Page {page} of {pagination?.totalPages || 1}
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="text-xs sm:text-sm">
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= (pagination?.totalPages || 1)} onClick={() => setPage((p) => p + 1)}
            className="text-xs sm:text-sm">
            Next
          </Button>
        </div>
        <select
          className="w-full sm:w-24 border rounded px-2 py-1 text-xs sm:text-sm"
          value={perPage}
          onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {/* ── Detail View Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!(selectedRequest && !actionType)} onOpenChange={(v) => { if (!v) setSelectedRequest(null); }}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          {selectedRequest && (() => {
            const r   = selectedRequest.resident || {};
            const age = r.birthdate
              ? Math.floor((new Date() - new Date(r.birthdate)) / (365.25 * 24 * 60 * 60 * 1000))
              : null;
            const fullName = [r.first_name, r.middle_name, r.last_name, r.extension_name].filter(Boolean).join(" ") || "—";
            const actionable = isActionable(selectedRequest.status);

            return (
              <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* Left panel */}
                <div className="w-56 flex-shrink-0 bg-gray-50 border-r flex flex-col">
                  <div className="flex flex-col items-center px-5 pt-6 pb-5 border-b">
                    {r.picture_path ? (
                      <img src={r.picture_path} alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md mb-3" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-400 border-4 border-white shadow-md mb-3">
                        {r.first_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <p className="font-bold text-gray-800 text-center text-sm leading-snug">{fullName}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">@{r.username || "—"}</p>
                    <Badge className={`mt-2 text-xs ${STATUS_STYLE[selectedRequest.status] || "bg-gray-100 text-gray-600"}`}>
                      {statusLabel(selectedRequest.status)}
                    </Badge>
                  </div>

                  <div className="px-4 py-4 space-y-2.5 text-xs flex-1">
                    {[
                      ["Barangay",    r.barangay?.barangay_name || "—"],
                      ["Sex",         r.sex ? r.sex.charAt(0).toUpperCase() + r.sex.slice(1) : "—"],
                      ["Age",         age != null ? `${age} yrs old` : "—"],
                      ["Civil Status",r.civil_status ? r.civil_status.replace(/_/g, " ") : "—"],
                      ["Submitted",   selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleDateString("en-PH") : "—"],
                      ["Reviewed",    selectedRequest.reviewed_at ? new Date(selectedRequest.reviewed_at).toLocaleDateString("en-PH") : "—"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-2">
                        <span className="text-gray-400 shrink-0">{label}</span>
                        <span className="text-gray-700 font-medium text-right">{value}</span>
                      </div>
                    ))}
                  </div>

                  {actionable && (
                    <div className="px-4 pb-5 space-y-2">
                      <Button className="w-full text-sm" size="sm"
                        onClick={() => setActionType("approve")}>
                        <Check className="h-3.5 w-3.5 mr-1.5" /> Approve
                      </Button>
                      <Button variant="outline" className="w-full text-sm" size="sm"
                        onClick={() => setActionType("resubmit")}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Request Docs
                      </Button>
                      <Button variant="outline" className="w-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50" size="sm"
                        onClick={() => setActionType("reject")}>
                        <X className="h-3.5 w-3.5 mr-1.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right panel */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
                    <h2 className="text-base font-bold text-gray-800">Registration Details</h2>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">

                    {/* Personal */}
                    <section>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Personal Information</p>
                      <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                        {[
                          ["Birthdate",   r.birthdate ? new Date(r.birthdate).toLocaleDateString("en-PH", { dateStyle: "long" }) : "—"],
                          ["Citizenship", r.citizenship || "—"],
                          ["Height",      r.height || "—"],
                          ["Weight",      r.weight || "—"],
                          ["Email",       r.email || "—"],
                          ["Contact",     r.contact_number || "—"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                            <p className="text-gray-800 font-medium truncate">{value}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Address */}
                    <section>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Address</p>
                      <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">Barangay</p>
                          <p className="text-gray-800 font-medium">{r.barangay?.barangay_name || "—"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400 mb-0.5">Street Address</p>
                          <p className="text-gray-800 font-medium">{r.street_address || "—"}</p>
                        </div>
                      </div>
                    </section>

                    {/* Birthplace */}
                    {(r.birth_region || r.birth_province || r.birth_municipality) && (
                      <section>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Place of Birth</p>
                        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                          {[["Region", r.birth_region], ["Province", r.birth_province], ["Municipality", r.birth_municipality]].map(([label, value]) => (
                            <div key={label}>
                              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                              <p className="text-gray-800 font-medium">{value || "—"}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Socio-economic */}
                    {(r.occupation || r.profession || r.employment_status || r.education_attainment || r.monthly_income != null) && (
                      <section>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Socio-economic</p>
                        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                          {[
                            ["Occupation",     r.occupation],
                            ["Profession",     r.profession],
                            ["Employment",     r.employment_status],
                            ["Education",      r.education_attainment],
                            ["Monthly Income", r.monthly_income != null ? `₱${Number(r.monthly_income).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : null],
                          ].filter(([, v]) => v).map(([label, value]) => (
                            <div key={label}>
                              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                              <p className="text-gray-800 font-medium">{value}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Flags */}
                    {(r.is_voter != null || r.is_employed != null || r.indigenous_person != null) && (
                      <section>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Status Flags</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            ["Registered Voter",  r.is_voter],
                            ["Employed",          r.is_employed],
                            ["Indigenous Person", r.indigenous_person],
                          ].map(([label, val]) => val != null && (
                            <span key={label} className={`px-3 py-1 rounded-full text-xs font-medium border ${val ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                              {val ? "✓" : "✕"} {label}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Emergency / Family */}
                    {(r.emergency_contact_person || r.emergency_contact_number || r.spouse_name || r.acr_no) && (
                      <section>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Emergency &amp; Family</p>
                        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                          {[
                            ["Emergency Contact", r.emergency_contact_person],
                            ["Emergency Number",  r.emergency_contact_number],
                            ["Spouse Name",       r.spouse_name],
                            ["ACR No.",           r.acr_no],
                          ].filter(([, v]) => v).map(([label, value]) => (
                            <div key={label}>
                              <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                              <p className="text-gray-800 font-medium">{value}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Documents */}
                    <section>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Identity Documents</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">ID Type</p>
                          <p className="text-gray-800 font-medium">{r.id_type || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">ID Number</p>
                          <p className="text-gray-800 font-medium font-mono">{r.id_document_number || "—"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          ["Profile Photo",  r.picture_path],
                          ["Selfie with ID", selectedRequest.selfie_url],
                          ["Proof of ID",    r.proof_of_identification],
                        ].map(([label, src]) => src ? (
                          <div key={label}>
                            <p className="text-xs text-gray-400 mb-1.5">{label}</p>
                            <div className="relative group cursor-zoom-in" onClick={() => setLightboxSrc(src)}>
                              <img src={src} alt={label}
                                className="w-full aspect-square object-cover rounded-lg border border-gray-200 group-hover:opacity-80 transition-opacity shadow-sm" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md">Click to expand</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div key={label}>
                            <p className="text-xs text-gray-400 mb-1.5">{label}</p>
                            <div className="w-full aspect-square rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-xs text-gray-300">
                              Not provided
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Admin notes */}
                    {selectedRequest.admin_notes && (
                      <section>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Admin Notes</p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm">
                          {selectedRequest.admin_notes}
                        </div>
                      </section>
                    )}

                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Action Confirmation Dialog ─────────────────────────────────────────── */}
      <Dialog
        open={!!(selectedRequest && actionType)}
        onOpenChange={(v) => {
          if (!v) { setActionType(null); setAdminNotes(""); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Registration"}
              {actionType === "reject"  && "Reject Registration"}
              {actionType === "resubmit" && "Request Resubmission"}
            </DialogTitle>
            {selectedRequest?.resident && (
              <DialogDescription>
                Applicant:{" "}
                <strong>
                  {selectedRequest.resident.first_name} {selectedRequest.resident.last_name}
                </strong>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Admin Notes{" "}
                {actionType === "reject" || actionType === "resubmit" ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-gray-400">(optional)</span>
                )}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={
                  actionType === "approve"
                    ? "Optional notes…"
                    : actionType === "reject"
                    ? "Reason for rejection…"
                    : "What documents or information is needed?"
                }
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[96px]"
              />
            </div>

            {actionType === "approve" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                A Resident ID will be generated. The resident can check their status on the portal.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setActionType(null); setAdminNotes(""); }}
              disabled={reviewMutation.isPending || resubmitMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={
                reviewMutation.isPending ||
                resubmitMutation.isPending ||
                ((actionType === "reject" || actionType === "resubmit") && !adminNotes.trim())
              }
            >
              {reviewMutation.isPending || resubmitMutation.isPending
                ? "Processing…"
                : actionType === "approve"
                ? "Approve"
                : actionType === "reject"
                ? "Reject"
                : "Request Resubmission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Post-approval classification Dialog ───────────────────────────────── */}
      <Dialog open={!!classifyResident} onOpenChange={(v) => { if (!v) setClassifyResident(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                {classifyResident?.first_name?.[0]}{classifyResident?.last_name?.[0]}
              </div>
              <div>
                <DialogTitle className="text-sm">
                  {classifyResident?.first_name}{" "}
                  {classifyResident?.middle_name ? classifyResident.middle_name + " " : ""}
                  {classifyResident?.last_name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Assign classifications — optional, can be updated later
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {classifyResident && (
              <ResidentClassificationsForm
                resident={{ ...classifyResident, classifications: [] }}
                municipalityId={municipalityId}
                loading={classifySaving}
                onSubmit={handleClassificationSave}
                onCancel={() => setClassifyResident(null)}
                showResidentInfo={false}
                showActions={false}
                formId="classification-form"
              />
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 shrink-0">
            <p className="text-xs text-gray-400">
              You can also assign classifications later from Resident Management.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setClassifyResident(null)}>
                Skip
              </Button>
              <Button size="sm" type="submit" form="classification-form" disabled={classifySaving}>
                {classifySaving ? "Saving…" : "Save Classifications"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox ──────────────────────────────────────────────────────────── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <Button
            variant="ghost"
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="h-5 w-5" />
          </Button>
          <img
            src={lightboxSrc}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
