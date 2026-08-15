"use client";

import { useRef, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Check, Copy, FileUp, Lock, ShieldCheck } from "lucide-react";

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileSharing() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [expiresIn, setExpiresIn] = useState("86400");
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function upload() {
    if (!file) return setError("Choose a file first.");
    setUploading(true); setError(""); setShareUrl("");
    try {
      const form = new FormData();
      form.append("file", file); form.append("expiresIn", expiresIn); form.append("password", password);
      const response = await fetch("/api/files", { method: "POST", body: form });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Upload failed.");
      setShareUrl(data.url);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Upload failed."); }
    finally { setUploading(false); }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <ToolLayout title="Private File Sharing" description="Share one file with an expiring, optional password-protected link">
      <div className="space-y-6">
        <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const dropped = event.dataTransfer.files[0]; if (dropped) setFile(dropped); }} className="w-full rounded-xl border-2 border-dashed border-gray-300 p-10 text-center transition-colors hover:border-blue-500 dark:border-gray-600">
          <FileUp className="mx-auto mb-3 text-blue-600" size={42} />
          <span className="font-semibold text-gray-900 dark:text-white">{file ? file.name : "Drop a file here or click to choose"}</span>
          <span className="mt-2 block text-sm text-gray-500">{file ? formatBytes(file.size) : "Maximum file size: 10 MB"}</span>
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Link expires after
            <select value={expiresIn} onChange={(event) => setExpiresIn(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"><option value="3600">1 hour</option><option value="86400">1 day</option><option value="604800">7 days</option></select>
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Optional password
            <div className="relative mt-2"><Lock className="absolute left-3 top-3.5 text-gray-400" size={18} /><input type="password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank for no password" className="w-full rounded-lg border border-gray-300 bg-white p-3 pl-10 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white" /></div>
          </label>
        </div>
        <button onClick={upload} disabled={!file || uploading || (file?.size ?? 0) > 10 * 1024 * 1024} className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{uploading ? "Uploading securely…" : "Create sharing link"}</button>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        {shareUrl && <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950/30">
          <div className="mb-3 flex items-center gap-2 font-semibold text-green-800 dark:text-green-200"><Check size={20} /> Link ready</div>
          <div className="flex gap-2"><input readOnly value={shareUrl} className="min-w-0 flex-1 rounded-lg border border-green-300 bg-white p-3 text-sm text-gray-900 dark:bg-gray-800 dark:text-white" /><button onClick={copyLink} className="rounded-lg bg-green-700 px-4 text-white hover:bg-green-800" aria-label="Copy link"><Copy size={19} /></button></div>
          {copied && <p className="mt-2 text-sm text-green-700 dark:text-green-300">Copied to clipboard.</p>}
        </div>}
        <div className="flex gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950/30 dark:text-blue-100"><ShieldCheck className="shrink-0" size={22} /><p>Files are stored privately and are not listed publicly. Passwords are protected with PBKDF2. Expired files are removed when accessed.</p></div>
      </div>
    </ToolLayout>
  );
}
