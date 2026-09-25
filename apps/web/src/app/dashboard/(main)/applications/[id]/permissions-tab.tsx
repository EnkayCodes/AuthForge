"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface Permission { id: string; key: string; description: string | null; createdAt: string; }

export function PermissionsTab({ appId }: { appId: string }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null);
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();

  const fetchPermissions = useCallback(async () => {
    const { ok, data } = await apiFetch<{ permissions: Permission[] }>(`/applications/${appId}/permissions`);
    if (ok) setPermissions(data.permissions);
    setLoading(false);
  }, [appId]);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setCreating(true);
    try {
      const { ok, data } = await apiFetch(`/applications/${appId}/permissions`, { method: "POST", body: JSON.stringify({ key: key.trim(), description: description.trim() || undefined }) });
      if (!ok) { toast("error", (data as { message?: string }).message ?? "Failed to create permission."); return; }
      setKey(""); setDescription(""); fetchPermissions();
    } catch { toast("error", "Unable to reach the server."); } finally { setCreating(false); }
  }

  async function handleDelete(permissionId: string) {
    await apiFetch(`/applications/${appId}/permissions/${permissionId}`, { method: "DELETE" });
    setDeleteTarget(null); fetchPermissions(); toast("success", "Permission deleted.");
  }

  if (loading) {
    return <div className="max-w-3xl">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} variant="rectangular" height={52} className="mb-2" />)}</div>;
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleCreate} className="mb-6 flex gap-3">
        <Input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Permission key (e.g. posts.create)" required className="flex-1" />
        <Input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="flex-1" />
        <Button type="submit" loading={creating}>Add Permission</Button>
      </form>

      {permissions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No permissions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Key</th>
                <th className="px-4 py-3 font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <AnimatePresence>
                {permissions.map((perm) => (
                  <motion.tr key={perm.id} layout initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={reduceMotion ? { duration: 0 } : undefined}>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{perm.key}</td>
                    <td className="px-4 py-3 text-gray-500">{perm.description ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(perm)} className="text-red-600 hover:text-red-800">Delete</Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && <ConfirmDialog title="Delete Permission" message={`Delete permission "${deleteTarget.key}"? It will be removed from all roles.`} confirmLabel="Delete" onConfirm={() => handleDelete(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
