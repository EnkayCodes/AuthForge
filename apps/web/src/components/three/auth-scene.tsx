"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";

const ShieldScene = dynamic(
  () => import("./shield-scene").then((m) => ({ default: m.ShieldScene })),
  { ssr: false },
);

interface AuthSceneProps {
  subtitle: string;
  children: ReactNode;
}

export function AuthScene({ subtitle, children }: AuthSceneProps) {
  return (
    <main className="flex min-h-screen">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <img src="/logo.svg" alt="AuthForge" className="mx-auto h-8" />
            <p className="mt-3 text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-lg">{children}</div>
        </div>
      </div>
      <div className="hidden items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 md:flex md:flex-1">
        <ShieldScene size="large" />
      </div>
    </main>
  );
}
