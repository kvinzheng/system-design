import crypto from "node:crypto";
import sharp from "sharp";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageDriver } from "./index";
import type { ProcessedImage } from "./types";

/**
 * Production driver. Browser PUTs raw bytes directly to S3 with a
 * time-limited presigned URL; the app server never touches the upload bytes
 * for the hot path. The processRaw step (resize/transcode) is invoked here
 * for simplicity, but in real systems it lives in a Lambda triggered by the
 * S3 ObjectCreated:Put event on the `raw/` prefix.
 */
export class S3Driver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private cdnBase: string;
  private region: string;

  constructor() {
    this.bucket = required("S3_BUCKET");
    this.region = process.env.AWS_REGION || "us-east-1";
    // e.g. https://d123.cloudfront.net  (omit trailing slash)
    this.cdnBase =
      process.env.CDN_BASE_URL?.replace(/\/$/, "") ||
      `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    this.client = new S3Client({ region: this.region });
  }

  async presignPut({ contentType, ext }: { contentType: string; ext: string }) {
    const key = `raw/${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    // 5-minute window — long enough for slow connections, short enough to
    // limit reuse if a URL leaks.
    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: 300 });
    return { uploadUrl, key, method: "PUT" as const };
  }

  async processRaw(rawKey: string): Promise<ProcessedImage> {
    if (!rawKey.startsWith("raw/")) throw new Error("invalid key");

    const obj = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: rawKey })
    );
    const buf = Buffer.from(await obj.Body!.transformToByteArray());

    const id = crypto.randomBytes(8).toString("hex");
    const base = sharp(buf, { failOn: "error" }).rotate();

    const full = await base
      .clone()
      .resize({ width: 1440, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    const thumb = await base
      .clone()
      .resize({ width: 320, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();

    const fullKey = `${id}.webp`;
    const thumbKey = `${id}_thumb.webp`;

    await Promise.all([
      this.putImmutable(fullKey, full.data, "image/webp"),
      this.putImmutable(thumbKey, thumb, "image/webp"),
    ]);

    // Best-effort cleanup of the raw upload (could also be a lifecycle rule).
    this.client
      .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: rawKey }))
      .catch(() => {});

    return {
      url: `${this.cdnBase}/${fullKey}`,
      thumb_url: `${this.cdnBase}/${thumbKey}`,
      width: full.info.width,
      height: full.info.height,
    };
  }

  private async putImmutable(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
