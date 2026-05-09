import fs from "fs/promises";
import path from "path";
import { put, del } from "@vercel/blob";

const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const STORAGE_DIR = process.env.SPEC_STORAGE_DIR ?? path.join(process.cwd(), ".spec-storage");

async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

export async function saveSpec(filename: string, buffer: Buffer): Promise<string> {
  if (USE_BLOB) {
    const blob = await put(filename, buffer, { access: "public" });
    return blob.url;
  }
  await ensureDir();
  await fs.writeFile(path.join(STORAGE_DIR, filename), buffer);
  return filename;
}

export async function readSpec(key: string): Promise<Buffer> {
  if (key.startsWith("https://")) {
    const res = await fetch(key);
    if (!res.ok) throw new Error(`Failed to fetch spec: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(path.join(STORAGE_DIR, key));
}

export async function deleteSpec(key: string): Promise<void> {
  if (key.startsWith("https://")) {
    await del(key);
    return;
  }
  await fs.unlink(path.join(STORAGE_DIR, key)).catch(() => {});
}
