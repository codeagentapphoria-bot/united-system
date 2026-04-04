import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import api from "@/utils/api";
import { Check, Clipboard } from "lucide-react";
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
    <div className="space-y-6">
      <span className="sr-only" aria-live="polite">{liveMessage}</span>
      <h1 className="text-2xl font-semibold">Open API</h1>
      <p className="text-sm text-muted-foreground">Generate and manage API keys for external developers. Keys grant read-only access to residents, households, families, barangays, and statistics scoped to your municipality.</p>

      <Card className="p-4">
        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label htmlFor="name">Key name</Label>
            <Input id="name" required value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Partner A Integration" />
          </div>
          <div>
            <Label htmlFor="rl">Rate limit (per minute)</Label>
            <Input id="rl" type="number" min={1} value={form.rateLimitPerMinute} onChange={(e) => setForm((s) => ({ ...s, rateLimitPerMinute: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="exp">Expires at (optional)</Label>
            <Input id="exp" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((s) => ({ ...s, expiresAt: e.target.value }))} />
          </div>
          <div className="md:col-span-4 flex gap-2">
            <Button type="submit" disabled={loading}>Create API Key</Button>
            {createdKey?.key && (
              <Button type="button" variant="secondary" onClick={() => navigator.clipboard.writeText(createdKey.key)}>Copy New Key</Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-medium mb-3">Existing Keys</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">API Key</th>
                <th className="py-2 pr-4">Rate</th>
                <th className="py-2 pr-4">Expires</th>
                <th className="py-2 pr-4">Revoked</th>
                <th className="py-2 pr-4">Last used</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b">
                  <td className="py-2 pr-4">{k.name}</td>
                  <td className="py-2 pr-4 font-mono break-all">
                    {k.key || "—"}
                  </td>
                  <td className="py-2 pr-4">{k.rateLimitPerMinute}/min</td>
                  <td className="py-2 pr-4">{k.expiresAt ? new Date(k.expiresAt).toLocaleString() : "—"}</td>
                  <td className="py-2 pr-4">{k.revoked ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "—"}</td>
                  <td className="py-2 pr-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!k.key || k.revoked || loading}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(k.key);
                          setCopiedForId(k.id);
                          setLiveMessage(`API key for ${k.name} copied to clipboard`);
                          toast({ title: "✅ API key copied to clipboard", duration: 2500 });
                          setTimeout(() => setCopiedForId(null), 1800);
                        } catch (e) {
                          setLiveMessage("Failed to copy — please try again.");
                          toast({ title: "Failed to copy — please try again.", description: e.message, variant: "destructive" });
                        }
                      }}
                    >
                      {copiedForId === k.id ? (
                        <span className="inline-flex items-center gap-1"><Check className="h-4 w-4" />Copied</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Clipboard className="h-4 w-4" />Copy</span>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={k.revoked || loading}
                      onClick={() => setConfirm({ open: true, mode: "revoke", key: k })}
                    >
                      Revoke
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirm({ open: true, mode: "delete", key: k })}
                      disabled={loading}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={6}>No API keys yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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


