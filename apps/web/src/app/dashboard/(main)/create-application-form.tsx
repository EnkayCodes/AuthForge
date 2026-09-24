"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "../../../lib/api";

interface CreateApplicationFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateApplicationForm({ onCreated, onCancel }: CreateApplicationFormProps) {
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState("development");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { ok, data } = await apiFetch("/applications", {
        method: "POST",
        body: JSON.stringify({ name, environment }),
      });

      if (!ok) {
        setError((data as { message?: string }).message ?? "Failed to create application.");
        return;
      }

      onCreated();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Create Application</h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="app-name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <input
              id="app-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="My App"
            />
          </div>

          <div>
            <label htmlFor="app-env" className="mb-1 block text-sm font-medium">
              Environment
            </label>
            <select
              id="app-env"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creatingâ€¦" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

