import { getCloudflareContext } from "@opennextjs/cloudflare";

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_EXPIRIES = new Set([3600, 86400, 604800]);

interface StoredFile {
  body: ReadableStream;
  size: number;
  httpEtag: string;
  customMetadata?: Record<string, string>;
}

interface StoredFileHead {
  size: number;
  customMetadata?: Record<string, string>;
}

interface FileSharesBucket {
  put(key: string, value: ReadableStream | ArrayBuffer | Blob, options?: { customMetadata?: Record<string, string> }): Promise<unknown>;
  get(key: string): Promise<StoredFile | null>;
  head(key: string): Promise<StoredFileHead | null>;
  delete(key: string): Promise<void>;
}

export function getFileBucket() {
  const env = getCloudflareContext().env as unknown as { FILE_SHARES?: FileSharesBucket };
  if (!env.FILE_SHARES) throw new Error("File sharing storage is not configured");
  return env.FILE_SHARES;
}

export function fileKey(id: string) {
  return `shares/${id}`;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

export async function hashPassword(password: string, salt?: Uint8Array) {
  const actualSalt = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: actualSalt.buffer as ArrayBuffer, iterations: 100_000 }, key, 256);
  return { salt: bytesToHex(actualSalt), hash: bytesToHex(new Uint8Array(bits)) };
}

export async function passwordMatches(password: string, salt: string, expected: string) {
  const candidate = await hashPassword(password, hexToBytes(salt));
  if (candidate.hash.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= candidate.hash.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

async function fileAccessKey(passwordHash: string) {
  return crypto.subtle.importKey("raw", hexToBytes(passwordHash), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createFileAccessToken(id: string, passwordHash: string) {
  const expiresAt = Date.now() + 60_000;
  const payload = `${id}.${expiresAt}`;
  const signature = await crypto.subtle.sign("HMAC", await fileAccessKey(passwordHash), new TextEncoder().encode(payload));
  return `${expiresAt}.${bytesToHex(new Uint8Array(signature))}`;
}

export async function fileAccessTokenMatches(token: string, id: string, passwordHash: string) {
  const [rawExpiry, signature, extra] = token.split(".");
  if (extra || !/^\d{13}$/.test(rawExpiry) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expiresAt = Number(rawExpiry);
  if (expiresAt <= Date.now() || expiresAt > Date.now() + 65_000) return false;
  const payload = new TextEncoder().encode(`${id}.${expiresAt}`);
  return crypto.subtle.verify("HMAC", await fileAccessKey(passwordHash), hexToBytes(signature), payload);
}

export function safeFilename(name: string) {
  const cleaned = name.replace(/[\r\n]/g, "").trim();
  return cleaned.slice(0, 180) || "download";
}

export function isExpired(metadata?: Record<string, string>) {
  return Number(metadata?.expiresAt ?? 0) <= Date.now();
}
