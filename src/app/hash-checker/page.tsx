"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { CheckCircle2, Copy, FileKey2, XCircle } from "lucide-react";

type Algorithm = "SHA-256" | "SHA-384" | "SHA-512";
const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

export default function HashChecker() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("SHA-256");
  const [hash, setHash] = useState("");
  const [expected, setExpected] = useState("");
  const [filename, setFilename] = useState("");
  const [working, setWorking] = useState(false);
  const matches = expected.trim() ? hash.toLowerCase() === expected.trim().toLowerCase() : null;

  async function process(file?: File) {
    if (!file) return;
    setWorking(true); setFilename(file.name);
    setHash(toHex(await crypto.subtle.digest(algorithm, await file.arrayBuffer())));
    setWorking(false);
  }

  return <ToolLayout title="File Hash Checker" description="Calculate and verify file checksums entirely in your browser">
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
        <label className="rounded-xl border-2 border-dashed border-gray-300 p-7 text-center dark:border-gray-600"><FileKey2 className="mx-auto mb-2 text-indigo-600" size={36} /><span className="block font-medium text-gray-900 dark:text-white">{filename || "Choose a file"}</span><input type="file" className="mt-3 block w-full text-sm" onChange={(event) => process(event.target.files?.[0])} /></label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Algorithm<select value={algorithm} onChange={(event) => { setAlgorithm(event.target.value as Algorithm); setHash(""); }} className="mt-2 w-full rounded-lg border bg-white p-3 dark:border-gray-600 dark:bg-gray-700"><option>SHA-256</option><option>SHA-384</option><option>SHA-512</option></select></label>
      </div>
      {working && <p className="text-sm text-gray-500">Calculating hash…</p>}
      {hash && <div><label className="text-sm font-medium text-gray-700 dark:text-gray-200">Calculated hash</label><div className="mt-2 flex gap-2"><textarea readOnly value={hash} rows={3} className="min-w-0 flex-1 break-all rounded-lg border bg-gray-50 p-3 font-mono text-sm dark:border-gray-600 dark:bg-gray-700" /><button onClick={() => navigator.clipboard.writeText(hash)} className="rounded-lg bg-indigo-600 px-4 text-white" aria-label="Copy hash"><Copy size={19} /></button></div></div>}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Expected hash (optional)<input value={expected} onChange={(event) => setExpected(event.target.value)} placeholder="Paste the checksum supplied by the publisher" className="mt-2 w-full rounded-lg border bg-white p-3 font-mono text-sm dark:border-gray-600 dark:bg-gray-700" /></label>
      {matches !== null && <p className={`flex items-center gap-2 rounded-lg p-4 font-medium ${matches ? "bg-green-50 text-green-700 dark:bg-green-950/30" : "bg-red-50 text-red-700 dark:bg-red-950/30"}`}>{matches ? <CheckCircle2 /> : <XCircle />}{matches ? "Match — the file checksum is verified." : "Does not match — do not trust this download."}</p>}
      <p className="text-sm text-gray-500">Privacy: the selected file never leaves your device.</p>
    </div>
  </ToolLayout>;
}
