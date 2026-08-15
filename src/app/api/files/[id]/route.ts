import { NextResponse } from "next/server";
import { fileKey, getFileBucket, isExpired, passwordMatches, safeFilename } from "@/lib/fileShares";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{32}$/.test(id)) return NextResponse.json({ error: "Invalid link." }, { status: 400 });
  try {
    const bucket = getFileBucket();
    const key = fileKey(id);
    const url = new URL(request.url);
    if (url.searchParams.get("meta") === "1") {
      const object = await bucket.head(key);
      if (!object) return NextResponse.json({ error: "File not found." }, { status: 404 });
      if (isExpired(object.customMetadata)) {
        await bucket.delete(key);
        return NextResponse.json({ error: "This file has expired." }, { status: 410 });
      }
      return NextResponse.json({ filename: object.customMetadata?.filename ?? "download", size: object.size, expiresAt: Number(object.customMetadata?.expiresAt), passwordProtected: Boolean(object.customMetadata?.passwordHash) });
    }

    const object = await bucket.get(key);
    if (!object) return NextResponse.json({ error: "File not found." }, { status: 404 });
    const metadata = object.customMetadata;
    if (isExpired(metadata)) {
      await bucket.delete(key);
      return NextResponse.json({ error: "This file has expired." }, { status: 410 });
    }
    if (metadata?.passwordHash && metadata.passwordSalt) {
      const supplied = request.headers.get("X-File-Password") ?? "";
      if (!supplied || !(await passwordMatches(supplied, metadata.passwordSalt, metadata.passwordHash))) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
    const filename = safeFilename(metadata?.filename ?? "download");
    const headers = new Headers({
      "Content-Type": metadata?.contentType ?? "application/octet-stream",
      "Content-Length": String(object.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store", ETag: object.httpEtag, "X-Content-Type-Options": "nosniff",
    });
    return new Response(object.body, { headers });
  } catch (error) {
    console.error("File download failed", error);
    return NextResponse.json({ error: "File service is temporarily unavailable." }, { status: 500 });
  }
}
