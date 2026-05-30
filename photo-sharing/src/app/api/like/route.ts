import { NextRequest, NextResponse } from "next/server";
import { toggleLike } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { postId, user } = await req.json();
  if (!postId || !user) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const likes = toggleLike(Number(postId), String(user));
  return NextResponse.json({ likes });
}
