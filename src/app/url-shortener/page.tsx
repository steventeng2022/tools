"use client";

import { FormEvent, useEffect, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Calendar, Check, Copy, ExternalLink, Link as LinkIcon } from "lucide-react";

interface ShortenedUrl {
  code: string;
  destination: string;
  shortUrl: string;
  createdAt: number;
  expiresAt: number | null;
}

export default function URLShortener() {
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expirationDays, setExpirationDays] = useState("");
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("error");
    if (reason === "expired") setError("That short link has expired.");
    if (reason === "missing") setError("That short link does not exist.");
  }, []);

  const handleShorten = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/short-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), customCode: customCode.trim(), expirationDays }),
      });
      const result = (await response.json()) as ShortenedUrl & { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not create the short link.");
      setShortenedUrls((current) => [result, ...current]);
      setUrl("");
      setCustomCode("");
      setExpirationDays("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the short link.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (item: ShortenedUrl) => {
    await navigator.clipboard.writeText(item.shortUrl);
    setCopiedCode(item.code);
    window.setTimeout(() => setCopiedCode(null), 2_000);
  };

  return (
    <ToolLayout title="URL Shortener" description="Create real, shareable links with optional custom codes and expiration dates">
      <div className="space-y-8">
        <form className="space-y-6" onSubmit={handleShorten}>
          <div>
            <label htmlFor="url" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Enter URL to shorten</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input id="url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/very/long/url" className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="customCode" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Custom short code (optional)</label>
              <input id="customCode" type="text" minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" value={customCode} onChange={(event) => setCustomCode(event.target.value)} placeholder="my-custom-link" className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">3–32 letters, numbers, hyphens, or underscores</p>
            </div>
            <div>
              <label htmlFor="expiration" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Expiration (days, optional)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input id="expiration" type="number" min="1" max="365" value={expirationDays} onChange={(event) => setExpirationDays(event.target.value)} placeholder="30" className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400" />
              </div>
            </div>
          </div>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}

          <button type="submit" disabled={!url.trim() || isLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400">
            <LinkIcon size={20} />
            <span>{isLoading ? "Creating link..." : "Shorten URL"}</span>
          </button>
        </form>

        {shortenedUrls.length > 0 && (
          <section className="space-y-4" aria-labelledby="created-links-title">
            <h2 id="created-links-title" className="text-xl font-semibold text-gray-900 dark:text-white">Your new short links</h2>
            {shortenedUrls.map((item) => (
              <article key={item.code} className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <a href={item.shortUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 break-all text-lg font-semibold text-blue-600 hover:underline dark:text-blue-400">
                      {item.shortUrl}<ExternalLink size={16} className="shrink-0" />
                    </a>
                    <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">→ {item.destination}</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Created {new Date(item.createdAt).toLocaleDateString()}
                      {item.expiresAt ? ` · Expires ${new Date(item.expiresAt).toLocaleDateString()}` : " · No expiration"}
                    </p>
                  </div>
                  <button type="button" onClick={() => copyToClipboard(item)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-500 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
                    {copiedCode === item.code ? <Check size={16} /> : <Copy size={16} />}
                    {copiedCode === item.code ? "Copied" : "Copy link"}
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </ToolLayout>
  );
}
