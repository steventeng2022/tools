"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

function parseInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  const date = Number.isFinite(numeric) ? new Date(trimmed.length <= 10 ? numeric * 1000 : numeric) : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function TimestampConverter() {
  const [input, setInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const date = parseInput(input);
  return <ToolLayout title="Timestamp Converter" description="Convert Unix timestamps, ISO dates, UTC, and local time">
    <div className="space-y-5">
      <label className="block text-sm font-medium">Timestamp or date<input value={input} onChange={(event) => setInput(event.target.value)} placeholder="1723723200 or 2024-08-15T12:00:00Z" className="mt-2 w-full rounded-lg border bg-white p-3 font-mono dark:border-gray-600 dark:bg-gray-700" /></label>
      <button onClick={() => setInput(String(Math.floor(Date.now() / 1000)))} className="rounded-lg bg-cyan-700 px-4 py-2 text-white">Use current time</button>
      {date ? <div className="grid gap-3">{[["Unix seconds", Math.floor(date.getTime()/1000)], ["Unix milliseconds", date.getTime()], ["ISO 8601", date.toISOString()], ["UTC", date.toUTCString()], ["Local time", date.toLocaleString()]].map(([label, value]) => <div key={label} className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700"><span className="block text-xs font-semibold uppercase text-gray-500">{label}</span><span className="mt-1 block break-all font-mono text-gray-900 dark:text-white">{value}</span></div>)}</div> : <p className="rounded-lg bg-red-50 p-4 text-red-700">Enter a valid timestamp or date.</p>}
    </div>
  </ToolLayout>;
}
