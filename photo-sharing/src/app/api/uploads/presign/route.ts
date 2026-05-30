import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  const { contentType, filename } = await req.json();
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: "unsupported type" }, { status: 400 });
  }
  const ext = String(filename || "").split(".").pop()?.toLowerCase() || "bin";
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";

  const presigned = await storage().presignPut({ contentType, ext: safeExt });
  return NextResponse.json(presigned);
}
