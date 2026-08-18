import { getFileBucket } from "@/lib/fileShares";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ code: string }> };

interface ShortUrlRecord {
  destination: string;
  expiresAt: number | null;
}

function notFound(request: Request, reason: "missing" | "expired") {
  const url = new URL("/url-shortener", request.url);
  url.searchParams.set("error", reason);
  return new Response(null, { status: 302, headers: { Location: url.toString(), "Cache-Control": "no-store" } });
}

export async function GET(request: Request, context: RouteContext) {
  const { code } = await context.params;
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(code)) return notFound(request, "missing");

  try {
    const object = await getFileBucket().get(`short-urls/${code}`);
    if (!object) return notFound(request, "missing");

    const record = (await new Response(object.body).json()) as ShortUrlRecord;
    if (record.expiresAt !== null && record.expiresAt <= Date.now()) return notFound(request, "expired");

    const destination = new URL(record.destination);
    if (destination.protocol !== "http:" && destination.protocol !== "https:") return notFound(request, "missing");
    return new Response(null, { status: 302, headers: { Location: destination.toString(), "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Short URL redirect failed", error);
    return notFound(request, "missing");
  }
}
