"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

interface TopbarProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
  mobileOpen?: boolean;
}

export function Topbar({ onMenuClick, showMenu, mobileOpen }: TopbarProps) {
  const { developer, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div>
        {showMenu && (
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="max-w-[200px] truncate text-sm text-gray-600">
          {developer?.email}
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
