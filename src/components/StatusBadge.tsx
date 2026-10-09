import { cn } from "@/lib/utils";

const styles: any = {
  completed: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
  wip: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  started: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  not_started: "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300",
  due_today: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300",
  due_soon: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  overdue: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
  pending: "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300",
  filed: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
  submitted: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
  late: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
  paid: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
  unpaid: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
  partial: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
};

const labels: any = {
  completed: "Completed", wip: "WIP", started: "Started", not_started: "Not Started",
  due_today: "Due Today", due_soon: "Due Soon", overdue: "Overdue",
  pending: "Pending", filed: "Filed", submitted: "Submitted", late: "Late",
  paid: "Paid", unpaid: "Unpaid", partial: "Partial",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-block px-3 py-1 rounded-full text-xs font-medium", styles[status] || "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300")}>
      {labels[status] || status}
    </span>
  );
}
