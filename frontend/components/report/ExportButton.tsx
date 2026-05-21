"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface ExportButtonProps {
  sessionId: string;
}

/** Shared helper: fetch a binary endpoint and trigger a browser file download. */
async function triggerDownload(url: string, filename: string): Promise<void> {
  const token = getToken();
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Export failed: ${r.statusText}`);
  const blob = await r.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ExportButton({ sessionId }: ExportButtonProps) {
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function handleCsvDownload() {
    setDownloadingCsv(true);
    try {
      await triggerDownload(api.sessions.exportCsvUrl(sessionId), `session_${sessionId}.csv`);
    } finally {
      setDownloadingCsv(false);
    }
  }

  async function handlePdfDownload() {
    setDownloadingPdf(true);
    try {
      await triggerDownload(api.sessions.exportPdfUrl(sessionId), `session_${sessionId}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCsvDownload}
        disabled={downloadingCsv || downloadingPdf}
        className="btn-secondary text-xs px-4 py-2.5 shrink-0"
      >
        {downloadingCsv
          ? <><Loader2 size={13} className="animate-spin" /> Exporting…</>
          : <><Download size={13} strokeWidth={1.75} /> Export CSV</>
        }
      </button>

      <button
        onClick={handlePdfDownload}
        disabled={downloadingCsv || downloadingPdf}
        className="btn-secondary text-xs px-4 py-2.5 shrink-0"
      >
        {downloadingPdf
          ? <><Loader2 size={13} className="animate-spin" /> Exporting…</>
          : <><FileText size={13} strokeWidth={1.75} /> Download PDF</>
        }
      </button>
    </div>
  );
}
