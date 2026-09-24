interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  className = "",
}: SkeletonProps) {
  const base = "animate-pulse bg-gray-200";

  if (variant === "circular") {
    return (
      <div
        className={`${base} rounded-full ${className}`}
        style={{ width: width ?? 40, height: height ?? width ?? 40 }}
      />
    );
  }

  if (variant === "rectangular") {
    return (
      <div
        className={`${base} rounded-lg ${className}`}
        style={{ width: width ?? "100%", height: height ?? 80 }}
      />
    );
  }

  return (
    <div className={`space-y-2 ${className}`} style={{ width: width ?? "100%" }}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`${base} h-4 rounded`}
          style={{ width: i === lines - 1 && lines > 1 ? "75%" : "100%" }}
        />
      ))}
    </div>
  );
}
