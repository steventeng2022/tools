"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Copy, RefreshCw } from "lucide-react";

const sets = { lower: "abcdefghijklmnopqrstuvwxyz", upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", numbers: "0123456789", symbols: "!@#$%^&*()-_=+[]{}" };

export default function PasswordTool() {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(20);
  const [options, setOptions] = useState({ lower: true, upper: true, numbers: true, symbols: true });
  const checks = useMemo(() => [password.length >= 12, password.length >= 16, /[a-z]/.test(password) && /[A-Z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)], [password]);
  const score = checks.filter(Boolean).length;

  function generate() {
    const enabled = Object.entries(options).filter(([, value]) => value).map(([key]) => sets[key as keyof typeof sets]);
    if (!enabled.length) return;
    const all = enabled.join("");
    const random = crypto.getRandomValues(new Uint32Array(length));
    const chars = enabled.map((set, index) => set[random[index] % set.length]);
    for (let index = chars.length; index < length; index += 1) chars.push(all[random[index] % all.length]);
    for (let index = chars.length - 1; index > 0; index -= 1) { const target = random[index] % (index + 1); [chars[index], chars[target]] = [chars[target], chars[index]]; }
    setPassword(chars.join(""));
  }

  return <ToolLayout title="Password Lab" description="Generate strong passwords and check strength locally">
    <div className="space-y-6">
      <div><label className="text-sm font-medium">Password</label><div className="mt-2 flex gap-2"><input value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 rounded-lg border bg-white p-3 font-mono dark:border-gray-600 dark:bg-gray-700" /><button onClick={() => navigator.clipboard.writeText(password)} className="rounded-lg bg-blue-600 px-4 text-white" aria-label="Copy password"><Copy size={19} /></button></div></div>
      <div><div className="mb-2 flex justify-between text-sm"><span>Strength</span><span>{["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"][score]}</span></div><div className="flex gap-1">{[0,1,2,3,4].map((item) => <div key={item} className={`h-2 flex-1 rounded ${item < score ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"}`} />)}</div></div>
      <label className="block text-sm font-medium">Length: {length}<input type="range" min="8" max="64" value={length} onChange={(event) => setLength(Number(event.target.value))} className="mt-2 w-full" /></label>
      <div className="grid grid-cols-2 gap-3">{Object.keys(options).map((key) => <label key={key} className="flex items-center gap-2 rounded-lg border p-3 capitalize dark:border-gray-600"><input type="checkbox" checked={options[key as keyof typeof options]} onChange={(event) => setOptions({ ...options, [key]: event.target.checked })} />{key}</label>)}</div>
      <button onClick={generate} disabled={!Object.values(options).some(Boolean)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"><RefreshCw size={19} /> Generate secure password</button>
      <p className="text-sm text-gray-500">Passwords are generated with your browser’s cryptographic random number generator and are never sent anywhere.</p>
    </div>
  </ToolLayout>;
}
