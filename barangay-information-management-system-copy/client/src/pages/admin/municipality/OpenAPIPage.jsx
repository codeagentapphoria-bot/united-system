import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import api from "@/utils/api";
import { Check, Clipboard, Plus, Key } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const OpenAPIPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [keys, setKeys] = useState([]);
  const [form, setForm] = useState({ name: "", rateLimitPerMinute: 60, expiresAt: "" });
  const [createdKey, setCreatedKey] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, mode: null, key: null });
  const [copiedForId, setCopiedForId] = useState(null);
  const [liveMessage, setLiveMessage] = useState("");

  const loadKeys = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/openapi/keys`);
      if (data?.success) setKeys(data.data);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCreatedKey(null);
    try {
      const { data } = await api.post(`/openapi/keys`, {
        name: form.name,
        rateLimitPerMinute: Number(form.rateLimitPerMinute) || 60,
        expiresAt: form.expiresAt || null,
      });
      if (data?.success) {
        setCreatedKey(data.data);
        toast({ title: "API key created", description: "Copy and store it securely." });
        setForm({ name: "", rateLimitPerMinute: 60, expiresAt: "" });
        await loadKeys();
      } else {
        toast({ title: "Failed to create key", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error creating key", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id) => {
    setLoading(true);
    try {
      const { data } = await api.post(`/openapi/keys/${id}/revoke`);
      if (data?.success) {
        toast({ title: "API key revoked", description: "Existing tokens remain valid until expiry." });
        await loadKeys();
      } else {
        toast({ title: "Failed to revoke", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error revoking key", description: e.response?.data?.message || e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      const { data } = await api.delete(`/openapi/keys/${id}`);
      if (data?.success) {
        toast({ title: "API key permanently deleted" });
        await loadKeys();
      } else {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error deleting key", description: e.response?.data?.message || e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async (id) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/openapi/keys/${id}/reveal`);
      if (data?.success && data.data?.key) {
        await navigator.clipboard.writeText(data.data.key);
        toast({ title: "API key copied", description: `Key for ${data.data.name} copied to clipboard.` });
      } else {
        toast({ title: "Unable to reveal key", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Reveal failed", description: e.response?.data?.message || e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <span className="sr-only" aria-live="polite">{liveMessage}</span>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Open API</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate and manage API keys for external developers. Keys grant read-only access to
          residents, households, families, barangays, and statistics scoped to your municipality.
        </p>
      </div>

      {/* Create Key Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New API Key
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label htmlFor="name">Key name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Partner A Integration"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rl">Rate limit (per minute)</Label>
              <Input
                id="rl"
                type="number"
                min={1}
                value={form.rateLimitPerMinute}
                onChange={(e) => setForm((s) => ({ ...s, rateLimitPerMinute: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp">Expires at <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                id="exp"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((s) => ({ ...s, expiresAt: e.target.value }))}
              />
            </div>
            <div className="md:col-span-4 flex gap-2">
              <Button type="submit" size="sm" disabled={loading} className="gap-2">
                <Plus className="h-4 w-4" />
                Create API Key
              </Button>
              {createdKey?.key && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => navigator.clipboard.writeText(createdKey.key)}
                >
                  <Clipboard className="h-4 w-4" />
                  Copy New Key
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing Keys */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-gray-400 text-sm">
                    No API keys yet.
                  </TableCell>
                </TableRow>
              ) : (
                keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium text-sm">{k.name}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500 max-w-[160px] truncate">
                      {k.key || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {k.rateLimitPerMinute}/min
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={k.revoked
                        ? "bg-red-100 text-red-700 text-xs"
                        : "bg-green-100 text-green-700 text-xs"
                      }>
                        {k.revoked ? "Revoked" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!k.key || k.revoked || loading}
                          className="gap-1 text-xs"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(k.key);
                              setCopiedForId(k.id);
                              setLiveMessage(`API key for ${k.name} copied to clipboard`);
                              toast({ title: "API key copied to clipboard", duration: 2500 });
                              setTimeout(() => setCopiedForId(null), 1800);
                            } catch (e) {
                              setLiveMessage("Failed to copy — please try again.");
                              toast({ title: "Failed to copy", description: e.message, variant: "destructive" });
                            }
                          }}
                        >
                          {copiedForId === k.id ? (
                            <><Check className="h-3 w-3" />Copied</>
                          ) : (
                            <><Clipboard className="h-3 w-3" />Copy</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={k.revoked || loading}
                          className="text-xs"
                          onClick={() => setConfirm({ open: true, mode: "revoke", key: k })}
                        >
                          Revoke
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setConfirm({ open: true, mode: "delete", key: k })}
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={confirm.open} onOpenChange={(open) => setConfirm((s) => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm.mode === "delete" ? "Delete API Key?" : "Revoke API Key?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm.mode === "delete"
                ? "This action permanently deletes the API key. It cannot be undone."
                : "This revokes the API key. Existing tokens may remain valid until expiry depending on client caching."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const id = confirm.key?.id;
                setConfirm((s) => ({ ...s, open: false }));
                if (!id) return;
                if (confirm.mode === "delete") {
                  await handleDelete(id);
                } else {
                  await handleRevoke(id);
                }
              }}
            >
              {confirm.mode === "delete" ? "Delete" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OpenAPIPage;


