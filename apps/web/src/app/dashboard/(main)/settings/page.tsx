"use client";

import { useAuth } from "../../../../contexts/auth-context";

export default function SettingsPage() {
  const { developer } = useAuth();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Account Settings</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-600">Profile</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">
              Name
            </label>
            <p className="text-sm text-gray-900">{developer?.name}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-500">
              Email
            </label>
            <p className="text-sm text-gray-900">{developer?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
