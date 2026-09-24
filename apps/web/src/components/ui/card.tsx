"use client";

import { useRef, type ReactNode } from "react";
import { useTilt } from "@/hooks/use-tilt";

interface CardProps {
  children: ReactNode;
  hover?: boolean;
  className?: string;
}

export function Card({ children, hover, className = "" }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(hover ? ref : null);

  return (
    <div
      ref={ref}
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${
        hover ? "transition-shadow hover:shadow-md" : ""
      } ${className}`}
      style={hover ? { transformStyle: "preserve-3d" } : undefined}
    >
      {children}
    </div>
  );
}
