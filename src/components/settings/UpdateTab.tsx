import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { ExternalLink, Info, Download } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

const RELEASES_URL =
  "https://github.com/remote-accounting-and-consulting/hisabdesk-desktop/releases/latest";
const DOWNLOAD_URL =
  "https://github.com/remote-accounting-and-consulting/hisabdesk-desktop/releases/latest/download/HisabDesk-Setup.msi";

export default function UpdateTab() {
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Software Updates
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Check for new versions of HisabDesk
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Current Version
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white font-mono mt-1">
              {version || "..."}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Latest Version
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Check on GitHub
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => openUrl(RELEASES_URL)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium"
          >
            <ExternalLink size={16} /> View Latest Release
          </button>

          <button
            onClick={() => openUrl(DOWNLOAD_URL)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600"
          >
            <Download size={16} /> Download Latest MSI
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-gray-700 dark:text-gray-200">How to update:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Close HisabDesk completely</li>
            <li>Download the latest MSI from the button above</li>
            <li>Double-click the MSI to install</li>
            <li>Reopen HisabDesk</li>
          </ol>
          <p className="mt-3 text-xs">
            Your data and uploaded documents are never affected by updates.
          </p>
        </div>
      </div>
    </div>
  );
}
