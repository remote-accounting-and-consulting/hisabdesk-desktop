import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";

export type ToastType = "success" | "error" | "loading";

interface Props {
  open: boolean;
  type: ToastType;
  title: string;
  message?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

export default function Toast({ open, type, title, message, onClose, autoCloseMs = 6000 }: Props) {
  useEffect(() => {
    if (!open) return;
    if (type === "loading") return;
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [open, type, autoCloseMs, onClose]);

  if (!open) return null;

  const styles = {
    success: { bg: "bg-emerald-600", icon: <CheckCircle2 size={17} /> },
    error: { bg: "bg-red-600", icon: <AlertCircle size={17} /> },
    loading: { bg: "bg-brand-600", icon: <Loader2 size={17} className="animate-spin" /> },
  }[type];

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`${styles.bg} text-white rounded-xl shadow-2xl p-4 pr-12 max-w-md min-w-[320px] relative`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{title}</div>
            {message && <div className="text-xs text-white/90 mt-1 whitespace-pre-line break-words">{message}</div>}
          </div>
        </div>
        {type !== "loading" && (
          <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded hover:bg-white/20">
            <X size={14} />
          </button>
        )}
      </div>
      <style>{`
        @keyframes slide-in-from-bottom-4 {
          from { transform: translateY(1rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in { animation: slide-in-from-bottom-4 0.3s ease-out; }
      `}</style>
    </div>
  );
}
