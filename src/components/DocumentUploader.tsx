import { useEffect, useState } from "react";
import { Paperclip, Eye, Trash2, FileText } from "lucide-react";
import {
  pickAndAttachFile,
  listFilesForClient,
  openFile,
  deleteFile,
  formatBytes,
} from "@/lib/files";

interface Props {
  clientId: number;
  clientCode: string;
  documentTypeId: number;
  documentTypeName: string;
  onChange?: () => void;
}

export default function DocumentUploader({
  clientId,
  clientCode,
  documentTypeId,
  documentTypeName,
  onChange,
}: Props) {
  const [files, setFiles] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, [clientId, documentTypeId]);

  async function refresh() {
    const grouped = await listFilesForClient(clientId);
    setFiles(grouped[documentTypeId] || []);
  }

  async function handleAttach() {
    setBusy(true);
    try {
      const r = await pickAndAttachFile(
        clientId,
        clientCode,
        documentTypeId,
        documentTypeName
      );
      if (r) {
        await refresh();
        onChange?.();
      }
    } catch (e) {
      alert("Upload failed: " + e);
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen(f: any) {
    try {
      await openFile(f);
    } catch (e) {
      alert("Could not open: " + e);
    }
  }

  async function handleDelete(f: any) {
    if (!confirm(`Delete "${f.file_name}"?`)) return;
    try {
      await deleteFile(f);
      await refresh();
      onChange?.();
    } catch (e) {
      alert("Delete failed: " + e);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">
                {f.file_name}
              </div>
              <div className="text-[10px] text-gray-500">
                {formatBytes(f.file_size)} · {f.uploaded_at?.slice(0, 10)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleOpen(f)}
              className="p-1.5 text-gray-500 hover:text-brand-600 hover:bg-white rounded"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={() => handleDelete(f)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={handleAttach}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
      >
        <Paperclip size={12} />
        {busy ? "Attaching..." : files.length > 0 ? "Attach another" : "Attach file"}
      </button>
    </div>
  );
}
