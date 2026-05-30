import type { ProcessedImage } from "./types";

/**
 * Storage driver contract. Same shape regardless of backend so the upload
 * flow (presign → direct PUT → finalize) is identical in dev and prod.
 */
export interface StorageDriver {
  /** Get a URL the browser can PUT raw bytes to, plus the opaque key. */
  presignPut(opts: {
    contentType: string;
    ext: string;
  }): Promise<{ uploadUrl: string; key: string; method: "PUT" | "POST" }>;

  /**
   * Take a raw uploaded object and produce display variants
   * (resize, EXIF rotate, transcode to WebP). Returns public URLs.
   * In production this is invoked by an S3 PUT event → Lambda; here we
   * call it synchronously from /api/posts to keep the demo runnable.
   */
  processRaw(rawKey: string): Promise<ProcessedImage>;
}

import { LocalDriver } from "./local";
import { S3Driver } from "./s3";

let _driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (_driver) return _driver;
  const which = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  _driver = which === "s3" ? new S3Driver() : new LocalDriver();
  return _driver;
}
