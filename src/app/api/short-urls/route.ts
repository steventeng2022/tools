import { NextResponse } from "next/server";
import { getFileBucket } from "@/lib/fileShares";

export const runtime = "nodejs";

const CUSTOM_CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
const MAX_URL_LENGTH = 2_048;

function shortUrlKey(code: string) {
  return `short-urls/${code}`;
}

function parseDestination(value: unknown) {
  if (typeof value !== "string" || value.length > MAX_URL_LENGTH) return null;
  try {
    const destination = new URL(value.trim());
    return destination.protocol === "http:" || destination.protocol === "https:" ? destination.toString() : null;
  } catch {
    return null;
  }
}

function randomCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 8);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown; customCode?: unknown; expirationDays?: unknown };
    const destination = parseDestination(body.url);
    if (!destination) return NextResponse.json({ error: "Enter a valid http:// or https:// URL." }, { status: 400 });

    const requestedCode = typeof body.customCode === "string" ? body.customCode.trim() : "";
    if (requestedCode && !CUSTOM_CODE_PATTERN.test(requestedCode)) {
      return NextResponse.json({ error: "Custom codes must be 3–32 letters, numbers, hyphens, or underscores." }, { status: 400 });
    }

    const rawExpiration = body.expirationDays;
    const expirationDays = rawExpiration === "" || rawExpiration == null ? null : Number(rawExpiration);
    if (expirationDays !== null && (!Number.isInteger(expirationDays) || expirationDays < 1 || expirationDays > 365)) {
      return NextResponse.json({ error: "Expiration must be between 1 and 365 days." }, { status: 400 });
    }

    const bucket = getFileBucket();
    let code = requestedCode;
    if (requestedCode) {
      if (await bucket.head(shortUrlKey(requestedCode))) {
        return NextResponse.json({ error: "That custom code is already in use." }, { status: 409 });
      }
    } else {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        code = randomCode();
        if (!(await bucket.head(shortUrlKey(code)))) break;
        code = "";
      }
    }
    if (!code) return NextResponse.json({ error: "Could not create a unique link. Please try again." }, { status: 503 });

    const createdAt = Date.now();
    const expiresAt = expirationDays === null ? null : createdAt + expirationDays * 86_400_000;
    await bucket.put(
      shortUrlKey(code),
      new Blob([JSON.stringify({ destination, createdAt, expiresAt })], { type: "application/json" }),
    );

    return NextResponse.json({
      code,
      destination,
      createdAt,
      expiresAt,
      shortUrl: new URL(`/s/${code}`, request.url).toString(),
    });
  } catch (error) {
    console.error("URL shortening failed", error);
    return NextResponse.json({ error: "Could not create the short link. Please try again." }, { status: 500 });
  }
}
