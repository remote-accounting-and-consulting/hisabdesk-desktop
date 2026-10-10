import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  default: "bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-200",
  success: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  danger: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  info: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
};

export default function StatCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: keyof typeof tones;
  hint?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {icon && <div className={cn("p-2.5 rounded-lg", tones[tone])}>{icon}</div>}
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
      {hint && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}
