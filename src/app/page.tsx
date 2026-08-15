"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Braces, Clock3, Code2, Diff, FileKey2, Fingerprint, KeyRound, Link as LinkIcon,
  QrCode, Search, ShieldCheck, UploadCloud,
} from "lucide-react";

const groups = [
  {
    name: "Share & Security",
    description: "Private sharing and defensive security essentials",
    tools: [
      { name: "Private File Sharing", description: "Expiring R2 links with optional password protection", icon: UploadCloud, href: "/file-sharing", accent: "from-blue-500 to-cyan-400", badge: "Cloud" },
      { name: "File Hash Checker", description: "Calculate SHA checksums and verify downloads locally", icon: FileKey2, href: "/hash-checker", accent: "from-indigo-500 to-violet-400", badge: "Local" },
      { name: "Password Lab", description: "Generate strong passwords and check their strength", icon: KeyRound, href: "/password-tool", accent: "from-emerald-500 to-teal-400", badge: "Local" },
    ],
  },
  {
    name: "Developer Tools",
    description: "Everyday helpers for coding, debugging, and coursework",
    tools: [
      { name: "JSON Formatter", description: "Format, validate, and minify JSON data", icon: Braces, href: "/json-formatter", accent: "from-violet-500 to-fuchsia-400", badge: "Local" },
      { name: "Text Diff", description: "Compare two snippets with line-level changes", icon: Diff, href: "/text-diff", accent: "from-rose-500 to-orange-400", badge: "Local" },
      { name: "Base64 Encoder", description: "Encode and decode Base64 strings", icon: Code2, href: "/base64", accent: "from-orange-500 to-amber-400", badge: "Local" },
      { name: "URL Encoder", description: "Safely encode and decode URL components", icon: LinkIcon, href: "/url-encoder", accent: "from-cyan-500 to-sky-400", badge: "Local" },
      { name: "UUID Generator", description: "Generate one or many cryptographic UUID v4 values", icon: Fingerprint, href: "/uuid-generator", accent: "from-purple-500 to-indigo-400", badge: "Local" },
      { name: "Timestamp Converter", description: "Convert Unix, ISO, UTC, and local dates", icon: Clock3, href: "/timestamp-converter", accent: "from-teal-500 to-cyan-400", badge: "Local" },
    ],
  },
  {
    name: "Links & Creation",
    description: "Simple tools for sharing projects and information",
    tools: [
      { name: "QR Code Generator", description: "Create customizable QR codes for any URL", icon: QrCode, href: "/qr-generator", accent: "from-green-500 to-emerald-400", badge: "Local" },
      { name: "URL Shortener", description: "Create short, shareable links", icon: LinkIcon, href: "/url-shortener", accent: "from-blue-500 to-indigo-400", badge: "Cloud" },
    ],
  },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const total = groups.reduce((sum, group) => sum + group.tools.length, 0);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const visibleGroups = groups.map((group) => ({ ...group, tools: group.tools.filter((tool) => `${tool.name} ${tool.description}`.toLowerCase().includes(query.toLowerCase())) })).filter((group) => group.tools.length);

  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.16),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(124,58,237,0.12),transparent_30%)]" />
      <div className="relative mx-auto max-w-6xl px-5 py-12 md:py-16">
        <header className="border-b border-white/10 pb-9">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300"><ShieldCheck size={14} /> Privacy-first utilities</div>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Steven&apos;s <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Toolbox</span></h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">Useful, ad-free tools for students, developers, and security learners. No account required.</p>
            </div>
            <div className="text-sm text-slate-500"><strong className="text-slate-200">{total}</strong> working tools</div>
          </div>
        </header>

        <div className="sticky top-0 z-20 -mx-2 bg-[#080b12]/90 px-2 py-6 backdrop-blur-xl">
          <div className="relative"><Search className="absolute left-4 top-3.5 text-slate-500" size={20} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools…" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-12 pr-20 text-white outline-none transition focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10" /><kbd className="absolute right-3 top-3 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-500">Ctrl K</kbd></div>
        </div>

        <div className="space-y-12">
          {visibleGroups.map((group) => <section key={group.name}>
            <div className="mb-5 flex items-end justify-between border-b border-white/10 pb-3"><div><h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">{group.name}</h2><p className="mt-1 text-sm text-slate-500">{group.description}</p></div><span className="text-xs text-slate-600">{group.tools.length}</span></div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{group.tools.map((tool) => { const Icon = tool.icon; return <Link key={tool.name} href={tool.href} className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]">
              <div className={`mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${tool.accent} text-white shadow-lg shadow-black/20`}><Icon size={20} /></div>
              <div className="flex items-center gap-2"><h3 className="font-semibold text-slate-100 group-hover:text-white">{tool.name}</h3><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tool.badge === "Local" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"}`}>{tool.badge}</span></div>
              <p className="mt-2 text-sm leading-6 text-slate-500 group-hover:text-slate-400">{tool.description}</p>
            </Link>; })}</div>
          </section>)}
          {!visibleGroups.length && <div className="rounded-xl border border-white/10 p-10 text-center text-slate-400">No tools match “{query}”.</div>}
        </div>
        <footer className="mt-16 flex flex-col gap-2 border-t border-white/10 pt-7 text-sm text-slate-600 md:flex-row md:justify-between"><p>Built for learning, building, and safer debugging.</p><p>Local means your data never leaves this browser.</p></footer>
      </div>
    </main>
  );
}
