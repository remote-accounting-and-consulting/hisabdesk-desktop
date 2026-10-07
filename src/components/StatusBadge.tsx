import { cn } from "@/lib/utils";

const styles: any = {
  completed: "bg-emerald-100 text-emerald-800",
  wip: "bg-blue-100 text-blue-800",
  started: "bg-blue-100 text-blue-800",
  not_started: "bg-gray-100 text-gray-700",
  due_today: "bg-orange-100 text-orange-800",
  due_soon: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-700",
  filed: "bg-emerald-100 text-emerald-800",
  submitted: "bg-blue-100 text-blue-800",
  late: "bg-red-100 text-red-800",
  paid: "bg-emerald-100 text-emerald-800",
  unpaid: "bg-red-100 text-red-800",
  partial: "bg-amber-100 text-amber-800",
};

const labels: any = {
  completed: "Completed", wip: "WIP", started: "Started", not_started: "Not Started",
  due_today: "Due Today", due_soon: "Due Soon", overdue: "Overdue",
  pending: "Pending", filed: "Filed", submitted: "Submitted", late: "Late",
  paid: "Paid", unpaid: "Unpaid", partial: "Partial",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block px-3 py-1 rounded-full text-xs font-medium",
        styles[status] || "bg-gray-100 text-gray-700"
      )}
    >
      {labels[status] || status}
    </span>
  );
}
