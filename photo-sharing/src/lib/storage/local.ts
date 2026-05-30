import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { StorageDriver } from "./index";
import type { ProcessedImage } from "./types";

/**
 * Local-disk driver that mimics the S3 contract: it issues a "presigned"
 * URL pointing at an internal PUT route, then processes the raw bytes
 * on finalize. Same flow as production so nothing in the UI changes.
 */
export class LocalDriver implements StorageDriver {
  private baseDir = path.join(process.cwd(), "data", "uploads");
  private rawDir = path.join(this.baseDir, "raw");

  async presignPut({ ext }: { contentType: string; ext: string }) {
    await fs.mkdir(this.rawDir, { recursive: true });
    const key = `raw/${crypto.randomBytes(8).toString("hex")}.${ext}`;
    // In prod this would be a time-limited signed S3 URL.
    return {
      uploadUrl: `/api/local-upload?key=${encodeURIComponent(key)}`,
      key,
      method: "PUT" as const,
    };
  }

  async processRaw(rawKey: string): Promise<ProcessedImage> {
    if (!rawKey.startsWith("raw/")) throw new Error("invalid key");
    const rawPath = path.join(this.baseDir, rawKey);
    const buf = await fs.readFile(rawPath);
    const id = crypto.randomBytes(8).toString("hex");

    const base = sharp(buf, { failOn: "error" }).rotate();
    const fullPath = path.join(this.baseDir, `${id}.webp`);
    const thumbPath = path.join(this.baseDir, `${id}_thumb.webp`);

    const fullInfo = await base
      .clone()
      .resize({ width: 1440, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(fullPath);

    await base
      .clone()
      .resize({ width: 320, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(thumbPath);

    // Best-effort cleanup of the raw upload.
    fs.unlink(rawPath).catch(() => {});

    return {
      url: `/uploads/${id}.webp`,
      thumb_url: `/uploads/${id}_thumb.webp`,
      width: fullInfo.width,
      height: fullInfo.height,
    };
  }
}
