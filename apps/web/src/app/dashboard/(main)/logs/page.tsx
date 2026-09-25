"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  ip: string | null;
  createdAt: string;
  application: { name: string };
}

interface Application {
  id: string;
  name: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const { ok, data } = await apiFetch<{ applications: Application[] }>("/applications");
        if (!ok || !data.applications?.length) {
          setLoading(false);
          return;
        }

        const allLogs: AuditEntry[] = [];
        for (const app of data.applications.slice(0, 5)) {
          const { ok: logOk, data: logData } = await apiFetch<{ logs: Omit<AuditEntry, "application">[] }>(
            `/applications/${app.id}/audit/logs`
          );
          if (logOk && logData.logs) {
            allLogs.push(...logData.logs.map((l) => ({ ...l, application: { name: app.name } })));
          }
        }

        allLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLogs(allLogs.slice(0, 50));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const actionColors: Record<string, "default" | "success" | "warning" | "danger"> = {
    "user.login": "success",
    "user.signup": "success",
    "user.logout": "default",
    "user.password_reset": "warning",
    "mfa.enabled": "success",
    "mfa.disabled": "warning",
    "key.issued": "success",
    "key.revoked": "danger",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          Recent activity across all your applications.
        </p>
      </div>

      {loading ? (
        <Card>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="ml-auto h-4 w-32" />
              </div>
            ))}
          </div>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-3 text-sm font-medium text-gray-900">No activity yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Activity will appear here once users start interacting with your applications.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Application</th>
                  <th className="pb-3 font-medium">User ID</th>
                  <th className="pb-3 font-medium">IP Address</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-3">
                      <Badge variant={actionColors[log.action] ?? "default"}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-700">{log.application.name}</td>
                    <td className="py-3 font-mono text-xs text-gray-500">
                      {log.userId ? log.userId.slice(0, 12) + "…" : "—"}
                    </td>
                    <td className="py-3 text-gray-500">{log.ip ?? "—"}</td>
                    <td className="py-3 text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
