"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const borderColors: Record<Toast["type"], string> = {
  success: "border-l-green-500",
  error: "border-l-red-500",
  info: "border-l-indigo-500",
};

const iconColors: Record<Toast["type"], string> = {
  success: "text-green-600",
  error: "text-red-600",
  info: "text-indigo-600",
};

const icons: Record<Toast["type"], string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className={`flex w-80 items-start gap-3 rounded-lg border border-l-4 bg-white p-4 shadow-lg ${borderColors[t.type]}`}
          >
            <span className={`text-lg font-bold leading-none ${iconColors[t.type]}`}>
              {icons[t.type]}
            </span>
            <p className="flex-1 text-sm text-gray-700">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
