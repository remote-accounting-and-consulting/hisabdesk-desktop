import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { Info, ExternalLink, Award, Code2 } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

export default function AboutTab() {
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
          H
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            HisabDesk
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Accounting Consulting Practice Management System
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 bg-gray-100 dark:bg-slate-700 rounded-lg">
            <span className="text-xs text-gray-500 dark:text-gray-400">Version</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">
              {version || "..."}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard
          icon={<Award size={18} />}
          label="Company"
          value="Remote Accounting and Consulting Pvt. Ltd."
        />
        <InfoCard
          icon={<Code2 size={18} />}
          label="Built with"
          value="Tauri 2 · React 18 · TypeScript · SQLite"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-brand-600 dark:text-brand-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">About</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          HisabDesk is a complete practice management system for accounting firms
          in Nepal. Manage clients, documents, VAT tracking, work assignments,
          fees, payments, and reports — all from one desktop application.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Links</h3>
        <div className="space-y-2">
          <button
            onClick={() => openUrl("https://github.com/remote-accounting-and-consulting/hisabdesk-desktop")}
            className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            <ExternalLink size={14} /> GitHub Repository
          </button>
          <button
            onClick={() => openUrl("https://github.com/remote-accounting-and-consulting/hisabdesk-desktop/releases")}
            className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
          >
            <ExternalLink size={14} /> Release Notes
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 dark:text-gray-500">
        © 2082 Remote Accounting and Consulting Pvt. Ltd.
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-sm text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
