import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = process.env.SPEC_STORAGE_DIR ?? path.join(process.cwd(), ".spec-storage");

async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

export async function saveSpec(key: string, buffer: Buffer): Promise<void> {
  await ensureDir();
  await fs.writeFile(path.join(STORAGE_DIR, key), buffer);
}

export async function readSpec(key: string): Promise<Buffer> {
  return fs.readFile(path.join(STORAGE_DIR, key));
}

export async function deleteSpec(key: string): Promise<void> {
  await fs.unlink(path.join(STORAGE_DIR, key)).catch(() => {});
}
