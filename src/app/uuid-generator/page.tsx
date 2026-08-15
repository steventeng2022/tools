"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Copy, RefreshCw } from "lucide-react";

export default function UuidGenerator() {
  const [count, setCount] = useState(5);
  const [values, setValues] = useState(() => Array.from({ length: 5 }, () => crypto.randomUUID()));
  const generate = () => setValues(Array.from({ length: count }, () => crypto.randomUUID()));
  return <ToolLayout title="UUID Generator" description="Generate cryptographically random UUID v4 identifiers">
    <div className="space-y-5">
      <div className="flex gap-3"><label className="flex-1 text-sm font-medium">Quantity (1–50)<input type="number" min="1" max="50" value={count} onChange={(event) => setCount(Math.max(1, Math.min(50, Number(event.target.value))))} className="mt-2 w-full rounded-lg border bg-white p-3 dark:border-gray-600 dark:bg-gray-700" /></label><button onClick={generate} className="mt-7 flex items-center gap-2 rounded-lg bg-violet-600 px-5 font-semibold text-white"><RefreshCw size={18} /> Generate</button></div>
      <textarea readOnly rows={Math.min(14, values.length + 1)} value={values.join("\n")} className="w-full rounded-lg border bg-gray-50 p-4 font-mono text-sm dark:border-gray-600 dark:bg-gray-700" />
      <button onClick={() => navigator.clipboard.writeText(values.join("\n"))} className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-600 p-3 font-semibold text-violet-700 dark:text-violet-300"><Copy size={18} /> Copy all UUIDs</button>
    </div>
  </ToolLayout>;
}
