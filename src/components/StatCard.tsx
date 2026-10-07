import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  default: "bg-gray-50 text-gray-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
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
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-base text-gray-500">{label}</span>
        {icon && (
          <div className={cn("p-3 rounded-xl", tones[tone])}>{icon}</div>
        )}
      </div>
      <div className="text-3xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="text-sm text-gray-500 mt-1">{hint}</div>}
    </div>
  );
}
