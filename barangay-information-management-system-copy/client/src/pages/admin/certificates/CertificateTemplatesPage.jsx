/**
 * CertificateTemplatesPage.jsx
 *
 * Municipality admin page to manage HTML certificate templates.
 * Templates are municipality-wide — all barangays use the same template
 * per certificate type.
 *
 * Route: /admin/municipality/certificate-templates
 *
 * Features:
 *   - List all templates for the municipality
 *   - Create a new template (→ TemplateEditorPage)
 *   - Edit an existing template (→ TemplateEditorPage)
 *   - Activate / deactivate a template
 *   - Delete a template (with confirmation)
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Certificate type labels ───────────────────────────────────────────────────
const CERTIFICATE_TYPE_LABELS = {
  barangay_clearance:    "Barangay Clearance",
  indigency:             "Certificate of Indigency",
  residency:             "Certificate of Residency",
  good_moral:            "Good Moral Character",
  solo_parent:           "Solo Parent",
  low_income:            "Low Income",
  burial_assistance:     "Burial Assistance",
  cohabitation:          "Cohabitation",
  first_time_job_seeker: "First Time Job Seeker",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function CertificateTemplatesPage() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { toast }    = useToast();
  const queryClient  = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const municipalityId = user?.target_id;

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["certificate-templates", municipalityId],
    queryFn: () =>
      apiClient
        .get(`/certificates/templates?municipalityId=${municipalityId}`)
        .then((r) => r.data.data),
    enabled: !!municipalityId,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      apiClient
        .put(`/certificates/templates/${id}`, { isActive })
        .then((r) => r.data.data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries(["certificate-templates"]);
      toast({
        title: updated.is_active ? "Template activated" : "Template deactivated",
      });
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Error",
        description: err.response?.data?.message || err.message,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      apiClient.delete(`/certificates/templates/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries(["certificate-templates"]);
      toast({ title: "Template deleted" });
      setDeleteId(null);
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err.response?.data?.message || err.message,
      }),
  });

  const templates = data || [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Certificate Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage HTML templates used to generate barangay certificates.
            Templates are shared across all barangays in the municipality.
          </p>
        </div>
        <Button
          onClick={() => navigate("/admin/municipality/certificate-templates/new")}
        >
          + New Template
        </Button>
      </div>

      {/* Template list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-700">
            {isLoading
              ? "Loading…"
              : `${templates.length} Template${templates.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Loading templates…
            </div>
          ) : templates.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 font-medium">No templates yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Create your first template to enable certificate generation.
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate("/admin/municipality/certificate-templates/new")}
              >
                Create First Template
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="py-4 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm">
                        {t.name}
                      </span>
                      <Badge
                        className={`text-xs ${
                          t.is_active
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {t.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {CERTIFICATE_TYPE_LABELS[t.certificate_type] ||
                        t.certificate_type}
                      {t.description && ` — ${t.description}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last updated:{" "}
                      {new Date(t.updated_at).toLocaleDateString("en-PH", {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      disabled={toggleMutation.isLoading}
                      onClick={() =>
                        toggleMutation.mutate({ id: t.id, isActive: !t.is_active })
                      }
                    >
                      {t.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() =>
                        navigate(`/admin/municipality/certificate-templates/${t.id}`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        setDeleteId(t.id);
                        setDeleteName(t.name);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How-it-works info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">How certificate templates work</p>
        <p>
          Templates are HTML documents with{" "}
          <code className="bg-blue-100 px-1 rounded font-mono text-xs">
            {"{{ placeholder }}"}
          </code>{" "}
          tokens. When staff generates a certificate, tokens are replaced with
          live data from the database.
        </p>
        <p>
          Available tokens include:{" "}
          <code className="font-mono text-xs">resident.fullName</code>,{" "}
          <code className="font-mono text-xs">barangay.name</code>,{" "}
          <code className="font-mono text-xs">officials.captain</code>,{" "}
          <code className="font-mono text-xs">request.purpose</code>, and more.
        </p>
        <p>
          Click <strong>Edit</strong> to open the HTML editor with a full
          placeholder reference panel.
        </p>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteName}</strong>. Staff will no longer be able to
              generate certificates of this type until a new template is
              uploaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isLoading}
            >
              {deleteMutation.isLoading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
