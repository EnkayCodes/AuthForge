"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { apiFetch } from "../../../../../lib/api";

interface AuditEntry {
  id: string;
  endUserId: string | null;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function AuditTab({ appId }: { appId: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [userFilter, setUserFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (before?: string, append = false) => {
      const params = new URLSearchParams({ limit: "25" });
      if (before) params.set("before", before);
      if (userFilter.trim()) params.set("user_id", userFilter.trim());

      const { ok, data } = await apiFetch<{ logs: AuditEntry[] }>(
        `/applications/${appId}/audit/logs?${params}`,
      );

      if (ok) {
        const entries = data.logs;
        setLogs((prev) => (append ? [...prev, ...entries] : entries));
        setHasMore(entries.length === 25);
      }
      setLoading(false);
    },
    [appId, userFilter],
  );

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  function loadMore() {
    const last = logs[logs.length - 1];
    if (last) fetchLogs(last.createdAt, true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <input
          type="text"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="Filter by user ID…"
          className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No audit events found.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Timestamp</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Action</th>
                  <th className="px-4 py-3 font-medium text-gray-600">User ID</th>
                  <th className="px-4 py-3 font-medium text-gray-600">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {log.endUserId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {log.ipAddress ?? "—"}
                      </td>
                    </tr>
                    {expandedId === log.id && log.metadata && (
                      <tr>
                        <td colSpan={4} className="bg-gray-50 px-4 py-3">
                          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-gray-600">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              className="mt-4 w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}
