import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs";

export const dynamic = "force-dynamic";

// Serves images from data/uploads. In prod, put these on S3 + CloudFront.
export async function GET(_req: NextRequest, ctx: { params: { name: string } }) {
  const name = ctx.params.name;
  if (!/^[\w.-]+$/.test(name)) return new Response("Bad name", { status: 400 });
  const file = path.join(process.cwd(), "data", "uploads", name);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const data = fs.readFileSync(file);
  const ext = path.extname(name).slice(1).toLowerCase();
  const type =
    ext === "webp" ? "image/webp" :
    ext === "png" ? "image/png" :
    ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
  return new Response(data, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
