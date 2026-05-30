import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * Dev-only sink that stands in for an S3 presigned PUT. Receives raw bytes
 * from the browser and writes them under data/uploads/raw/. In prod the
 * browser PUTs straight to S3 and this route does not exist.
 */
export async function PUT(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || "";
  if (!key.startsWith("raw/") || key.includes("..")) {
    return new NextResponse("bad key", { status: 400 });
  }
  const dest = path.join(process.cwd(), "data", "uploads", key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > 15 * 1024 * 1024) {
    return new NextResponse("too large", { status: 413 });
  }
  await fs.writeFile(dest, buf);
  return new NextResponse(null, { status: 200 });
}
