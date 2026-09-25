"use client";

import dynamic from "next/dynamic";
import { Button } from "./button";

const ShieldScene = dynamic(
  () =>
    import("@/components/three/shield-scene").then((m) => ({
      default: m.ShieldScene,
    })),
  { ssr: false },
);

interface EmptyStateProps {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  illustration?: "shield" | "none";
}

export function EmptyState({
  title,
  description,
  action,
  illustration,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {illustration === "shield" && (
        <div className="mb-6 h-[200px] w-[200px]">
          <ShieldScene size="small" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
