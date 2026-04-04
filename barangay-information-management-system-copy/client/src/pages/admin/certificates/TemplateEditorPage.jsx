/**
 * TemplateEditorPage.jsx
 *
 * Full-screen HTML editor for creating and editing certificate templates.
 * Used by municipality admins only.
 *
 * Routes:
 *   /admin/municipality/certificate-templates/new   → create new template
 *   /admin/municipality/certificate-templates/:id   → edit existing template
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Eye, Save } from "lucide-react";

// ── Certificate type options ──────────────────────────────────────────────────
const CERTIFICATE_TYPES = [
  { value: "barangay_clearance",    label: "Barangay Clearance" },
  { value: "indigency",             label: "Certificate of Indigency" },
  { value: "residency",             label: "Certificate of Residency" },
  { value: "good_moral",            label: "Good Moral Character" },
  { value: "solo_parent",           label: "Solo Parent" },
  { value: "low_income",            label: "Low Income" },
  { value: "burial_assistance",     label: "Burial Assistance" },
  { value: "cohabitation",          label: "Cohabitation" },
  { value: "first_time_job_seeker", label: "First Time Job Seeker" },
];

// ── Placeholder reference groups ──────────────────────────────────────────────
const PLACEHOLDER_GROUPS = [
  {
    group: "Resident",
    tokens: [
      { token: "resident.firstName",   desc: "First name" },
      { token: "resident.middleName",  desc: "Middle name" },
      { token: "resident.lastName",    desc: "Last name" },
      { token: "resident.fullName",    desc: "Full name (auto-joined)" },
      { token: "resident.birthdate",   desc: "Date of birth (long)" },
      { token: "resident.age",         desc: "Age (computed)" },
      { token: "resident.sex",         desc: "Sex" },
      { token: "resident.civilStatus", desc: "Civil status" },
      { token: "resident.address",     desc: "Street + barangay" },
      { token: "resident.residentId",  desc: "Resident ID (RES-YYYY-NNNNNNN)" },
      { token: "resident.nationality", desc: "Nationality" },
      { token: "resident.religion",    desc: "Religion" },
      { token: "resident.occupation",  desc: "Occupation" },
      { token: "resident.extensionName", desc: "Extension name (Jr., Sr., III…)" },
    ],
  },
  {
    group: "Barangay",
    tokens: [
      { token: "barangay.name",          desc: "Barangay name" },
      { token: "barangay.code",          desc: "Barangay PSGC code" },
      { token: "barangay.logoImg",       desc: "Barangay logo <img> tag (80×80px)" },
      { token: "barangay.backgroundImg", desc: "Full-page background image layer (blurred, fixed)" },
    ],
  },
  {
    group: "Municipality",
    tokens: [
      { token: "municipality.name",     desc: "Municipality / city name" },
      { token: "municipality.province", desc: "Province" },
      { token: "municipality.region",   desc: "Region" },
      { token: "municipality.logoImg",  desc: "Municipality logo <img> tag (80×80px)" },
    ],
  },
  {
    group: "Officials",
    tokens: [
      { token: "officials.captain",   desc: "Punong barangay" },
      { token: "officials.kagawad1",  desc: "Kagawad 1" },
      { token: "officials.kagawad2",  desc: "Kagawad 2" },
      { token: "officials.kagawad3",  desc: "Kagawad 3" },
      { token: "officials.kagawad4",  desc: "Kagawad 4" },
      { token: "officials.kagawad5",  desc: "Kagawad 5" },
      { token: "officials.kagawad6",  desc: "Kagawad 6" },
      { token: "officials.kagawad7",  desc: "Kagawad 7" },
      { token: "officials.secretary", desc: "Barangay secretary" },
      { token: "officials.treasurer", desc: "Barangay treasurer" },
    ],
  },
  {
    group: "Request / Transaction",
    tokens: [
      { token: "request.purpose",         desc: "Purpose stated by applicant" },
      { token: "request.date",            desc: "Date of issuance" },
      { token: "request.referenceNumber", desc: "Reference / tracking number" },
      { token: "request.orNumber",        desc: "Official receipt number" },
    ],
  },
];

// ── Default template ──────────────────────────────────────────────────────────
const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Barangay Clearance</title>
  <style>
    @media print {
      @page {
        size: Letter;
        margin: 0;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    body {
      font-family: 'Times New Roman', serif;
      line-height: 1.6;
      margin: 0;
      padding: 1in;
      font-size: 12pt;
    }

    .logo-row {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 20px;
      gap: 100px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header p {
      margin: 3px 0;
      font-style: italic;
    }

    .title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin: 40px 0;
      text-decoration: underline;
      letter-spacing: 1px;
    }

    .body {
      text-align: justify;
      margin: 40px 0;
      line-height: 1.8;
    }

    .body p {
      text-indent: 40px;
      margin: 0 0 16px 0;
    }

    .bottom {
      margin-top: 60px;
      display: flex;
      flex-direction: column;
      min-height: 300px;
    }

    .date-line {
      text-align: left;
      margin-bottom: 20px;
    }

    .signature-line {
      text-align: right;
      margin-top: auto;
    }

    .signature-name {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 5px;
    }

    .signature-title {
      margin-bottom: 3px;
    }
  </style>
</head>
<body>

  {{ barangay.backgroundImg }}

  <div class="header">
    <div class="logo-row">
      {{ municipality.logoImg }}
      <div style="text-align: center;">
        <p>Republic of the Philippines</p>
        <p>Province of {{ municipality.province }}</p>
        <p>Municipality of {{ municipality.name }}</p>
        <p>BARANGAY {{ barangay.name }}</p>
      </div>
      {{ barangay.logoImg }}
    </div>
  </div>

  <div class="title">BARANGAY CLEARANCE</div>

  <div class="body">
    <p>
      This is to certify that <strong>{{ resident.fullName }}</strong>,
      {{ resident.civilStatus }}, {{ resident.sex }}, born on {{ resident.birthdate }},
      and a resident of <strong>{{ resident.address }}</strong>,
      Barangay <strong>{{ barangay.name }}</strong>,
      Municipality of <strong>{{ municipality.name }}</strong>,
      Province of <strong>{{ municipality.province }}</strong>,
      is known to be a person of good standing and without any derogatory record
      filed in this barangay.
    </p>
    <p>
      This clearance is issued upon the request of the above-named individual for
      <strong><span style="text-transform: uppercase;">{{ request.purpose }}</span></strong>.
    </p>
  </div>

  <div class="bottom">
    <div class="date-line">
      Issued this {{ request.date }} at Barangay {{ barangay.name }},
      {{ municipality.name }} for whatever legal purpose this may serve.
    </div>
    <div class="signature-line">
      <div class="signature-name">{{ officials.captain }}</div>
      <div class="signature-title">Punong Barangay</div>
    </div>
  </div>

</body>
</html>`;

// ── Main component ────────────────────────────────────────────────────────────
export default function TemplateEditorPage() {
  const navigate      = useNavigate();
  const { id }        = useParams();
  const isNew         = !id || id === "new";
  const { user }      = useAuth();
  const { toast }     = useToast();
  const queryClient   = useQueryClient();
  const textareaRef   = useRef(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const municipalityId = user?.target_id;

  const [form, setForm] = useState({
    name:            "",
    certificateType: "barangay_clearance",
    description:     "",
    htmlContent:     DEFAULT_HTML,
  });

  // ── Load template for editing ────────────────────────────────────────────
  const { data: templateData, isLoading: isLoadingTemplate, isError: isTemplateError } = useQuery({
    queryKey: ["certificate-template", id],
    queryFn: () =>
      apiClient.get(`/certificates/templates/${id}`).then((r) => r.data.data),
    enabled: !isNew,
    retry: false,
  });

  useEffect(() => {
    if (templateData) {
      setForm({
        name:            templateData.name,
        certificateType: templateData.certificate_type,
        description:     templateData.description || "",
        htmlContent:     templateData.html_content,
      });
    }
  }, [templateData]);

  useEffect(() => {
    if (isTemplateError) {
      toast({ variant: "destructive", title: "Template not found" });
      navigate("/admin/municipality/certificate-templates");
    }
  }, [isTemplateError]);

  // ── Save mutation ────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      if (isNew) {
        return apiClient
          .post("/certificates/templates", {
            municipalityId,
            certificateType: form.certificateType,
            name:            form.name,
            description:     form.description || undefined,
            htmlContent:     form.htmlContent,
          })
          .then((r) => r.data.data);
      } else {
        return apiClient
          .put(`/certificates/templates/${id}`, {
            name:        form.name,
            description: form.description || undefined,
            htmlContent: form.htmlContent,
          })
          .then((r) => r.data.data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["certificate-templates"]);
      toast({
        title: isNew ? "Template created" : "Template saved",
        description: isNew
          ? "The template is now available for certificate generation."
          : "Changes saved successfully.",
      });
      navigate("/admin/municipality/certificate-templates");
    },
    onError: (err) =>
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err.response?.data?.message || err.message,
      }),
  });

  // ── Insert placeholder token at cursor ───────────────────────────────────
  const insertToken = (token) => {
    const el = textareaRef.current;
    if (!el) return;
    const start    = el.selectionStart;
    const end      = el.selectionEnd;
    const inserted = `{{ ${token} }}`;
    const next     = form.htmlContent.slice(0, start) + inserted + form.htmlContent.slice(end);
    setForm((f) => ({ ...f, htmlContent: next }));
    requestAnimationFrame(() => {
      el.selectionStart = start + inserted.length;
      el.selectionEnd   = start + inserted.length;
      el.focus();
    });
  };

  if (!isNew && isLoadingTemplate) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading template…
      </div>
    );
  }

  const canSave = form.name.trim() !== "" && form.htmlContent.trim() !== "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 -ml-2 mb-1 gap-1"
            onClick={() => navigate("/admin/municipality/certificate-templates")}
          >
            <ChevronLeft className="h-4 w-4" /> Certificate Templates
          </Button>
          <h1 className="text-xl font-bold text-gray-800">
            {isNew ? "New Certificate Template" : "Edit Template"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isNew
              ? "Create an HTML template for generating barangay certificates."
              : `Editing: ${form.name || "…"}`}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setPreviewOpen(true)}
            disabled={!form.htmlContent.trim()}
          >
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button
            className="gap-2"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !canSave}
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : isNew ? "Create Template" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">

        {/* ── Left: metadata + HTML editor ──────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-700">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-name">
                    Template Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tpl-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Barangay Clearance 2025"
                  />
                </div>

                {isNew ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl-type">
                      Certificate Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.certificateType}
                      onValueChange={(v) => setForm((f) => ({ ...f, certificateType: v }))}
                    >
                      <SelectTrigger id="tpl-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CERTIFICATE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">
                      Only one active template per type is allowed per municipality.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Certificate Type</Label>
                    <div className="h-10 flex items-center border rounded-md px-3 bg-gray-50 text-sm text-gray-600">
                      {CERTIFICATE_TYPES.find((t) => t.value === form.certificateType)?.label || form.certificateType}
                    </div>
                    <p className="text-xs text-gray-400">
                      Certificate type cannot be changed after creation.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tpl-desc">Description <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="tpl-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief notes about this template version"
                />
              </div>
            </CardContent>
          </Card>

          {/* HTML editor */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-700">
                  HTML Content <span className="text-red-500">*</span>
                </CardTitle>
                <span className="text-xs text-gray-400">
                  {form.htmlContent.length.toLocaleString()} chars
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Write your certificate as HTML. Use{" "}
                <code className="bg-gray-100 px-1 rounded font-mono">{"{{ token }}"}</code>{" "}
                placeholders — click any token in the reference panel to insert it at the cursor.
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                id="tpl-html"
                ref={textareaRef}
                value={form.htmlContent}
                onChange={(e) => setForm((f) => ({ ...f, htmlContent: e.target.value }))}
                className="font-mono text-xs min-h-[520px] resize-y leading-relaxed"
                spellCheck={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Right: placeholder reference panel ────────────────────────── */}
        <div className="xl:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-700">Placeholder Reference</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Click a token to insert it at the cursor position in the HTML editor.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-5 max-h-[640px] overflow-y-auto pr-1">
                {PLACEHOLDER_GROUPS.map((group) => (
                  <div key={group.group}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      {group.group}
                    </p>
                    <div className="space-y-0.5">
                      {group.tokens.map((t) => (
                        <button
                          key={t.token}
                          type="button"
                          onClick={() => insertToken(t.token)}
                          className="w-full text-left flex items-start gap-2 p-1.5 rounded hover:bg-blue-50 transition-colors group"
                          title={`Insert {{ ${t.token} }}`}
                        >
                          <code className="text-xs bg-gray-100 group-hover:bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-mono shrink-0 leading-tight">
                            {`{{ ${t.token} }}`}
                          </code>
                          <span className="text-xs text-gray-500 leading-tight mt-0.5">
                            {t.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* HTML Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="max-w-4xl"
          style={{ height: "85vh", display: "flex", flexDirection: "column" }}
        >
          <DialogHeader>
            <DialogTitle>HTML Preview</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 shrink-0">
            Showing the raw HTML template.{" "}
            <code className="bg-gray-100 px-1 rounded font-mono">{"{{ placeholders }}"}</code>{" "}
            will be replaced with real data when a certificate is generated.
          </p>
          <iframe
            srcDoc={form.htmlContent}
            title="Certificate Template Preview"
            className="w-full rounded border flex-1 mt-2"
            sandbox="allow-same-origin"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
