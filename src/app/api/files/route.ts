import { NextResponse } from "next/server";
import { ALLOWED_EXPIRIES, fileKey, getFileBucket, hashPassword, MAX_FILE_SIZE, safeFilename } from "@/lib/fileShares";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const expiresIn = Number(form.get("expiresIn"));
    const password = String(form.get("password") ?? "");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    if (file.size === 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Files must be between 1 byte and 10 MB." }, { status: 400 });
    if (!ALLOWED_EXPIRIES.has(expiresIn)) return NextResponse.json({ error: "Choose a valid expiration time." }, { status: 400 });
    if (password.length > 128) return NextResponse.json({ error: "Password is too long." }, { status: 400 });

    const id = crypto.randomUUID().replaceAll("-", "");
    const metadata: Record<string, string> = {
      filename: safeFilename(file.name), contentType: file.type || "application/octet-stream", expiresAt: String(Date.now() + expiresIn * 1000),
    };
    if (password) {
      const protectedPassword = await hashPassword(password);
      metadata.passwordSalt = protectedPassword.salt;
      metadata.passwordHash = protectedPassword.hash;
    }
    await getFileBucket().put(fileKey(id), file.stream(), { customMetadata: metadata });
    return NextResponse.json({ id, expiresAt: Number(metadata.expiresAt), url: new URL(`/share/${id}`, request.url).toString() });
  } catch (error) {
    console.error("File upload failed", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
