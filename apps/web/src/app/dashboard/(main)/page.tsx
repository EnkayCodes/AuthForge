"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import { CreateApplicationForm } from "./create-application-form";

interface Application {
  id: string;
  name: string;
  environment: string;
  clientId: string;
  createdAt: string;
}

const envColors: Record<string, string> = {
  development: "bg-gray-100 text-gray-700",
  staging: "bg-yellow-100 text-yellow-700",
  production: "bg-green-100 text-green-700",
};

export default function ApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchApps = useCallback(async () => {
    const { ok, data } = await apiFetch<{ applications: Application[] }>("/applications");
    if (ok) setApps(data.applications);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Create Application
        </button>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No applications yet.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Create your first application
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/applications/${app.id}`}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-gray-900">{app.name}</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${envColors[app.environment] ?? "bg-gray-100 text-gray-700"}`}>
                  {app.environment}
                </span>
              </div>
              <p className="mt-2 font-mono text-xs text-gray-400">
                {app.clientId}
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Created {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateApplicationForm
          onCreated={() => {
            setShowCreate(false);
            fetchApps();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

