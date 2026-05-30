import { NextRequest, NextResponse } from "next/server";
import { createPost } from "@/lib/db";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Body = {
  author?: string;
  caption?: string;
  rawKeys?: string[];
};

/**
 * Called by the browser after all raw uploads succeed. Server-side it
 * triggers the image pipeline per key (in prod: enqueue, here: inline)
 * and persists the post.
 */
export async function POST(req: NextRequest) {
  const { author = "anon", caption = "", rawKeys = [] }: Body = await req.json();

  if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
    return NextResponse.json({ error: "no images" }, { status: 400 });
  }
  if (rawKeys.length > 10) {
    return NextResponse.json({ error: "too many" }, { status: 400 });
  }

  const drv = storage();
  const images = await Promise.all(rawKeys.map((k) => drv.processRaw(k)));

  const id = createPost({
    author: String(author).slice(0, 40),
    caption: String(caption).slice(0, 2000),
    images,
  });

  return NextResponse.json({ id });
}
