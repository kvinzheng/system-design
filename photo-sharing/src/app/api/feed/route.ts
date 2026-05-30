import { NextRequest, NextResponse } from "next/server";
import { listFeed } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const cursor = sp.get("cursor") ? Number(sp.get("cursor")) : undefined;
  const limit = sp.get("limit") ? Number(sp.get("limit")) : 10;
  return NextResponse.json(listFeed({ cursor, limit }));
}
