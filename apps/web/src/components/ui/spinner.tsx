interface SpinnerProps {
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<string, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-4",
  lg: "h-8 w-8 border-4",
};

export function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full border-gray-200 border-t-indigo-600 ${sizeClasses[size]}`}
      role="status"
      aria-label="Loading"
    />
  );
}
