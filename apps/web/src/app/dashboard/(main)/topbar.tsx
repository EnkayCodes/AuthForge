"use client";

import { useAuth } from "../../../contexts/auth-context";

export function Topbar() {
  const { developer, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-end border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{developer?.email}</span>
        <button
          onClick={logout}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
