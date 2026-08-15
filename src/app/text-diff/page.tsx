"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";

type DiffLine = { type: "same" | "add" | "remove"; text: string };

function compare(leftText: string, rightText: string): DiffLine[] {
  const left = leftText.split("\n").slice(0, 400);
  const right = rightText.split("\n").slice(0, 400);
  const table = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1) for (let j = right.length - 1; j >= 0; j -= 1) table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const result: DiffLine[] = [];
  let i = 0; let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) { result.push({ type: "same", text: left[i] }); i += 1; j += 1; }
    else if (table[i + 1][j] >= table[i][j + 1]) { result.push({ type: "remove", text: left[i] }); i += 1; }
    else { result.push({ type: "add", text: right[j] }); j += 1; }
  }
  while (i < left.length) result.push({ type: "remove", text: left[i++] });
  while (j < right.length) result.push({ type: "add", text: right[j++] });
  return result;
}

export default function TextDiff() {
  const [left, setLeft] = useState("const version = 1;\nconsole.log('hello');");
  const [right, setRight] = useState("const version = 2;\nconsole.log('hello world');");
  const diff = useMemo(() => compare(left, right), [left, right]);
  return <ToolLayout title="Text Diff" description="Compare two snippets line by line in your browser">
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Original<textarea value={left} onChange={(event) => setLeft(event.target.value)} rows={10} className="mt-2 w-full rounded-lg border bg-white p-3 font-mono text-sm dark:border-gray-600 dark:bg-gray-700" /></label><label className="text-sm font-medium">Changed<textarea value={right} onChange={(event) => setRight(event.target.value)} rows={10} className="mt-2 w-full rounded-lg border bg-white p-3 font-mono text-sm dark:border-gray-600 dark:bg-gray-700" /></label></div>
      <div className="overflow-hidden rounded-lg border font-mono text-sm dark:border-gray-600">{diff.map((line, index) => <div key={`${index}-${line.type}`} className={`flex px-3 py-1 ${line.type === "add" ? "bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200" : line.type === "remove" ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200" : "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}><span className="mr-3 w-4 select-none">{line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}</span><span className="whitespace-pre-wrap break-all">{line.text || " "}</span></div>)}</div>
      <p className="text-sm text-gray-500">Up to 400 lines per side. Text stays on your device.</p>
    </div>
  </ToolLayout>;
}
