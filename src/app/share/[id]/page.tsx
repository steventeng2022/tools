"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ToolLayout from "@/components/ToolLayout";
import { Download, File, Lock } from "lucide-react";

interface FileMetadata { filename: string; size: number; expiresAt: number; passwordProtected: boolean }

export default function SharedFilePage() {
  const { id } = useParams<{ id: string }>();
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Loading shared file…");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/files/${id}?meta=1`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "File unavailable.");
      setMetadata(data); setMessage("");
    }).catch((error: Error) => setMessage(error.message));
  }, [id]);

  async function download() {
    setDownloading(true); setMessage("");
    try {
      const response = await fetch(`/api/files/${id}`, { cache: "no-store", headers: password ? { "X-File-Password": password } : undefined });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Download failed."); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = metadata?.filename ?? "download"; anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Download failed."); }
    finally { setDownloading(false); }
  }

  return (
    <ToolLayout title="Shared File" description="A private, temporary download">
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <File className="mx-auto text-blue-600" size={56} />
        {metadata && <>
          <div><h2 className="break-all text-xl font-semibold text-gray-900 dark:text-white">{metadata.filename}</h2><p className="mt-2 text-sm text-gray-500">{(metadata.size / 1024 / 1024).toFixed(2)} MB · expires {new Date(metadata.expiresAt).toLocaleString()}</p></div>
          {metadata.passwordProtected && <label className="block text-left text-sm font-medium text-gray-700 dark:text-gray-200">Password<div className="relative mt-2"><Lock className="absolute left-3 top-3.5 text-gray-400" size={18} /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div></label>}
          <button onClick={download} disabled={downloading || (metadata.passwordProtected && !password)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Download size={20} /> {downloading ? "Preparing…" : "Download file"}</button>
        </>}
        {message && <p role="status" className="rounded-lg bg-gray-100 p-4 text-gray-700 dark:bg-gray-700 dark:text-gray-200">{message}</p>}
      </div>
    </ToolLayout>
  );
}
