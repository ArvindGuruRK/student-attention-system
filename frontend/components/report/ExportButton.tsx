"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface ExportButtonProps {
  sessionId: string;
}

export function ExportButton({ sessionId }: ExportButtonProps) {
  const [downloading, setDownloading] = useState(false);

  async function handleCsvDownload() {
    setDownloading(true);
    try {
      const url = api.sessions.exportCsvUrl(sessionId);
      const token = getToken();
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `session_${sessionId}.csv`;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleCsvDownload}
      disabled={downloading}
      className="btn-secondary text-xs px-4 py-2.5 shrink-0"
    >
      {downloading
        ? <><Loader2 size={13} className="animate-spin" /> Exporting…</>
        : <><Download size={13} strokeWidth={1.75} /> Export CSV</>
      }
    </button>
  );
}
